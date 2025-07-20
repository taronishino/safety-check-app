// Vercel Serverless Function - ペアリングコード生成 API
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
    const userId = decoded.userId;

    // 6桁のペアリングコードを生成
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分後に期限切れ

    // 既存のコードを無効化（同じparent_idの古いコード）
    await supabase
      .from('pairing_codes')
      .delete()
      .eq('parent_id', userId);

    // 新しいペアリングコードをデータベースに保存
    const { data: pairingCode, error } = await supabase
      .from('pairing_codes')
      .insert([{
        code,
        parent_id: userId,
        expires_at: expiresAt.toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Pairing code creation error:', error);
      return res.status(500).json({ error: 'Failed to create pairing code' });
    }

    res.status(201).json({
      success: true,
      code,
      expires_at: expiresAt.toISOString(),
      message: 'ペアリングコードを生成しました。5分以内にお子様に伝えてください。'
    });

  } catch (error) {
    console.error('Generate pairing code error:', error);
    
    // JWTエラーの場合は401を返す
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
}