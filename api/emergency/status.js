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

    
    
    // シンプルなクエリで確実に取得
    const { data: emergencyRequests, error } = await supabase
      .from('emergency_requests')
      .select('*')
      .eq('parent_id', parentId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
      

    if (error) {
      console.error('Database query failed:', error);
      return res.status(500).json({ 
        error: 'Database error',
        debug: error.message
      });
    }

    const hasPendingRequests = emergencyRequests && emergencyRequests.length > 0;
    
    // 依頼者の名前（ニックネーム優先）を取得
    let requesterName = null;
    if (hasPendingRequests) {
      const requesterId = emergencyRequests[0].requester_id;
      
      // relationshipsテーブルからニックネームを取得
      const { data: relationship, error: relError } = await supabase
        .from('relationships')
        .select('nickname')
        .eq('parent_id', parentId)
        .eq('child_id', requesterId)
        .single();
        
      
      if (relationship?.nickname) {
        requesterName = relationship.nickname;
      } else {
        // ニックネームがない場合はusersテーブルから名前を取得
        const { data: requester, error: requesterError } = await supabase
          .from('users')
          .select('name')
          .eq('id', requesterId)
          .single();
          
        requesterName = requester?.name || 'Unknown';
      }
    }

    const response = {
      has_pending_requests: hasPendingRequests,
      requester_name: requesterName,
      pending_count: emergencyRequests ? emergencyRequests.length : 0
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Emergency status API error:', error);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}