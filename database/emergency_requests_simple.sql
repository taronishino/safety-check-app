-- 緊急確認依頼テーブル（シンプル版・テスト用）
-- 既存のユーザーテーブルのid型に合わせてUUID型を使用

CREATE TABLE emergency_requests (
    id BIGSERIAL PRIMARY KEY,
    requester_id UUID NOT NULL,
    parent_id UUID NOT NULL,
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

-- 外部キー制約（オプション・後で追加可能）
-- ALTER TABLE emergency_requests ADD CONSTRAINT fk_requester 
--   FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE;
-- ALTER TABLE emergency_requests ADD CONSTRAINT fk_parent 
--   FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE;

-- RLS（Row Level Security）
ALTER TABLE emergency_requests ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "emergency_requests_policy" ON emergency_requests
FOR ALL USING (true); -- 一時的に全アクセス許可（後で制限）

COMMENT ON TABLE emergency_requests IS '緊急確認依頼管理テーブル（デバッグ版）';