# 安否チェックアプリ プロジェクト状況

## 📅 最終更新日: 2025年1月23日

## 🎯 プロジェクト概要

高齢の親御さんの安否を確認するためのWebアプリケーション。親子でペアリングし、親のスマホ操作状況をリアルタイムで監視できる。

## ✅ 実装済み機能

### 1. 親子アプリのペアリング機能
- ✅ 6桁のペアリングコードによる安全な連携
- ✅ 複数の親の登録（プレミアム版は無制限、無料版は1名まで）
- ✅ ニックネーム設定機能

### 2. リアルタイム安否確認
- ✅ 最終操作時間の自動記録（マウス、キーボード、タッチ操作を検知）
- ✅ バッテリー残量の表示
- ✅ 4段階の色分け表示
  - 🟢 緑: 0-12時間（安全）
  - 🟡 黄: 12-24時間（注意）
  - 🟠 橙: 24-36時間（警戒）
  - 🔴 赤: 36時間以上（危険）

### 3. 緊急確認機能
- ✅ 子から親への緊急確認送信
- ✅ 複数の親への同時送信対応
- ✅ 親からの応答表示（複数件対応）
- ✅ 既読管理機能

### 4. 位置情報機能（親アプリ）
- ✅ GPS位置情報の自動取得
- ✅ 逆ジオコーディングによる住所表示
- ✅ 位置情報履歴の保存

### 5. PWA（Progressive Web App）対応
- ✅ スマホのホーム画面にアプリとしてインストール可能
- ✅ Service Workerによるオフライン対応
- ✅ プッシュ通知の基盤（未実装）

## 🏗️ 技術スタック

### フロントエンド
- HTML5 + CSS3 + Vanilla JavaScript
- PWA (Service Worker)
- Geolocation API
- Battery Status API（対応ブラウザのみ）

### バックエンド
- Vercel Serverless Functions
- Node.js
- JWT認証

### データベース
- Supabase (PostgreSQL)

### デプロイ
- Vercel（自動デプロイ設定済み）
- GitHub連携

## 📊 データベース構造

### users テーブル
```sql
- id: SERIAL PRIMARY KEY
- email: VARCHAR(255) UNIQUE NOT NULL
- password_hash: VARCHAR(255) NOT NULL
- name: VARCHAR(100) NOT NULL
- battery_level: INTEGER
- last_activity: TIMESTAMP
- device_info: VARCHAR(100)
- location_lat: DECIMAL(10, 8)
- location_lng: DECIMAL(11, 8)
- location_address: TEXT
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### relationships テーブル
```sql
- id: SERIAL PRIMARY KEY
- parent_id: INTEGER REFERENCES users(id)
- child_id: INTEGER REFERENCES users(id)
- nickname: VARCHAR(50)
- created_at: TIMESTAMP
```

### activities テーブル
```sql
- id: SERIAL PRIMARY KEY
- user_id: INTEGER REFERENCES users(id)
- type: VARCHAR(20)
- message: TEXT
- location_lat: DECIMAL(10, 8)
- location_lng: DECIMAL(11, 8)
- location_address: TEXT
- device_info: VARCHAR(100)
- metadata: JSONB
- created_at: TIMESTAMP
- last_activity_at: TIMESTAMP
```

### emergency_requests テーブル
```sql
- id: SERIAL PRIMARY KEY
- requester_id: INTEGER REFERENCES users(id)
- parent_id: INTEGER REFERENCES users(id)
- status: VARCHAR(20)
- message: TEXT
- parent_response: VARCHAR(20)
- response_message: TEXT
- created_at: TIMESTAMP
- responded_at: TIMESTAMP
- expires_at: TIMESTAMP
- read_at: TIMESTAMP
```

### subscriptions テーブル
```sql
- id: SERIAL PRIMARY KEY
- user_id: INTEGER REFERENCES users(id)
- plan_type: VARCHAR(20)
- status: VARCHAR(20)
- trial_end: TIMESTAMP
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### pairing_codes テーブル
```sql
- id: SERIAL PRIMARY KEY
- code: VARCHAR(10) NOT NULL
- parent_id: INTEGER REFERENCES users(id)
- expires_at: TIMESTAMP NOT NULL
- used: BOOLEAN DEFAULT FALSE
- created_at: TIMESTAMP
```

## 🔧 環境変数（Vercel）

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...
JWT_SECRET=your-secret-key-minimum-32-characters
GOOGLE_MAPS_API_KEY=AIza... (オプション)
```

## 📱 アプリURL

- **本番環境**: https://safety-check-app.vercel.app
- **親アプリ**: https://safety-check-app.vercel.app/parent.html
- **子アプリ**: https://safety-check-app.vercel.app/child.html

## 🐛 解決済みの主な問題

1. **認証トークンの保存キー不一致**
   - 問題: `childAuthToken`と`auth_token`の混在
   - 解決: 両方のキーをサポートするように修正

2. **データベーステーブル名の不一致**
   - 問題: `emergency_checks` vs `emergency_requests`
   - 解決: 実際のテーブル名（`emergency_requests`）を使用

3. **SupabaseのJOINクエリエラー**
   - 問題: 存在しないカラムへの参照
   - 解決: シンプルなクエリに分割して実行

4. **Service WorkerのPOSTキャッシュエラー**
   - 問題: POSTリクエストをキャッシュしようとしてエラー
   - 解決: GETリクエストのみキャッシュするように修正

5. **バッテリー情報の表示**
   - 問題: `battery_level`カラムが存在しない
   - 解決: `users`テーブルにカラムを追加

## 🚀 今後の拡張案

1. **プッシュ通知**
   - 緊急確認依頼の即時通知
   - 長時間操作がない場合の警告通知

2. **位置情報共有の強化**
   - 子アプリでの位置情報表示
   - 移動履歴の可視化

3. **定期レポート機能**
   - 日次/週次の活動サマリー
   - メール通知

4. **家族グループ機能**
   - 複数の子供での共同見守り
   - 家族間メッセージング

5. **健康管理機能**
   - 服薬リマインダー
   - 健康チェックリスト

## 📝 メモ

- プレミアムプランの決済機能は未実装（現在は手動切り替え）
- iOS対応は基本的に問題ないが、Battery APIは非対応
- 位置情報は親の明示的な許可が必要

## 🔗 関連ドキュメント

- [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md) - 本番環境セットアップ手順
- [QUICK-TEST-GUIDE.md](./QUICK-TEST-GUIDE.md) - クイックテストガイド
- [VERCEL_ENV_CHECKLIST.md](./VERCEL_ENV_CHECKLIST.md) - 環境変数チェックリスト

---

開発者: Claude (Anthropic) with Human collaboration