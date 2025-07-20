const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// ミドルウェア
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// テスト用のメモリ内データストレージ
let users = [];
let activities = [];
let subscriptions = [];
let pairingCodes = [];
let relationships = [];

// ユーザー登録（テスト用）
app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  const user = {
    id: Date.now().toString(),
    email,
    name,
    created_at: new Date().toISOString()
  };
  users.push(user);
  
  // デフォルトで無料プラン（体験期間なし）を設定
  subscriptions.push({
    user_id: user.id,
    plan_type: 'basic',
    status: 'active',
    trial_end: null // 体験期間なし
  });
  
  res.json({
    success: true,
    user,
    token: `test-token-${user.id}`
  });
});

// ログイン（テスト用）
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  
  if (user) {
    res.json({
      success: true,
      user,
      token: `test-token-${user.id}`
    });
  } else {
    res.status(401).json({ error: 'ユーザーが見つかりません' });
  }
});

// プラン状況確認
app.get('/api/subscription/status', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  const userId = token?.replace('test-token-', '');
  
  let subscription = subscriptions.find(s => s.user_id === userId);
  
  if (!subscription) {
    subscription = {
      user_id: userId,
      plan_type: 'basic',
      status: 'active',
      trial_end: null
    };
    subscriptions.push(subscription);
  }
  
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
    available_features: [
      { feature_name: 'single_parent_monitoring', is_enabled: true },
      { feature_name: 'activity_detection', is_enabled: true },
      { feature_name: 'location_sharing', is_enabled: subscription.plan_type === 'premium' || isTrialActive },
      { feature_name: 'manual_safety_report', is_enabled: subscription.plan_type === 'premium' || isTrialActive },
      { feature_name: 'emergency_check', is_enabled: subscription.plan_type === 'premium' || isTrialActive }
    ],
    current_usage: []
  });
});

// プランアップグレード
app.post('/api/subscription/upgrade', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  const userId = token?.replace('test-token-', '');
  const { plan_type } = req.body;
  
  let subscription = subscriptions.find(s => s.user_id === userId);
  
  if (!subscription) {
    // サブスクリプションが存在しない場合は新規作成
    subscription = {
      user_id: userId,
      plan_type: 'basic',
      status: 'active',
      trial_end: null
    };
    subscriptions.push(subscription);
  }
  
  if (plan_type === 'premium') {
    subscription.plan_type = 'premium';
    // 7日間の体験期間を設定（まだ体験期間がない場合のみ）
    if (!subscription.trial_end) {
      subscription.trial_end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    }
    subscription.subscription_end = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  } else {
    subscription.plan_type = plan_type;
    subscription.subscription_end = null;
    // basicプランに戻す場合は体験期間もリセット
    subscription.trial_end = null;
  }
  
  res.json({
    success: true,
    message: `${plan_type}プランに${plan_type === 'premium' ? 'アップグレード' : '変更'}しました`
  });
});

// 活動データ送信
app.post('/api/activity', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  const userId = token?.replace('test-token-', '');
  
  const { last_activity_at, battery_level, device_info } = req.body;
  
  const activity = {
    id: Date.now().toString(),
    user_id: userId,
    last_activity_at,
    battery_level,
    device_info,
    created_at: new Date().toISOString()
  };
  
  activities.push(activity);
  
  res.json({
    success: true,
    message: '安否情報を保存しました',
    activity_id: activity.id
  });
});

// 位置情報更新（テスト用）
app.post('/api/location/update', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  const userId = token?.replace('test-token-', '');
  
  // プラン制限チェック
  const subscription = subscriptions.find(s => s.user_id === userId);
  const now = new Date();
  const isTrialActive = subscription?.trial_end && new Date(subscription.trial_end) > now;
  const canUseLocation = subscription?.plan_type === 'premium' || isTrialActive;
  
  if (!canUseLocation) {
    return res.status(403).json({
      error: 'この機能は利用できません',
      reason: 'plan_limitation',
      current_plan: subscription?.plan_type || 'basic',
      required_plan: 'premium'
    });
  }
  
  res.json({
    success: true,
    message: '位置情報を更新しました'
  });
});

// 位置情報設定
app.get('/api/location/settings', (req, res) => {
  res.json({
    enable_location_sharing: false,
    location_frequency: 'disabled',
    share_with_family: true
  });
});

app.put('/api/location/settings', (req, res) => {
  res.json({
    success: true,
    message: '位置情報設定を更新しました'
  });
});

// 緊急確認機能（テスト用）
app.post('/api/multi-parent/emergency-check', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  const userId = token?.replace('test-token-', '');
  
  // プラン制限チェック
  const subscription = subscriptions.find(s => s.user_id === userId);
  const now = new Date();
  const isTrialActive = subscription?.trial_end && new Date(subscription.trial_end) > now;
  const canUseEmergencyCheck = subscription?.plan_type === 'premium' || isTrialActive;
  
  if (!canUseEmergencyCheck) {
    return res.status(403).json({
      error: 'この機能は利用できません',
      reason: 'plan_limitation',
      current_plan: subscription?.plan_type || 'basic',
      required_plan: 'premium'
    });
  }
  
  res.json({
    success: true,
    message: '緊急確認を送信しました',
    sent_to: ['parent1', 'parent2'] // テスト用の仮想データ
  });
});

