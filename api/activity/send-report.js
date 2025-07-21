// Vercel Serverless Function - 親からの安否報告送信 API
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  console.log('Parent safety report function started');
  
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

    // プレミアムプラン確認
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('plan_type, status')
      .eq('user_id', parentId)
      .single();

    if (subError || !subscription || subscription.plan_type !== 'premium' || subscription.status !== 'active') {
      return res.status(403).json({ error: 'Premium plan required for safety reports' });
    }

    // 安否報告をactivitiesテーブルに記録
    const statusMessages = {
      'fine': '元気です',
      'ok': '問題ないです',
      'need_help': '助けが必要'
    };

    const reportMessage = message || statusMessages[status];
    
    const { data: activity, error: actError } = await supabase
      .from('activities')
      .insert({
        user_id: parentId,
        activity_type: 'safety_report',
        last_activity_at: new Date().toISOString(),
        device_info: 'parent-manual-report',
        metadata: {
          report_status: status,
          message: reportMessage,
          report_type: 'manual'
        }
      })
      .select()
      .single();

    if (actError) {
      console.error('Activity insert error:', actError);
      return res.status(500).json({ 
        error: 'Failed to record safety report',
        debug: actError.message 
      });
    }

    console.log('Safety report recorded successfully:', activity.id);

    res.status(200).json({
      success: true,
      message: `安否報告を送信しました: ${reportMessage}`,
      report_id: activity.id,
      status: status,
      timestamp: activity.last_activity_at
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