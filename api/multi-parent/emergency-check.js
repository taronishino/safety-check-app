// Vercel Serverless Function - 緊急確認送信 API
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

  if (req.method !== 'POST') {
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
    const childId = decoded.userId;

    const { parent_id, parent_name } = req.body;

    if (!parent_id) {
      return res.status(400).json({ error: 'Parent ID is required' });
    }

    // 権限チェック - 親子関係が存在するか確認
    const { data: relationship, error: relError } = await supabase
      .from('relationships')
      .select('*')
      .eq('parent_id', parent_id)
      .eq('child_id', childId)
      .single();

    if (relError || !relationship) {
      return res.status(403).json({ error: 'No relationship found' });
    }

    // 緊急確認通知を作成（実際のプッシュ通知実装は省略）
    const notification = {
      type: 'emergency_check',
      from_child_id: childId,
      to_parent_id: parent_id,
      parent_name: parent_name || 'Parent',
      message: `${decoded.email}さんから緊急確認の要請がありました`,
      created_at: new Date().toISOString()
    };

    // アクティビティログとして記録
    const { data: activity, error: actError } = await supabase
      .from('activities')
      .insert([{
        user_id: parent_id,
        activity_type: 'emergency_check_received',
        metadata: notification
      }]);

    if (actError) {
      console.error('Activity log error:', actError);
    }

    res.status(200).json({
      success: true,
      message: `${parent_name || 'Parent'}に緊急確認を送信しました`,
      notification
    });

  } catch (error) {
    console.error('Emergency check error:', error);
    
    // JWTエラーの場合は401を返す
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
}