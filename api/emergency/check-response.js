// Vercel Serverless Function - 緊急確認応答確認 API
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  console.log('Emergency response check function started');
  
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
    const childId = decoded.userId;

    console.log('Checking emergency responses for child:', childId);

    // 子供が送信した緊急確認依頼の最新の応答を取得（1件のみ）
    const { data: responses, error } = await supabase
      .from('emergency_requests')
      .select(`
        *,
        parent:parent_id(name)
      `)
      .eq('requester_id', childId)
      .eq('status', 'responded')
      .gte('responded_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // 2時間以内
      .order('responded_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Emergency responses fetch error:', {
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
      responses: responses || [],
      has_new_responses: responses && responses.length > 0
    });

  } catch (error) {
    console.error('Emergency response check error:', {
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