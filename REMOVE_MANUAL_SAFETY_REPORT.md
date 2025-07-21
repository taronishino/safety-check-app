# 🗑️ 手動安否報告機能完全削除リスト

## 削除対象ファイル

### 1. **APIエンドポイント削除**
- ❌ `/api/activity/send-report.js` - 完全削除
- ❌ `/api/activity/send-report-simple.js` - 完全削除  
- ❌ `/api/multi-parent/safety-report.js` - 完全削除

### 2. **設定画面から手動安否報告項目削除**
- 📝 `/backend/public/settings.html` - 手動安否報告設定の削除
- 📝 `/public/settings.html` - 同上

### 3. **親側UI削除**
- 📝 `/public/parent.html` - 手動安否報告ボタンとモーダル削除

### 4. **権限チェック簡素化**
- 📝 `/api/parent/check-features.js` - manual_reports チェック削除

### 5. **データベース更新**
- 📝 `supabase_schema.sql` - manual_safety_reports 設定削除（オプション）

## 削除後の機能

### ✅ 残る機能
- 🚨 緊急確認機能
- 📍 位置情報確認
- 💎 プレミアムプラン管理
- 👥 親子ペアリング

### ❌ 削除される機能
- 📡 手動安否報告
- ⚙️ 手動安否報告のON/OFF設定

## 簡素化されるメリット
- 🎯 シンプルなUI
- ⚡ 軽快な動作
- 🐛 バグの減少
- 🔧 保守性向上