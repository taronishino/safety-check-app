// Vercel Serverless Function - 位置情報取得 API
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
    const childId = decoded.userId;

    const { parent_id } = req.query;

    if (!parent_id) {
      return res.status(400).json({ error: 'Parent ID is required' });
    }

    // 権限チェック - 親子関係が存在するか確認
    const { data: relationship, error: relError } = await supabase
      .from('relationships')
      .select('*')
      .eq('parent_id', parent_id)
      .eq('child_id', childId)
      .single();

    if (relError || !relationship) {
      return res.status(403).json({ error: 'No relationship found' });
    }

    // 親の最新位置情報を取得
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('location_lat, location_lng, location_address, location_updated_at')
      .eq('id', parent_id)
      .single();

    if (userError) {
      console.error('User location fetch error:', userError);
      return res.status(500).json({ error: 'Failed to fetch location' });
    }

    // 位置情報が未取得の場合
    if (!userData.location_lat || !userData.location_lng) {
      return res.status(404).json({ 
        error: 'Location not available',
        message: '親の位置情報がまだ取得されていません'
      });
    }

    const locationData = {
      latitude: parseFloat(userData.location_lat),
      longitude: parseFloat(userData.location_lng),
      address: userData.location_address || `緯度:${userData.location_lat}, 経度:${userData.location_lng}`,
      last_updated: userData.location_updated_at || new Date().toISOString(),
      accuracy: 10 // メートル（推定値）
    };

    res.status(200).json({
      success: true,
      location: locationData
    });

  } catch (error) {
    console.error('Location fetch error:', error);
    
    // JWTエラーの場合は401を返す
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
}