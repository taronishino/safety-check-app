# 🚀 本番環境セットアップ手順

## 1. Supabaseデータベース更新

### 1.1 Supabaseダッシュボードにログイン
1. [Supabase](https://app.supabase.com) にアクセス
2. プロジェクトを選択
3. SQL Editorを開く

### 1.2 user_settingsテーブル作成
1. `database/add_user_settings_table.sql` の内容をコピー
2. SQL Editorに貼り付けて実行
3. 成功メッセージを確認

## 2. Vercel環境変数設定

### 2.1 必要な環境変数
Vercelダッシュボード → Settings → Environment Variables で以下を設定：

```bash
# Supabase設定（Supabaseダッシュボードから取得）
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...（service_roleキー）

# JWT認証用（安全なランダム文字列を生成）
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters

# Google Maps API（オプション - 位置情報機能用）
GOOGLE_MAPS_API_KEY=AIza...（Google Cloud Consoleから取得）
```

### 2.2 環境変数の取得方法

#### Supabase情報
1. Supabaseダッシュボード → Settings → API
2. **Project URL**: `SUPABASE_URL`として使用
3. **service_role key**: `SUPABASE_SERVICE_KEY`として使用（秘密！）

#### JWT_SECRET生成
```bash
# ターミナルで実行
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 3. Vercelデプロイ

### 3.1 自動デプロイ
1. GitHubにpush済みの場合、Vercelが自動的に再デプロイ
2. デプロイ状況をVercelダッシュボードで確認

### 3.2 手動デプロイ（必要な場合）
```bash
# Vercel CLIを使用
vercel --prod
```

## 4. 動作確認チェックリスト

### 4.1 基本機能
- [ ] トップページアクセス: https://safety-check-app.vercel.app
- [ ] 親アプリ: /parent.html
- [ ] 子アプリ: /child.html
- [ ] 設定画面: /settings.html

### 4.2 認証機能
- [ ] 新規登録（親・子）
- [ ] ログイン（親・子）
- [ ] ログアウト

### 4.3 設定保存機能
- [ ] 子アプリでプレミアムプランに登録
- [ ] 設定画面で各機能のON/OFF
- [ ] 設定保存が正常に完了
- [ ] 設定が永続化される

### 4.4 プレミアム機能
- [ ] 手動安否報告の送信
- [ ] 位置情報の確認
- [ ] 緊急確認通知

## 5. トラブルシューティング

### 設定保存で500エラー
1. Supabaseでuser_settingsテーブルが作成されているか確認
2. Vercel環境変数が正しく設定されているか確認
3. Vercelのログで詳細エラーを確認

### 認証エラー
1. JWT_SECRETが設定されているか確認
2. SUPABASE_SERVICE_KEYが正しいか確認

### データベース接続エラー
1. SUPABASE_URLが正しいか確認
2. Supabaseのネットワーク設定を確認

## 6. セキュリティ確認

- [ ] 環境変数が本番環境のみに設定されている
- [ ] service_roleキーが公開されていない
- [ ] HTTPSで通信されている
- [ ] CORSが適切に設定されている

---

📅 作成日: 2025年7月21日
🔧 最終更新: 2025年7月21日