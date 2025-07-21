// Vercel Serverless Function - ニックネーム更新 API
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

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== Update Nickname Request ===');
    console.log('Request method:', req.method);
    console.log('Request body:', req.body);
    console.log('Environment check:', {
      supabaseUrl: !!process.env.SUPABASE_URL,
      supabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
      jwtSecret: !!process.env.JWT_SECRET
    });

    // JWT認証
    const authHeader = req.headers.authorization;
    console.log('Auth header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Invalid auth header format');
      return res.status(401).json({ error: 'No valid authorization header' });
    }

    const token = authHeader.substring(7);
    console.log('Token extracted, length:', token.length);
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('JWT decoded successfully, userId:', decoded.userId);
    const childId = decoded.userId;

    const { parent_id, nickname } = req.body;
    console.log('Parsed request data:', { parent_id, nickname, childId });

    if (!parent_id || !nickname) {
      console.log('Missing required fields');
      return res.status(400).json({ error: 'Parent ID and nickname are required' });
    }

    // ニックネームのバリデーション
    if (typeof nickname !== 'string' || nickname.trim().length === 0) {
      console.log('Invalid nickname format');
      return res.status(400).json({ error: 'Valid nickname is required' });
    }

    if (nickname.trim().length > 50) {
      console.log('Nickname too long');
      return res.status(400).json({ error: 'Nickname is too long (max 50 characters)' });
    }

    console.log('All validations passed, checking relationship...');

    // 関係性の存在確認
    const { data: relationship, error: relationError } = await supabase
      .from('relationships')
      .select('*')
      .eq('parent_id', parent_id)
      .eq('child_id', childId)
      .single();

    console.log('Relationship query result:', { relationship, relationError });

    if (relationError || !relationship) {
      console.log('Relationship not found or error:', relationError);
      return res.status(404).json({ error: 'Relationship not found' });
    }

    console.log('Relationship found, proceeding with update...');

    // ニックネームを更新
    const { data: updatedRelationship, error: updateError } = await supabase
      .from('relationships')
      .update({
        nickname: nickname.trim()
      })
      .eq('parent_id', parent_id)
      .eq('child_id', childId)
      .select()
      .single();

    console.log('Update query result:', { updatedRelationship, updateError });

    if (updateError) {
      console.error('Nickname update error:', updateError);
      return res.status(500).json({ error: 'Failed to update nickname' });
    }

    res.status(200).json({
      success: true,
      relationship: updatedRelationship,
      message: 'ニックネームを更新しました'
    });

  } catch (error) {
    console.error('Update nickname error:', error);
    
    // JWTエラーの場合は401を返す
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
}