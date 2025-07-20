// Vercel Serverless Function - 緊急確認状態取得 API
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
    const parentId = decoded.userId;

    // 親に対する未応答の緊急確認依頼を取得
    const { data: emergencyRequests, error } = await supabase
      .from('emergency_requests')
      .select(`
        *,
        requester:requester_id(name)
      `)
      .eq('parent_id', parentId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Emergency requests fetch error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    const hasPendingRequests = emergencyRequests && emergencyRequests.length > 0;
    const requesterName = hasPendingRequests ? emergencyRequests[0].requester?.name : null;

    res.status(200).json({
      has_pending_requests: hasPendingRequests,
      requester_name: requesterName,
      pending_count: emergencyRequests ? emergencyRequests.length : 0
    });

  } catch (error) {
    console.error('Emergency status check error:', error);
    
    // JWTエラーの場合は401を返す
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
}