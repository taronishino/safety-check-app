-- 親子関係の詳細確認
-- relationshipsテーブルの内容を確認
SELECT 
    r.id,
    r.parent_id,
    r.child_id,
    r.nickname,
    r.created_at,
    p.email as parent_email,
    p.name as parent_name,
    c.email as child_email,
    c.name as child_name
FROM relationships r
LEFT JOIN users p ON r.parent_id = p.id
LEFT JOIN users c ON r.child_id = c.id
ORDER BY r.created_at DESC;

-- child_id = 10の親を確認
SELECT 
    r.*,
    p.name as parent_name,
    p.email as parent_email,
    p.last_activity
FROM relationships r
JOIN users p ON r.parent_id = p.id
WHERE r.child_id = 10;

-- parent_id = 13の子を確認
SELECT 
    r.*,
    c.name as child_name,
    c.email as child_email
FROM relationships r
JOIN users c ON r.child_id = c.id
WHERE r.parent_id = 13;

-- users テーブルでID 10と13の情報を確認
SELECT id, email, name, created_at
FROM users
WHERE id IN (10, 13);