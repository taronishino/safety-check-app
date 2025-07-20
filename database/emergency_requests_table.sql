-- 緊急確認依頼テーブル
CREATE TABLE emergency_requests (
    id BIGSERIAL PRIMARY KEY,
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'responded', 'expired')),
    message TEXT,
    parent_response VARCHAR(20) CHECK (parent_response IN ('safe', 'need_help', 'no_response')),
    response_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
    
    -- インデックス
    INDEX idx_emergency_requests_parent_status (parent_id, status),
    INDEX idx_emergency_requests_created_at (created_at),
    INDEX idx_emergency_requests_expires_at (expires_at)
);

-- RLS (Row Level Security) を有効化
ALTER TABLE emergency_requests ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー: ユーザーは自分が関連する緊急確認依頼のみアクセス可能
CREATE POLICY "Users can access their own emergency requests" ON emergency_requests
FOR ALL USING (
    requester_id = auth.uid() OR parent_id = auth.uid()
);

-- コメント追加
COMMENT ON TABLE emergency_requests IS '緊急確認依頼を管理するテーブル';
COMMENT ON COLUMN emergency_requests.requester_id IS '緊急確認を要請した子供のID';
COMMENT ON COLUMN emergency_requests.parent_id IS '緊急確認を受け取る親のID';
COMMENT ON COLUMN emergency_requests.status IS '依頼の状態 (pending: 未応答, responded: 応答済み, expired: 期限切れ)';
COMMENT ON COLUMN emergency_requests.parent_response IS '親の応答内容 (safe: 無事, need_help: 助けが必要, no_response: 無応答)';
COMMENT ON COLUMN emergency_requests.expires_at IS '依頼の有効期限 (24時間後に自動設定)';