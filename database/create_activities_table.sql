-- activitiesテーブル作成（安否報告機能用）
CREATE TABLE IF NOT EXISTS activities (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    last_activity_at TIMESTAMPTZ NOT NULL,
    device_info TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at);
CREATE INDEX IF NOT EXISTS idx_activities_last_activity ON activities(last_activity_at);

-- RLS（Row Level Security）有効化
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- RLSポリシー作成（ユーザーは自分のactivitiesのみアクセス可能）
CREATE POLICY IF NOT EXISTS "Users can view their own activities" ON activities
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY IF NOT EXISTS "Users can insert their own activities" ON activities
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY IF NOT EXISTS "Users can update their own activities" ON activities
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- サービスキー用のポリシー（全てのactivitiesにアクセス可能）
CREATE POLICY IF NOT EXISTS "Service role can access all activities" ON activities
    FOR ALL USING (current_user = 'service_role');

-- テーブル作成完了メッセージ
SELECT 'Activities table created successfully' as result;