-- emergency_checks テーブル作成
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
CREATE INDEX idx_emergency_checks_child_id ON emergency_checks(child_id);
CREATE INDEX idx_emergency_checks_parent_id ON emergency_checks(parent_id);
CREATE INDEX idx_emergency_checks_status ON emergency_checks(status);
CREATE INDEX idx_emergency_checks_created_at ON emergency_checks(created_at DESC);