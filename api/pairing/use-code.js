// Vercel Serverless Function - ペアリングコード使用 API
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
    const childId = decoded.userId;

    const { code, nickname } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Pairing code is required' });
    }

    // ペアリングコードを検索
    const { data: pairingCode, error: codeError } = await supabase
      .from('pairing_codes')
      .select('*')
      .eq('code', code)
      .single();

    if (codeError || !pairingCode) {
      return res.status(404).json({ error: 'Invalid pairing code' });
    }

    // 期限切れチェック
    const now = new Date();
    const expiresAt = new Date(pairingCode.expires_at);
    if (now > expiresAt) {
      return res.status(400).json({ error: 'Pairing code has expired' });
    }

    // 既存の関係をチェック
    const { data: existingRelation } = await supabase
      .from('relationships')
      .select('*')
      .eq('parent_id', pairingCode.parent_id)
      .eq('child_id', childId)
      .single();

    if (existingRelation) {
      return res.status(409).json({ error: 'Relationship already exists' });
    }

    // 親が既に他の子とペアリングしているかチェック（1親:1子制限）
    const { data: parentExistingRelation } = await supabase
      .from('relationships')
      .select('*')
      .eq('parent_id', pairingCode.parent_id);

    if (parentExistingRelation && parentExistingRelation.length > 0) {
      return res.status(409).json({ 
        error: 'Parent already paired with another child',
        message: '親は1人の子とのみペアリングできます。既存のペアリングを解除してから再試行してください。'
      });
    }

    // 親子関係を作成
    const { data: relationship, error: relationError } = await supabase
      .from('relationships')
      .insert([{
        parent_id: pairingCode.parent_id,
        child_id: childId,
        nickname: nickname || '親',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (relationError) {
      console.error('Relationship creation error:', relationError);
      return res.status(500).json({ error: 'Failed to create relationship' });
    }

    // ペアリングコードを削除（使用済み）
    await supabase
      .from('pairing_codes')
      .delete()
      .eq('code', code);

    res.status(201).json({
      success: true,
      relationship,
      message: 'ペアリングが完了しました！'
    });

  } catch (error) {
    console.error('Use pairing code error:', error);
    
    // JWTエラーの場合は401を返す
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
}