# 🚀 安否チェックアプリ デプロイメントガイド

## クラウドプラットフォーム選択肢

### 1. 🟢 Render.com (推奨)
**無料枠**: 750時間/月、自動スリープあり

#### デプロイ手順
1. [Render.com](https://render.com) でアカウント作成
2. GitHubリポジトリを接続
3. "New Web Service" を選択
4. `render.yaml` を使用してデプロイ
5. 環境変数を設定:
   - `JWT_SECRET`: ランダムな32文字以上の文字列
   - `GOOGLE_MAPS_API_KEY`: Google Maps APIキー（オプション）

### 2. 🚂 Railway.app
**無料枠**: $5/月クレジット、使用量ベース

#### デプロイ手順
1. [Railway.app](https://railway.app) でアカウント作成
2. "Deploy from GitHub repo" を選択
3. リポジトリを選択
4. `railway.json` 設定が自動適用
5. 環境変数を設定

### 3. 🟣 Heroku
**無料枠**: 廃止、最低$7/月

#### デプロイ手順
1. [Heroku](https://heroku.com) でアカウント作成
2. Heroku CLI をインストール
3. `heroku create your-app-name`
4. `git push heroku main`
5. `Procfile` が自動認識される

## 🔧 必要な環境変数

```bash
NODE_ENV=production
PORT=10000
JWT_SECRET=your-secure-jwt-secret-here
GOOGLE_MAPS_API_KEY=your-google-maps-api-key  # オプション
```

## 🗄️ データベース設定

現在はメモリ内SQLiteを使用（サーバー再起動でデータ消失）

### 本番用データベース推奨
- **Railway PostgreSQL**: Railway内で簡単追加
- **Supabase**: 無料PostgreSQL + 追加機能
- **PlanetScale**: MySQL互換、無料枠あり

## 🔒 セキュリティ設定

### SSL/HTTPS
- Render.com: 自動提供
- Railway: 自動提供  
- Heroku: 自動提供

### カスタムドメイン
1. DNS設定でCNAMEレコード追加
2. プラットフォームでカスタムドメイン追加
3. SSL証明書の自動発行を確認

## 📱 PWA対応

アプリは既にPWA対応済み:
- `manifest.json`: アプリマニフェスト
- `service-worker.js`: オフライン対応
- アイコン: 各サイズ対応済み

## 🧪 デプロイ前テスト

```bash
# ローカルテスト
cd backend
PORT=3002 node test-server.js

# 本番環境変数でテスト
NODE_ENV=production PORT=10000 node test-server.js
```

## 📈 監視・ログ

### 推奨ツール
- **Uptime Monitoring**: UptimeRobot (無料)
- **Error Tracking**: Sentry (無料枠あり)
- **Analytics**: Plausible (プライバシー重視)

## 🔄 継続的デプロイ

GitHubにプッシュすると自動デプロイ:
1. `main` ブランチにマージ
2. プラットフォームが自動検知
3. ビルド・デプロイ実行
4. ヘルスチェック確認

## ⚡ パフォーマンス最適化

- 静的ファイルのCDN配信
- データベースインデックス最適化
- 画像最適化・圧縮
- ブラウザキャッシュ設定

---

📅 作成日: 2025年7月21日  
🔧 作成者: Claude Code