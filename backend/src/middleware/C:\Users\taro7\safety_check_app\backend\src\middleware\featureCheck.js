const db = require('../database/db');
const logger = require('../utils/logger');

// 機能アクセスチェックミドルウェア
function checkFeatureAccess(featureName) {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      
      // ユーザーのプラン情報を取得
      const subscription = db.queryOne(
        'SELECT * FROM user_subscriptions WHERE user_id = ?',
        [userId]
      ) || { plan_type: 'basic' };

      // 体験期間チェック
      const now = new Date();
      const isTrialActive = subscription.trial_end && new Date(subscription.trial_end) > now;
      const effectivePlan = isTrialActive ? 'premium' : subscription.plan_type;

      // プランで利用可能な機能をチェック
      const planFeature = db.queryOne(
        'SELECT * FROM plan_features WHERE plan_type = ? AND feature_name = ?',
        [effectivePlan, featureName]
      );

      if (!planFeature || !planFeature.is_enabled) {
        return res.status(403).json({
          error: 'この機能は利用できません',
          reason: isTrialActive ? 'trial_expired' : 'plan_limitation',
          current_plan: subscription.plan_type,
          required_plan: 'premium',
          feature_name: featureName
        });
      }

      // 使用量制限チェック（月間制限がある場合）
      if (planFeature.monthly_limit > 0) {
        const usage = db.queryOne(
          `SELECT usage_count FROM feature_usage 
           WHERE user_id = ? AND feature_name = ? 
           AND reset_date >= date('now', 'start of month')`,
          [userId, featureName]
        );

        const currentUsage = usage ? usage.usage_count : 0;
        if (currentUsage >= planFeature.monthly_limit) {
          return res.status(403).json({
            error: '月間利用制限に達しました',
            reason: 'monthly_limit_exceeded',
            current_usage: currentUsage,
            monthly_limit: planFeature.monthly_limit,
            feature_name: featureName
          });
        }
      }

      // プラン情報をリクエストに追加
      req.subscription = {
        ...subscription,
        is_trial_active: isTrialActive,
        effective_plan: effectivePlan
      };

      next();
    } catch (error) {
      logger.error('Error in feature check middleware:', error);
      res.status(500).json({ error: 'システムエラーが発生しました' });
    }
  };
}

// 複数親監視のチェック
function checkMultipleParentAccess(req, res, next) {
  try {
    const userId = req.user.id;
    
    // 関係性の数をカウント
    const relationshipCount = db.queryOne(
      'SELECT COUNT(*) as count FROM relationships WHERE child_id = ? AND status = "active"',
      [userId]
    );

    const count = relationshipCount ? relationshipCount.count : 0;
    
    // 無料プランで複数親の場合は制限
    if (count > 1 && req.subscription && req.subscription.effective_plan === 'basic') {
      return res.status(403).json({
        error: '無料プランでは1人の親のみ監視できます',
        reason: 'multiple_parent_limitation',
        current_plan: req.subscription.plan_type,
        required_plan: 'premium',
        current_count: count,
        max_allowed: 1
      });
    }

    next();
  } catch (error) {
    logger.error('Error in multiple parent check:', error);
    res.status(500).json({ error: 'システムエラーが発生しました' });
  }
}

// 機能使用量を記録
async function recordFeatureUsage(userId, featureName) {
  try {
    // 今月の使用量レコードを取得または作成
    const existing = db.queryOne(
      `SELECT * FROM feature_usage 
       WHERE user_id = ? AND feature_name = ? 
       AND reset_date >= date('now', 'start of month')`,
      [userId, featureName]
    );

    if (existing) {
      // 使用量を増加
      db.run(
        `UPDATE feature_usage 
         SET usage_count = usage_count + 1, 
             last_used = datetime('now')
         WHERE id = ?`,
        [existing.id]
      );
    } else {
      // 新規レコード作成
      db.run(
        `INSERT INTO feature_usage 
         (user_id, feature_name, usage_count, reset_date)
         VALUES (?, ?, 1, date('now', 'start of month'))`,
        [userId, featureName]
      );
    }
  } catch (error) {
    logger.error('Error recording feature usage:', error);
    throw error;
  }
}

module.exports = {
  checkFeatureAccess,
  checkMultipleParentAccess,
  recordFeatureUsage
};