-- 緊急確認依頼テーブル（修正版）
-- usersテーブルのSERIAL(integer)型に合わせて修正

-- 既存のテーブルを削除（もし存在すれば）
DROP TABLE IF EXISTS emergency_requests;

-- 新しいテーブルを作成（正しいID型で）
CREATE TABLE emergency_requests (
    id BIGSERIAL PRIMARY KEY,
    requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    message TEXT,
    parent_response TEXT,
    response_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

-- 基本的なインデックス
CREATE INDEX idx_emergency_requests_parent_status ON emergency_requests(parent_id, status);
CREATE INDEX idx_emergency_requests_created_at ON emergency_requests(created_at);

-- RLS（Row Level Security）
ALTER TABLE emergency_requests ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（一時的に全アクセス許可）
CREATE POLICY "emergency_requests_policy" ON emergency_requests
FOR ALL USING (true);

COMMENT ON TABLE emergency_requests IS '緊急確認依頼管理テーブル（ID型修正版）';