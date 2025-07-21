// シンプルな親子関係確認API
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // JWT認証
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No auth header' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    console.log('Simple relationships API - User ID:', userId);

    // シンプルなクエリ - JOINなし
    const { data: relationships, error } = await supabase
      .from('relationships')
      .select('*')
      .eq('child_id', userId);

    console.log('Query result - error:', error);
    console.log('Query result - data:', relationships);

    if (error) {
      return res.status(200).json({
        error: error.message,
        userId: userId,
        debug: 'Query failed'
      });
    }

    return res.status(200).json({
      success: true,
      userId: userId,
      relationships: relationships,
      count: relationships?.length || 0
    });

  } catch (error) {
    console.error('Simple relationships API error:', error);
    return res.status(500).json({
      error: error.message,
      debug: 'Server error'
    });
  }
}