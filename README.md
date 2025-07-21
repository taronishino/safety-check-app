# 🛡️ 安否チェックアプリ

家族の安全を確認するためのリアルタイム安否確認システム

## 🎯 現在の状況
- [x] 設計フェーズ
- [x] 開発フェーズ  
- [x] 完成
- [x] クラウドデプロイ準備完了

## ✨ 主要機能

### 🔐 認証・セキュリティ
- JWT認証システム
- 安全なペアリングコード機能
- プラン別アクセス制御

### 👨‍👩‍👧‍👦 ユーザー管理
- 親・子の役割別アプリ
- ニックネーム管理
- 親子関係の安全な登録・削除

### 💰 料金プランシステム
- 無料プラン（1名監視、基本機能）
- プレミアムプラン（無制限監視、全機能）
- 7日間無料体験

### 📱 安否確認機能
- リアルタイム安否状況表示
- 手動安否報告（プレミアム限定）
- 個別緊急確認通知（プレミアム限定）
- 位置情報確認（Google Maps連携、プレミアム限定）

## 🚀 起動方法

### 簡単起動（推奨）
```bash
./start_project.sh safety
```

### 手動起動
```bash
cd ~/projects/safety_check_app/backend
PORT=3002 node test-server.js
```

## 🌐 アクセス
- メインアプリ: http://localhost:3002
- 親用: http://localhost:3002/parent.html
- 子用: http://localhost:3002/child.html
- 設定: http://localhost:3002/settings.html

## 🔑 テストアカウント
- メール: test@example.com
- パスワード: testpass123

## 🚀 クラウドデプロイ
詳細は [DEPLOYMENT.md](./DEPLOYMENT.md) を参照

### 推奨プラットフォーム
1. **Render.com** (無料枠推奨)
2. **Railway.app** (使用量ベース)
3. **Heroku** (有料のみ)

### デプロイファイル準備済み
- ✅ `render.yaml` - Render.com用
- ✅ `railway.json` - Railway用  
- ✅ `Procfile` - Heroku用
- ✅ `.env.example` - 環境変数テンプレート

## 📝 残りのTODO
- [ ] 実際のクラウドデプロイ実行
- [ ] カスタムドメイン設定（オプション）
- [ ] 本番データベース移行（オプション）
- [ ] 監視・ログ設定（オプション）

## 🛠️ 技術スタック
- **Backend**: Node.js + Express
- **Database**: SQLite (test-server.js内メモリ)
- **Authentication**: JWT
- **Frontend**: Vanilla JavaScript + HTML/CSS
- **Maps**: Google Maps API
- **PWA**: Service Worker対応

## 📊 開発完了率: 100% ✅

## 🔗 関連リンク
- 開発者: Claude Code
- 作成日: 2025年7月20日
- 最終更新: 2025年7月20日