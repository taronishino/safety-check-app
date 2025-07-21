// Vercel Serverless Function - 親からの安否報告送信 API（簡素版）
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  console.log('Parent safety report simple function started');
  
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
    const parentId = decoded.userId;

    console.log('Processing safety report from parent:', parentId);

    const { status, message } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // 有効なステータスのチェック
    const validStatuses = ['fine', 'ok', 'need_help'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // 親と関連付けられた子のプレミアムプラン確認
    const { data: relationships, error: relError } = await supabase
      .from('relationships')
      .select('child_id')
      .eq('parent_id', parentId);

    if (relError) {
      console.error('Relationships query error:', relError);
      return res.status(500).json({ error: 'Database error fetching relationships', debug: relError.message });
    }
    
    if (!relationships || relationships.length === 0) {
      console.log('No child relationships found for parent:', parentId);
      return res.status(403).json({ error: 'No child relationships found' });
    }

    // 関連する子のいずれかがプレミアムプランかチェック
    const childIds = relationships.map(rel => rel.child_id);
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('plan_type, status, user_id')
      .in('user_id', childIds)
      .eq('plan_type', 'premium')
      .eq('status', 'active');

    if (subError) {
      console.error('Subscriptions query error:', subError);
      return res.status(500).json({ error: 'Database error fetching subscriptions', debug: subError.message });
    }
    
    if (!subscriptions || subscriptions.length === 0) {
      console.log('No premium subscriptions found for children:', childIds);
      return res.status(403).json({ error: 'Premium plan required for safety reports (child must have premium plan)' });
    }

    // activitiesテーブルを使わずに簡単な返却（テスト用）
    const statusMessages = {
      'fine': '元気です',
      'ok': '問題ないです',
      'need_help': '助けが必要'
    };

    const reportMessage = message || statusMessages[status];
    
    console.log('Safety report would be recorded (test mode):', {
      user_id: parentId,
      status: status,
      message: reportMessage
    });

    res.status(200).json({
      success: true,
      message: `安否報告テスト完了: ${reportMessage}`,
      test_mode: true,
      status: status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Safety report error:', {
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