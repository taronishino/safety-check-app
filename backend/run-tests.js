const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3002';

async function runTests() {
  console.log('🧪 料金プランと機能制限のテストを開始します...\n');

  try {
    // テスト1: ユーザー登録とプラン確認
    console.log('📝 テスト1: ユーザー登録とデフォルトプラン確認');
    
    const registerResponse = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test-parent@example.com',
        password: 'testpass123',
        name: 'テスト親ユーザー'
      })
    });

    const registerData = await registerResponse.json();
    if (registerResponse.ok) {
      console.log('✅ ユーザー登録成功:', registerData.user.name);
      console.log('🔑 トークン:', registerData.token);
    } else {
      console.log('❌ ユーザー登録失敗:', registerData.error);
      return;
    }

    const token = registerData.token;

    // テスト2: プラン状況確認
    console.log('\n📋 テスト2: プラン状況確認');
    
    const statusResponse = await fetch(`${API_BASE}/api/subscription/status`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const statusData = await statusResponse.json();
    if (statusResponse.ok) {
      const sub = statusData.subscription;
      console.log('✅ プラン状況取得成功');
      console.log(`📊 現在のプラン: ${sub.plan_type}`);
      console.log(`🎯 体験期間: ${sub.is_trial_active ? `有効 (${sub.trial_days_left}日残り)` : '無効'}`);
      console.log('🔧 利用可能機能:');
      statusData.available_features.forEach(feature => {
        console.log(`   - ${feature.feature_name}: ${feature.is_enabled ? '✅' : '❌'}`);
      });
    } else {
      console.log('❌ プラン状況取得失敗:', statusData.error);
    }

    // テスト3: 無料プランでの活動データ送信（成功するはず）
    console.log('\n📡 テスト3: 無料プランでの活動データ送信');
    
    const activityResponse = await fetch(`${API_BASE}/api/activity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        last_activity_at: new Date().toISOString(),
        battery_level: 85,
        device_info: 'Test Device'
      })
    });

    const activityData = await activityResponse.json();
    if (activityResponse.ok) {
      console.log('✅ 活動データ送信成功 (基本機能)');
    } else {
      console.log('❌ 活動データ送信失敗:', activityData.error);
    }

    // テスト4: 無料プランでの位置情報更新（失敗するはず）
    console.log('\n📍 テスト4: 無料プランでの位置情報更新（制限テスト）');
    
    const locationResponse = await fetch(`${API_BASE}/api/location/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        latitude: 35.6762,
        longitude: 139.6503,
        accuracy: 10
      })
    });

    const locationData = await locationResponse.json();
    if (locationResponse.status === 403) {
      console.log('✅ 位置情報制限が正常に動作');
      console.log(`   理由: ${locationData.reason}`);
      console.log(`   現在のプラン: ${locationData.current_plan}`);
      console.log(`   必要なプラン: ${locationData.required_plan}`);
    } else {
      console.log('❌ 位置情報制限が動作していません');
    }

    // テスト5: プランアップグレード
    console.log('\n⬆️ テスト5: プレミアムプランへのアップグレード');
    
    const upgradeResponse = await fetch(`${API_BASE}/api/subscription/upgrade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        plan_type: 'premium'
      })
    });

    const upgradeData = await upgradeResponse.json();
    if (upgradeResponse.ok) {
      console.log('✅ プランアップグレード成功');
    } else {
      console.log('❌ プランアップグレード失敗:', upgradeData.error);
    }

    // テスト6: アップグレード後の位置情報更新（成功するはず）
    console.log('\n📍 テスト6: プレミアムプランでの位置情報更新');
    
    const premiumLocationResponse = await fetch(`${API_BASE}/api/location/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        latitude: 35.6762,
        longitude: 139.6503,
        accuracy: 10
      })
    });

    const premiumLocationData = await premiumLocationResponse.json();
    if (premiumLocationResponse.ok) {
      console.log('✅ プレミアムプランでの位置情報更新成功');
    } else {
      console.log('❌ プレミアムプランでの位置情報更新失敗:', premiumLocationData.error);
    }

    // テスト7: アップグレード後のプラン状況確認
    console.log('\n📋 テスト7: アップグレード後のプラン状況確認');
    
    const finalStatusResponse = await fetch(`${API_BASE}/api/subscription/status`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const finalStatusData = await finalStatusResponse.json();
    if (finalStatusResponse.ok) {
      const sub = finalStatusData.subscription;
      console.log('✅ 最終プラン状況');
      console.log(`📊 現在のプラン: ${sub.plan_type}`);
      console.log('🔧 利用可能機能:');
      finalStatusData.available_features.forEach(feature => {
        console.log(`   - ${feature.feature_name}: ${feature.is_enabled ? '✅' : '❌'}`);
      });
    }

    console.log('\n🎉 すべてのテストが完了しました！');
    console.log('\n💡 次のステップ:');
    console.log('1. ブラウザで http://localhost:3001 にアクセスして手動テスト');
    console.log('2. プラン選択画面の動作確認');
    console.log('3. 親用アプリでの機能制限確認');
    console.log('4. アップグレード後の機能解放確認');

  } catch (error) {
    console.log('❌ テスト実行エラー:', error.message);
  }
}

// 5秒待ってからテスト開始（サーバー起動待ち）
setTimeout(() => {
  runTests();
}, 5000);