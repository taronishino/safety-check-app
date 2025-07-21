-- 安否チェックアプリ PostgreSQL スキーマ
-- Supabase用データベース構築SQL

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 親子関係テーブル
CREATE TABLE IF NOT EXISTS relationships (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    child_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    nickname VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(parent_id, child_id)
);

-- 安否情報テーブル
CREATE TABLE IF NOT EXISTS activities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL DEFAULT 'heartbeat',
    message TEXT,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    location_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- サブスクリプション（料金プラン）テーブル
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    plan_type VARCHAR(20) NOT NULL DEFAULT 'basic',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    trial_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- ペアリングコードテーブル
CREATE TABLE IF NOT EXISTS pairing_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL,
    parent_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- プッシュ通知サブスクリプションテーブル
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, endpoint)
);

-- ユーザー設定テーブル
CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    setting_name VARCHAR(50) NOT NULL,
    setting_value VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, setting_name)
);

-- インデックス作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_relationships_parent ON relationships(parent_id);
CREATE INDEX IF NOT EXISTS idx_relationships_child ON relationships(child_id);
CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at);
CREATE INDEX IF NOT EXISTS idx_pairing_codes_code ON pairing_codes(code);
CREATE INDEX IF NOT EXISTS idx_pairing_codes_expires ON pairing_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_name ON user_settings(setting_name);

-- 初期データ挿入（テスト用）
-- パスワードは 'password' をbcryptでハッシュ化したもの
INSERT INTO users (email, password_hash, name) VALUES 
('test@example.com', '$2b$10$rQZ9j4qJ1q4qJ1q4qJ1q4uO1q4qJ1q4qJ1q4qJ1q4qJ1q4qJ1q4qJ', 'テストユーザー'),
('parent@example.com', '$2b$10$rQZ9j4qJ1q4qJ1q4qJ1q4uO1q4qJ1q4qJ1q4qJ1q4qJ1q4qJ1q4qJ', '親ユーザー'),
('child@example.com', '$2b$10$rQZ9j4qJ1q4qJ1q4qJ1q4uO1q4qJ1q4qJ1q4qJ1q4qJ1q4qJ1q4qJ', '子ユーザー')
ON CONFLICT (email) DO NOTHING;

-- 初期サブスクリプション設定
INSERT INTO subscriptions (user_id, plan_type, status) 
SELECT id, 'basic', 'active' FROM users WHERE email IN ('test@example.com', 'parent@example.com')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO subscriptions (user_id, plan_type, status) 
SELECT id, 'premium', 'active' FROM users WHERE email = 'child@example.com'
ON CONFLICT (user_id) DO NOTHING;

-- 初期親子関係設定
INSERT INTO relationships (parent_id, child_id, nickname)
SELECT p.id, c.id, 'お父さん'
FROM users p, users c 
WHERE p.email = 'parent@example.com' AND c.email = 'child@example.com'
ON CONFLICT (parent_id, child_id) DO NOTHING;

-- 初期ユーザー設定（全機能有効）
INSERT INTO user_settings (user_id, setting_name, setting_value)
SELECT id, 'location_sharing', 'enabled' FROM users
ON CONFLICT (user_id, setting_name) DO NOTHING;

INSERT INTO user_settings (user_id, setting_name, setting_value)
SELECT id, 'manual_safety_reports', 'enabled' FROM users
ON CONFLICT (user_id, setting_name) DO NOTHING;

INSERT INTO user_settings (user_id, setting_name, setting_value)
SELECT id, 'emergency_checks', 'enabled' FROM users
ON CONFLICT (user_id, setting_name) DO NOTHING;