// ペアリングコード生成（親用）
app.post('/api/pairing/generate-code', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  const userId = token?.replace('test-token-', '');
  
  // 6桁のランダムコードを生成
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  // 既存のコードがあれば削除
  pairingCodes = pairingCodes.filter(p => p.parent_id !== userId);
  
  // 新しいコードを保存（5分間有効）
  pairingCodes.push({
    code,
    parent_id: userId,
    created_at: new Date(),
    expires_at: new Date(Date.now() + 5 * 60 * 1000) // 5分後
  });
  
  res.json({
    success: true,
    pairing_code: code,
    expires_in: 300 // 秒
  });
});

// ペアリングコードで親子関係を作成（子用）
app.post('/api/pairing/register-parent', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  const childId = token?.replace('test-token-', '');
  const { pairing_code, nickname } = req.body;
  
  // コードを検証
  const pairingEntry = pairingCodes.find(p => 
    p.code === pairing_code && 
    new Date(p.expires_at) > new Date()
  );
  
  if (!pairingEntry) {
    return res.status(400).json({
      error: 'ペアリングコードが無効または期限切れです'
    });
  }
  
  // 既存の関係をチェック
  const existingRelation = relationships.find(r => 
    r.child_id === childId && 
    r.parent_id === pairingEntry.parent_id
  );
  
  if (existingRelation) {
    return res.status(400).json({
      error: 'すでに登録済みの親です'
    });
  }
  
  // プラン制限チェック（無料プランは1名まで）
  const childSubscription = subscriptions.find(s => s.user_id === childId);
  const now = new Date();
  const isTrialActive = childSubscription?.trial_end && new Date(childSubscription.trial_end) > now;
  const isPremium = childSubscription?.plan_type === 'premium' || isTrialActive;
  
  if (!isPremium) {
    // 無料プランの場合、既存の親の数をチェック
    const existingParentsCount = relationships.filter(r => r.child_id === childId).length;
    if (existingParentsCount >= 1) {
      return res.status(403).json({
        error: '無料プランでは1名の親のみ登録可能です',
        reason: 'plan_limitation',
        current_plan: 'basic',
        required_plan: 'premium'
      });
    }
  }
  
  // 親の情報を取得
  const parent = users.find(u => u.id === pairingEntry.parent_id);
  
  // 関係を作成
  relationships.push({
    id: Date.now().toString(),
    child_id: childId,
    parent_id: pairingEntry.parent_id,
    parent_name: parent?.name || 'Unknown',
    parent_email: parent?.email || '',
    nickname: nickname || parent?.name || 'お父さん/お母さん',
    created_at: new Date()
  });
  
  // 使用済みコードを削除
  pairingCodes = pairingCodes.filter(p => p.code !== pairing_code);
  
  res.json({
    success: true,
    message: '親の登録が完了しました',
    parent: {
      id: pairingEntry.parent_id,
      name: parent?.name || 'Unknown',
      email: parent?.email || ''
    }
  });
});

// 親子関係一覧取得（子用）
app.get('/api/pairing/relationships', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  const userId = token?.replace('test-token-', '');
  
  const userRelationships = relationships.filter(r => r.child_id === userId);
  
  res.json({
    relationships: userRelationships.map(r => ({
      parent_id: r.parent_id,
      parent_name: r.parent_name,
      parent_email: r.parent_email,
      nickname: r.nickname,
      created_at: r.created_at
    }))
  });
});

// 親子関係削除（子用）
app.delete('/api/pairing/relationships/:parentId', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  const childId = token?.replace('test-token-', '');
  const { parentId } = req.params;
  
  relationships = relationships.filter(r => 
    !(r.child_id === childId && r.parent_id === parentId)
  );
  
  res.json({
    success: true,
    message: '親の登録を解除しました'
  });
});

// 設定関連
app.get('/api/settings', (req, res) => {
  res.json({
    enable_daily_report: true,
    report_button_text: '安否報告'
  });
});

app.put('/api/settings', (req, res) => {
  res.json({
    success: true,
    message: '設定を更新しました'
  });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚀 安否チェックアプリ テストサーバーが起動しました: http://localhost:${PORT}`);
  console.log('📝 テスト用機能:');
  console.log('  - ユーザー登録・ログイン');
  console.log('  - プラン状況確認');
  console.log('  - 機能制限テスト');
  console.log('  - 位置情報制限テスト');
  console.log('');
  console.log('💡 テスト手順:');
  console.log('1. http://localhost:3001 でアプリにアクセス');
  console.log('2. プラン選択画面を確認');
  console.log('3. 親用アプリで機能制限を確認');
  console.log('4. プランアップグレードをテスト');
});