// Vercel Serverless Function - 子側：親の安否報告既読 API
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  console.log('Mark parent reports read function started');
  
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

    console.log('Marking parent reports as read for child:', childId);

    // 子の最後に既読にした時刻を記録するための簡単な方法として
    // activitiesテーブルに既読マーカーを追加
    const { data: readMarker, error: markerError } = await supabase
      .from('activities')
      .insert({
        user_id: childId,
        type: 'parent_reports_read',
        message: '親の安否報告既読',
        last_activity_at: new Date().toISOString(),
        device_info: 'child-read-marker',
        metadata: {
          read_at: new Date().toISOString(),
          action: 'mark_parent_reports_read'
        },
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (markerError) {
      console.error('Read marker insert error:', markerError);
      return res.status(500).json({ 
        error: 'Failed to mark reports as read',
        debug: markerError.message 
      });
    }

    console.log('Parent reports marked as read:', readMarker.id);

    res.status(200).json({
      success: true,
      message: '親の安否報告を既読にしました',
      read_at: readMarker.created_at
    });

  } catch (error) {
    console.error('Mark parent reports read error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // JWTエラーの場合は401を返す
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      debug: error.message
    });
  }
}