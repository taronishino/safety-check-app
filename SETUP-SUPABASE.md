# Supabaseセットアップガイド

## 1. Supabaseプロジェクトの作成

### 手順
1. https://supabase.com/ にアクセス
2. 「Start your project」をクリック
3. GitHubアカウントでログイン
4. 「New project」をクリック
5. プロジェクト情報を入力：
   - **Organization**: 個人アカウント
   - **Name**: safety-check-app
   - **Database Password**: 強固なパスワードを設定
   - **Region**: Northeast Asia (Tokyo)
6. 「Create new project」をクリック

## 2. データベーステーブルの作成

### SQL Editor での実行
Supabase Dashboard → SQL Editor → New query で以下のSQLを実行：

```sql
-- 既存のテーブルを削除（初回のみ）
DROP TABLE IF EXISTS push_subscriptions CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS pairing_codes CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS relationships CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ユーザーテーブル
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 親子関係テーブル
CREATE TABLE relationships (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    child_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    nickname VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(parent_id, child_id)
);

-- 安否情報テーブル
CREATE TABLE activities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL DEFAULT 'heartbeat',
    message TEXT,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    location_address TEXT,
    battery_level INTEGER,
    device_info VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- サブスクリプション（料金プラン）テーブル
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    plan_type VARCHAR(20) NOT NULL DEFAULT 'basic',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    trial_end TIMESTAMP,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- ペアリングコードテーブル
CREATE TABLE pairing_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL,
    parent_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- プッシュ通知サブスクリプションテーブル
CREATE TABLE push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, endpoint)
);

-- ユーザー設定テーブル
CREATE TABLE user_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    setting_name VARCHAR(50) NOT NULL,
    setting_value VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, setting_name)
);

-- 緊急確認テーブル
CREATE TABLE emergency_checks (
    id SERIAL PRIMARY KEY,
    child_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    response_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP
);

-- インデックス作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_relationships_parent ON relationships(parent_id);
CREATE INDEX IF NOT EXISTS idx_relationships_child ON relationships(child_id);
CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at);
CREATE INDEX IF NOT EXISTS idx_pairing_codes_code ON pairing_codes(code);
CREATE INDEX IF NOT EXISTS idx_pairing_codes_expires ON pairing_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_checks_child ON emergency_checks(child_id);
CREATE INDEX IF NOT EXISTS idx_emergency_checks_parent ON emergency_checks(parent_id);
```

## 3. 環境変数の設定

### Vercelでの設定
1. Vercelダッシュボード → safety-check-app プロジェクト
2. Settings → Environment Variables
3. 以下の変数を追加：

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-public-key
JWT_SECRET=your-random-jwt-secret-key
```

### 値の取得方法
- **SUPABASE_URL**: Settings → API → Project URL
- **SUPABASE_SERVICE_KEY**: Settings → API → service_role（秘密鍵）
- **SUPABASE_ANON_KEY**: Settings → API → anon public（公開鍵）
- **JWT_SECRET**: ランダムな64文字の文字列を生成

### JWT_SECRET生成方法
```bash
# Node.jsで生成
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# または
openssl rand -hex 64
```

## 4. Row Level Security (RLS) の設定

### Security → Authentication → Row Level Security で有効化

```sql
-- ユーザーテーブルのRLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- 関係性テーブルのRLS
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view relationships they're part of" ON relationships
    FOR SELECT USING (
        auth.uid()::text = parent_id::text OR 
        auth.uid()::text = child_id::text
    );

-- その他のテーブルも同様に設定
```

## 5. テストデータの投入

```sql
-- テストユーザーの作成
INSERT INTO users (email, password_hash, name) VALUES 
('parent@test.com', '$2b$10$rQZ9j4qJ1q4qJ1q4qJ1q4uO1q4qJ1q4qJ1q4qJ1q4qJ1q4qJ1q4qJ', '親テストユーザー'),
('child@test.com', '$2b$10$rQZ9j4qJ1q4qJ1q4qJ1q4uO1q4qJ1q4qJ1q4qJ1q4qJ1q4qJ1q4qJ', '子テストユーザー')
ON CONFLICT (email) DO NOTHING;

-- 基本プランの設定
INSERT INTO subscriptions (user_id, plan_type, status) 
SELECT id, 'basic', 'active' FROM users WHERE email IN ('parent@test.com', 'child@test.com')
ON CONFLICT (user_id) DO NOTHING;
```

## 6. セットアップ完了確認

### ダッシュボードで確認
- Database → Tables でテーブルが作成されているか確認
- Authentication → Users でユーザー認証設定を確認
- API → Settings で環境変数が正しく設定されているか確認

## 7. よくある問題

### 問題1: 接続エラー
- 環境変数が正しく設定されているか確認
- Supabaseプロジェクトが正常に作成されているか確認

### 問題2: 認証エラー
- service_role キーを使用しているか確認（anon keyではなく）
- JWT_SECREトが正しく設定されているか確認

### 問題3: RLSエラー
- 開発時は一時的にRLSを無効にしても可
- プロダクション時は必ず有効化