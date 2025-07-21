-- user_settingsテーブル追加スクリプト
-- 既存のSupabaseデータベースに実行してください

-- ユーザー設定テーブル作成
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
CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_name ON user_settings(setting_name);

-- 既存ユーザーのデフォルト設定を追加（全機能有効）
INSERT INTO user_settings (user_id, setting_name, setting_value)
SELECT id, 'location_sharing', 'enabled' FROM users
ON CONFLICT (user_id, setting_name) DO NOTHING;

INSERT INTO user_settings (user_id, setting_name, setting_value)
SELECT id, 'manual_safety_reports', 'enabled' FROM users
ON CONFLICT (user_id, setting_name) DO NOTHING;

INSERT INTO user_settings (user_id, setting_name, setting_value)
SELECT id, 'emergency_checks', 'enabled' FROM users
ON CONFLICT (user_id, setting_name) DO NOTHING;

-- 作成したテーブルを確認
SELECT 
    table_name,
    column_name,
    data_type,
    character_maximum_length
FROM 
    information_schema.columns
WHERE 
    table_name = 'user_settings'
ORDER BY 
    ordinal_position;