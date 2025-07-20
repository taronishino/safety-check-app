// Vercel Serverless Function - 複数親通知設定 API
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // JWT認証
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No valid authorization header' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // 親子関係とアクティビティ情報を取得
    const { data: relationships, error } = await supabase
      .from('relationships')
      .select(`
        *,
        parent:parent_id(id, name, email)
      `)
      .eq('child_id', userId);

    if (error) {
      console.error('Relationships fetch error:', error);
      return res.status(200).json({ parents: [] });
    }

    // 親の情報を整形
    const parentsData = relationships.map(rel => ({
      id: rel.parent_id,
      name: rel.nickname || rel.parent?.name || 'Unknown',
      email: rel.parent?.email || '',
      nickname: rel.nickname,
      last_activity: new Date().toISOString(), // ダミーデータ
      status: 'active', // ダミーデータ
      location: null // 位置情報はまだ実装していない
    }));

    res.status(200).json({
      parents: parentsData
    });

  } catch (error) {
    console.error('Multi-parent notification settings error:', error);
    
    // JWTエラーの場合は401を返す
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
}