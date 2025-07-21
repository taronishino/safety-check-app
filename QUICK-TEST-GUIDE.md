# 🚀 クイックテストガイド

## すぐに実験したい場合の手順

### 1. Supabaseの簡単セットアップ（10分）

#### A. Supabaseアカウント作成
1. https://supabase.com/ にアクセス
2. 「Start your project」→ GitHubでログイン
3. 「New project」→ プロジェクト名「safety-test」

#### B. データベース作成（コピペでOK）
1. Supabase Dashboard → 左メニュー「SQL Editor」
2. 「New query」をクリック
3. 以下のコードを貼り付けて「RUN」

```sql
-- 基本テーブル作成
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    last_activity TIMESTAMP,
    battery_level INTEGER,
    device_info VARCHAR(100),
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    location_address TEXT,
    location_updated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE relationships (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES users(id),
    child_id INTEGER REFERENCES users(id),
    nickname VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(parent_id, child_id)
);

CREATE TABLE activities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    type VARCHAR(20) DEFAULT 'heartbeat',
    message TEXT,
    battery_level INTEGER,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    location_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    plan_type VARCHAR(20) DEFAULT 'basic',
    status VARCHAR(20) DEFAULT 'active',
    trial_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

CREATE TABLE pairing_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL,
    parent_id INTEGER REFERENCES users(id),
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE emergency_checks (
    id SERIAL PRIMARY KEY,
    child_id INTEGER REFERENCES users(id),
    parent_id INTEGER REFERENCES users(id),
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    response_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- テスト用ユーザーを作成
INSERT INTO users (email, password_hash, name) VALUES 
('parent@test.com', '$2b$10$rQZ9j4qJ1q4qJ1q4qJ1q4uO1q4qJ1q4qJ1q4qJ1q4qJ1q4qJ1q4qJ', '親テストユーザー'),
('child@test.com', '$2b$10$rQZ9j4qJ1q4qJ1q4qJ1q4qJ1q4qJ1q4qJ1q4qJ1q4qJ1q4qJ1q4qJ', '子テストユーザー');

-- サブスクリプション作成
INSERT INTO subscriptions (user_id, plan_type, status) 
SELECT id, 'premium', 'active' FROM users;
```

#### C. 環境変数設定（5分）
1. Supabase Dashboard → Settings → API
2. 以下の値をコピー：
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbG...`
   - **service_role key**: `eyJhbG...`

3. https://vercel.com/dashboard → safety-check-app → Settings → Environment Variables
4. 以下4つを追加：
   ```
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_SERVICE_KEY=(service_role key)
   SUPABASE_ANON_KEY=(anon public key)
   JWT_SECRET=your-random-secret-key-here-make-it-long-and-random-abc123
   ```

### 2. スマホでのテスト手順

#### A. 親アプリのインストール
1. **Androidスマホで以下を開く**
   ```
   https://safety-check-app.vercel.app/parent.html
   ```

2. **PWAインストール**
   - 画面下に「ホーム画面に追加」ボタンが表示される
   - または Chrome → メニュー（⋮）→「ホーム画面に追加」

3. **アカウント作成**
   - 新規登録をタップ
   - メール: 好きなアドレス（例：yourname@gmail.com）
   - パスワード: 8文字以上
   - 登録完了

#### B. 子アプリでの確認
1. **PCまたは別のスマホで開く**
   ```
   https://safety-check-app.vercel.app/child.html
   ```

2. **同じアカウントでログイン**
   - または別のメールアドレスで新規作成

3. **親を登録**
   - 親アプリで「ペアリングコード生成」
   - 子アプリで「親を登録」→ コード入力
   - ニックネーム「おやじ」等を入力

#### C. 動作テスト
1. **親アプリ操作**
   - スマホを普通に触る（タップ、スクロール等）
   - 位置情報許可を求められたら「許可」

2. **子アプリ確認**
   - 1-2分後にリロード
   - 「最終操作から○分」の表示を確認
   - バッテリー残量の表示を確認

### 3. 期待される動作

#### ✅ 正常動作
- 最終操作時間がリアルタイム更新
- バッテリー残量表示
- 位置情報表示（許可した場合）
- 4段階の色分け（緑→黄→橙→赤）

#### ❌ エラーが出る場合
1. **「500エラー」** → 環境変数未設定
2. **「認証エラー」** → JWT_SECRET未設定
3. **「データなし」** → データベース未作成

## トラブルシューティング

### データベース接続エラー
```
Vercel Dashboard → Functions → View Function Logs
でエラー詳細を確認
```

### 位置情報が取得できない
```
Android → 設定 → アプリ → Chrome → 権限 → 位置情報
```

### アプリが重い・遅い
```
Chrome → メニュー → その他のツール → デベロッパーツール
Console タブでエラーをチェック
```

## 成功した場合の次のステップ

1. **Google Play公開**
   ```bash
   npm i -g @bubblewrap/cli
   cd twa-android && ./setup-twa.sh
   ```

2. **機能追加**
   - プッシュ通知
   - Stripe決済
   - より詳細な設定

## お困りの場合

1. エラーメッセージをスクリーンショット
2. Vercel Functions Logs をチェック
3. ブラウザのコンソールログを確認

**重要**: 環境変数設定後は必ずVercelが再デプロイされるまで1-2分待ってからテストしてください。