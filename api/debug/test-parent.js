// Vercel Serverless Function - 親側データ確認テスト API
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  console.log('Parent debug test function started');
  
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

    console.log('Testing data for parent:', parentId);

    // 1. 親の情報を確認
    const { data: parentUser, error: parentError } = await supabase
      .from('users')
      .select('*')
      .eq('id', parentId)
      .single();

    if (parentError) {
      console.error('Parent user fetch error:', parentError);
    }

    // 2. 親子関係を確認
    const { data: relationships, error: relError } = await supabase
      .from('relationships')
      .select('*')
      .eq('parent_id', parentId);

    if (relError) {
      console.error('Relationships fetch error:', relError);
    }

    // 3. 子の情報とサブスクリプションを確認
    let childrenData = [];
    if (relationships && relationships.length > 0) {
      const childIds = relationships.map(rel => rel.child_id);
      
      const { data: children, error: childError } = await supabase
        .from('users')
        .select('*')
        .in('id', childIds);

      const { data: subscriptions, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .in('user_id', childIds);

      childrenData = {
        children: children || [],
        subscriptions: subscriptions || [],
        childError,
        subError
      };
    }

    // デバッグ情報を返す
    res.status(200).json({
      debug_info: {
        parent_id: parentId,
        parent_user: parentUser,
        parent_error: parentError,
        relationships: relationships || [],
        relationships_error: relError,
        children_data: childrenData,
        environment: {
          supabase_url: supabaseUrl ? 'SET' : 'NOT SET',
          supabase_key: supabaseKey ? 'SET' : 'NOT SET',
          jwt_secret: process.env.JWT_SECRET ? 'SET' : 'NOT SET'
        }
      }
    });

  } catch (error) {
    console.error('Debug test error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    res.status(500).json({ 
      error: 'Internal server error',
      debug: error.message,
      name: error.name
    });
  }
}