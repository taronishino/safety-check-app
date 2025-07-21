// Vercel Serverless Function - 緊急確認送信 API
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  console.log('Emergency check function started');
  console.log('Environment check:', {
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
    hasJwtSecret: !!process.env.JWT_SECRET
  });
  
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
    console.log('Processing POST request');
    
    // Environment variable check
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET environment variable is missing');
      return res.status(500).json({ 
        error: 'Server configuration error', 
        debug: 'JWT_SECRET not configured' 
      });
    }
    
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      console.error('Supabase environment variables missing');
      return res.status(500).json({ 
        error: 'Server configuration error', 
        debug: 'Supabase configuration missing' 
      });
    }

    // JWT認証
    const authHeader = req.headers.authorization;
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Invalid authorization header');
      return res.status(401).json({ error: 'No valid authorization header' });
    }

    const token = authHeader.substring(7);
    console.log('Token extracted, length:', token.length);
    
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('JWT verification successful, userId:', decoded.userId);
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return res.status(401).json({ 
        error: 'Invalid token', 
        debug: jwtError.message 
      });
    }
    
    const childId = decoded.userId;

    console.log('Request body:', req.body);
    const { parent_id, parent_name } = req.body;

    if (!parent_id) {
      console.log('Missing parent_id in request body');
      return res.status(400).json({ error: 'Parent ID is required' });
    }
    
    console.log('Parent ID provided:', parent_id);

    // 権限チェック - 親子関係が存在するか確認
    console.log('Checking relationship between parent:', parent_id, 'and child:', childId);
    const { data: relationship, error: relError } = await supabase
      .from('relationships')
      .select('*')
      .eq('parent_id', parent_id)
      .eq('child_id', childId)
      .single();

    if (relError) {
      console.error('Relationship check error:', relError);
      return res.status(403).json({ 
        error: 'Relationship check failed', 
        debug: relError.message 
      });
    }
    
    if (!relationship) {
      console.log('No relationship found between parent and child');
      return res.status(403).json({ error: 'No relationship found' });
    }
    
    console.log('Relationship verified successfully');

    // 子供の情報を取得
    const { data: childUser, error: childError } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', childId)
      .single();

    if (childError) {
      console.error('Child user fetch error:', childError);
    }

    // 緊急確認依頼をデータベースに記録
    console.log('Creating emergency request...');
    const emergencyData = {
      requester_id: childId,
      parent_id: parent_id,
      status: 'pending',
      message: '緊急確認をお願いします',
      created_at: new Date().toISOString()
    };
    console.log('Emergency request data:', emergencyData);
    
    const { data: emergencyRequest, error: requestError } = await supabase
      .from('emergency_requests')
      .insert(emergencyData)
      .select()
      .single();

    if (requestError) {
      console.error('Emergency request creation error:', {
        error: requestError,
        code: requestError.code,
        message: requestError.message,
        details: requestError.details,
        hint: requestError.hint
      });
      return res.status(500).json({ 
        error: 'Failed to create emergency request',
        debug: requestError.message,
        code: requestError.code
      });
    }

    // アクティビティログとして記録
    const { data: activity, error: actError } = await supabase
      .from('activities')
      .insert([{
        user_id: parent_id,
        activity_type: 'emergency_check_received',
        metadata: {
          emergency_request_id: emergencyRequest.id,
          from_child_name: childUser?.name || 'お子様',
          message: '緊急確認の依頼が届きました'
        }
      }]);

    if (actError) {
      console.error('Activity log error:', actError);
    }

    res.status(200).json({
      success: true,
      message: `${parent_name || 'Parent'}に緊急確認を送信しました`,
      emergency_request_id: emergencyRequest.id,
      requester_name: childUser?.name || 'お子様'
    });

  } catch (error) {
    console.error('Emergency check error:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    
    // JWTエラーの場合は401を返す
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        debug: error.message 
      });
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      debug: error.message,
      name: error.name
    });
  }
}