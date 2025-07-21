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
    // JWT認証
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No valid authorization header' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const childId = decoded.userId;

    const { parent_id, nickname } = req.body;

    if (!parent_id || !nickname) {
      return res.status(400).json({ error: 'Parent ID and nickname are required' });
    }

    // ニックネームのバリデーション
    if (typeof nickname !== 'string' || nickname.trim().length === 0) {
      return res.status(400).json({ error: 'Valid nickname is required' });
    }

    if (nickname.trim().length > 50) {
      return res.status(400).json({ error: 'Nickname is too long (max 50 characters)' });
    }

    // 関係性の存在確認
    const { data: relationship, error: relationError } = await supabase
      .from('relationships')
      .select('*')
      .eq('parent_id', parent_id)
      .eq('child_id', childId)
      .single();

    if (relationError || !relationship) {
      return res.status(404).json({ error: 'Relationship not found' });
    }

    // ニックネームを更新
    const { data: updatedRelationship, error: updateError } = await supabase
      .from('relationships')
      .update({
        nickname: nickname.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('parent_id', parent_id)
      .eq('child_id', childId)
      .select()
      .single();

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