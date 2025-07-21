-- emergency_requestsテーブルにread_atカラムを追加
ALTER TABLE emergency_requests 
ADD COLUMN read_at TIMESTAMPTZ DEFAULT NULL;

-- 既読カラムにインデックスを追加（パフォーマンス向上）
CREATE INDEX idx_emergency_requests_read_at ON emergency_requests(read_at);

COMMENT ON COLUMN emergency_requests.read_at IS '子供が応答を既読にした時刻（NULL=未読）';