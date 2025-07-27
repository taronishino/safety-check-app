// Vercel Serverless Function - 緊急確認応答 API
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
    const parentId = decoded.userId;

    const { status, message, timestamp } = req.body;


    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // 最新の pending 緊急確認依頼を取得
    const { data: pendingRequests, error: checkError } = await supabase
      .from('emergency_requests')
      .select('*')
      .eq('parent_id', parentId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1);


    if (checkError) {
      console.error('Pending requests check failed:', checkError);
      return res.status(500).json({ error: 'Failed to check pending requests' });
    }

    if (!pendingRequests || pendingRequests.length === 0) {
      return res.status(404).json({ error: 'No pending emergency requests found' });
    }

    const latestRequest = pendingRequests[0];

    // 特定の最新緊急確認依頼を完了状態に更新
    const { data: updatedRequests, error: updateError } = await supabase
      .from('emergency_requests')
      .update({
        status: 'responded',
        parent_response: status,
        response_message: message || '無事です',
        responded_at: timestamp || new Date().toISOString()
      })
      .eq('id', latestRequest.id)
      .eq('status', 'pending')
      .select();


    if (updateError) {
      console.error('Emergency response update error:', {
        error: updateError,
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint
      });
      return res.status(500).json({ 
        error: 'Database update error',
        debug: updateError.message,
        code: updateError.code
      });
    }

    if (!updatedRequests || updatedRequests.length === 0) {
      return res.status(404).json({ error: 'No pending emergency requests found' });
    }

    // 安否報告として活動記録も更新
    try {
      await supabase
        .from('activities')
        .insert({
          user_id: parentId,
          type: 'emergency_response',
          message: `緊急確認応答: ${status === 'safe' ? '無事です' : status === 'need_help' ? '助けが必要です' : '応答'}`,
          created_at: timestamp || new Date().toISOString()
        });
    } catch (activityError) {
      // Activity logging is non-critical, ignore errors
    }

    res.status(200).json({
      success: true,
      message: 'Emergency response recorded successfully',
      responded_to: updatedRequests.length,
      response_status: status
    });

  } catch (error) {
    console.error('Emergency response error:', error);
    
    // JWTエラーの場合は401を返す
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
}