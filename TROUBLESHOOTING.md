# 🔧 トラブルシューティングガイド

## 500エラー: 設定保存失敗

### 症状
- 設定画面で「設定の保存に失敗しました: Failed to save settings」
- コンソールに `POST https://safety-check-app.vercel.app/api/settings/save 500` エラー

### 原因と解決方法

## 1. 環境変数の確認 ⚠️ 最も可能性が高い

**Vercelダッシュボードで確認:**
1. [Vercel Dashboard](https://vercel.com/dashboard) にログイン
2. `safety-check-app` プロジェクトを選択
3. Settings → Environment Variables

**必要な環境変数:**
```
SUPABASE_URL         → 設定されているか？
SUPABASE_SERVICE_KEY → 設定されているか？
JWT_SECRET          → 設定されているか？
```

**確認ポイント:**
- ❌ 変数名のスペルミス（SUPABASE_URL であって SUPABASE_URI ではない）
- ❌ 値の前後の余計なスペース
- ❌ anon keyではなく service_role key を使用しているか
- ✅ Production環境にチェックが入っているか

## 2. user_settingsテーブルの確認

**Supabaseで確認:**
1. [Supabase Dashboard](https://app.supabase.com) にログイン
2. Table Editor で `user_settings` テーブルが存在するか確認

**テーブルが無い場合:**
1. SQL Editor を開く
2. `database/add_user_settings_table.sql` の内容を実行
3. 実行成功を確認

## 3. Vercel Functionsログの確認

**エラー詳細を見る:**
1. Vercel Dashboard → Functions タブ
2. `/api/settings/save` を選択
3. 最新のエラーログを確認

**よくあるエラーメッセージ:**
- `relation "user_settings" does not exist` → テーブル未作成
- `invalid input syntax for type integer` → データ型の問題
- `password authentication failed` → 環境変数の問題

## 4. 簡易テスト手順

### ステップ1: 認証確認
```bash
curl -X POST https://safety-check-app.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "test123", "name": "Test"}'
```
→ 成功すればトークンが返る

### ステップ2: 設定保存テスト
```bash
# 上で取得したトークンを使用
curl -X POST https://safety-check-app.vercel.app/api/settings/save \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"settings": {"location": true, "manualReport": true, "emergency": true}}'
```

## 5. 一時的な回避策

ローカルストレージのみで動作させる場合:
1. 設定はローカルに保存される
2. ブラウザを変えると設定が消える
3. 本番環境の修正が完了するまでの暫定対応

## 6. 修正後の確認

環境変数設定後:
1. Vercelが自動的に再デプロイされる
2. 5-10分待つ
3. ブラウザのキャッシュをクリア
4. 再度設定保存をテスト

---

それでも解決しない場合は、Vercel Functionsのログを共有してください。