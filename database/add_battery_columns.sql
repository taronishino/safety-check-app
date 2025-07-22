-- usersテーブルにバッテリー情報と最終活動時間のカラムを追加
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS battery_level INTEGER,
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP,
ADD COLUMN IF NOT EXISTS device_info VARCHAR(100),
ADD COLUMN IF NOT EXISTS location_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS location_lng DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS location_address TEXT;

-- 既存データのデフォルト値を設定（必要に応じて）
UPDATE users 
SET last_activity = updated_at 
WHERE last_activity IS NULL;