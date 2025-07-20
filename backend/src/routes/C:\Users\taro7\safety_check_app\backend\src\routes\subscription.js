const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const db = require('../database/db');

// ユーザーのプラン状況を取得
router.get('/status', async (req, res) => {
  try {
    const userId = req.user.id;

    // ユーザーの契約情報を取得
    let subscription = db.queryOne(
      'SELECT * FROM user_subscriptions WHERE user_id = ?',
      [userId]
    );

    // 契約情報がない場合はデフォルト（basic）を作成
    if (!subscription) {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 7); // 7日間の体験期間

      db.run(
        `INSERT INTO user_subscriptions 
         (user_id, plan_type, trial_end) 
         VALUES (?, 'basic', ?)`,
        [userId, trialEnd.toISOString()]
      );

      subscription = {
        user_id: userId,
        plan_type: 'basic',
        status: 'active',
        trial_end: trialEnd.toISOString(),
        subscription_start: new Date().toISOString()
      };
    }

    // 利用可能な機能を取得
    const availableFeatures = db.query(
      'SELECT feature_name, is_enabled, monthly_limit FROM plan_features WHERE plan_type = ?',
      [subscription.plan_type]
    );

    // 今月の使用量を取得
    const currentUsage = db.query(
      `SELECT feature_name, usage_count, monthly_limit 
       FROM feature_usage 
       WHERE user_id = ? AND reset_date >= date('now', 'start of month')`,
      [userId]
    );

    // 体験期間の確認
    const now = new Date();
    const isTrialActive = subscription.trial_end && new Date(subscription.trial_end) > now;
    const trialDaysLeft = isTrialActive ? 
      Math.ceil((new Date(subscription.trial_end) - now) / (1000 * 60 * 60 * 24)) : 0;

    res.json({
      subscription: {
        ...subscription,
        is_trial_active: isTrialActive,
        trial_days_left: trialDaysLeft
      },
      available_features: availableFeatures,
      current_usage: currentUsage
    });
  } catch (error) {
    logger.error('Error fetching subscription status:', error);
    res.status(500).json({ error: 'プラン状況の取得に失敗しました' });
  }
});

// 機能の利用可能性をチェック
router.get('/check-feature/:featureName', async (req, res) => {
  try {
    const userId = req.user.id;
    const featureName = req.params.featureName;

    const result = await checkFeatureAccess(userId, featureName);
    res.json(result);
  } catch (error) {
    logger.error('Error checking feature access:', error);
    res.status(500).json({ error: '機能チェックに失敗しました' });
  }
});

// 機能使用量を記録
router.post('/use-feature', async (req, res) => {
  try {
    const userId = req.user.id;
    const { feature_name } = req.body;

    if (!feature_name) {
      return res.status(400).json({ error: '機能名が必要です' });
    }

    // 機能アクセスをチェック
    const accessCheck = await checkFeatureAccess(userId, feature_name);
    if (!accessCheck.can_use) {
      return res.status(403).json({ 
        error: 'この機能は利用できません',
        reason: accessCheck.reason
      });
    }

    // 使用量を記録
    await recordFeatureUsage(userId, feature_name);

    res.json({ 
      success: true,
      message: '機能使用を記録しました'
    });
  } catch (error) {
    logger.error('Error recording feature usage:', error);
    res.status(500).json({ error: '機能使用記録に失敗しました' });
  }
});

// プランのアップグレード（デモ用）
router.post('/upgrade', async (req, res) => {
  try {
    const userId = req.user.id;
    const { plan_type } = req.body;

    if (!['basic', 'premium'].includes(plan_type)) {
      return res.status(400).json({ error: '無効なプランタイプです' });
    }

    // 契約情報を更新
    const subscriptionEnd = plan_type === 'premium' ? 
      new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString() : null;

    const existing = db.queryOne(
      'SELECT user_id FROM user_subscriptions WHERE user_id = ?',
      [userId]
    );

    if (existing) {
      db.run(
        `UPDATE user_subscriptions 
         SET plan_type = ?, 
             subscription_end = ?,
             updated_at = datetime('now')
         WHERE user_id = ?`,
        [plan_type, subscriptionEnd, userId]
      );
    } else {
      db.run(
        `INSERT INTO user_subscriptions 
         (user_id, plan_type, subscription_end)
         VALUES (?, ?, ?)`,
        [userId, plan_type, subscriptionEnd]
      );
    }

    logger.info(`User ${userId} upgraded to ${plan_type} plan`);

    res.json({ 
      success: true,
      message: `${plan_type}プランにアップグレードしました`
    });
  } catch (error) {
    logger.error('Error upgrading subscription:', error);
    res.status(500).json({ error: 'プランのアップグレードに失敗しました' });
  }
});

// 機能アクセスチェック関数
async function checkFeatureAccess(userId, featureName) {
  try {
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
      return {
        can_use: false,
        reason: isTrialActive ? 'trial_expired' : 'plan_limitation',
        current_plan: subscription.plan_type,
        required_plan: 'premium'
      };
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
        return {
          can_use: false,
          reason: 'monthly_limit_exceeded',
          current_usage: currentUsage,
          monthly_limit: planFeature.monthly_limit
        };
      }
    }

    return {
      can_use: true,
      current_plan: subscription.plan_type,
      is_trial: isTrialActive
    };
  } catch (error) {
    logger.error('Error in checkFeatureAccess:', error);
    return {
      can_use: false,
      reason: 'system_error'
    };
  }
}

// 機能使用量記録関数
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

module.exports = router;