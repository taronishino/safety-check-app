// Vercel Serverless Function - 親子関係取得 API
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
    
    console.log('=== Relationships Debug ===');
    console.log('User ID:', userId);
    console.log('User email:', decoded.email);

    // 親子関係を取得（親の最終活動時間も含む）
    const { data: relationships, error } = await supabase
      .from('relationships')
      .select(`
        *,
        parent:parent_id(id, name, email, last_activity, battery_level, device_info),
        child:child_id(id, name, email)
      `)
      .eq('child_id', userId);

    if (error) {
      console.error('Relationships fetch error:', error);
      return res.status(200).json({ 
        relationships: [],
        debug: {
          error: error.message,
          userId: userId,
          hasError: true
        }
      });
    }
    
    console.log('Raw relationships data:', relationships);
    console.log('Relationships count:', relationships?.length || 0);

    // データ整形
    const formattedRelationships = relationships.map(rel => ({
      id: rel.id,
      parent_id: rel.parent_id,
      parent_name: rel.parent?.name || 'Unknown',
      parent_email: rel.parent?.email || '',
      nickname: rel.nickname || rel.parent?.name || 'Parent',
      created_at: rel.created_at,
      last_activity: rel.parent?.last_activity || new Date().toISOString(),
      battery_level: rel.parent?.battery_level || null,
      device_info: rel.parent?.device_info || 'unknown'
    }));

    res.status(200).json({
      relationships: formattedRelationships
    });

  } catch (error) {
    console.error('Relationships error:', error);
    
    // JWTエラーの場合は401を返す
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
}