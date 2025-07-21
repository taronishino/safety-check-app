// Vercel Serverless Function - 緊急確認応答既読 API
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  console.log('Emergency response mark read function started');
  
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

    console.log('Marking emergency responses as read for child:', childId);

    // 子供のすべての応答済み緊急確認にread_atタイムスタンプを追加
    const { data: updatedRequests, error } = await supabase
      .from('emergency_requests')
      .update({
        read_at: new Date().toISOString()
      })
      .eq('requester_id', childId)
      .eq('status', 'responded')
      .is('read_at', null) // まだ既読になっていないもののみ
      .select();

    if (error) {
      console.error('Mark read error:', {
        error: error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return res.status(500).json({ 
        error: 'Database error',
        debug: error.message,
        code: error.code
      });
    }

    res.status(200).json({
      success: true,
      marked_read: updatedRequests ? updatedRequests.length : 0,
      message: 'Responses marked as read'
    });

  } catch (error) {
    console.error('Emergency response mark read error:', {
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