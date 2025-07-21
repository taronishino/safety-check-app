// Vercel Serverless Function - アクティビティ記録API
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

    const { 
      last_activity_at, 
      device_info = 'unknown',
      is_auto = false,
      location_lat = null,
      location_lng = null,
      location_address = null,
      battery_level = null
    } = req.body;

    if (!last_activity_at) {
      return res.status(400).json({ error: 'last_activity_at is required' });
    }

    // アクティビティを記録
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .insert({
        user_id: userId,
        type: is_auto ? 'auto_heartbeat' : 'heartbeat',
        message: is_auto ? '自動検出されたアクティビティ' : '手動報告',
        location_lat,
        location_lng,
        location_address,
        created_at: last_activity_at
      })
      .select()
      .single();

    if (activityError) {
      console.error('Activity insert error:', activityError);
      return res.status(500).json({ error: 'Failed to record activity' });
    }

    // ユーザーの最終活動時間を更新
    const { error: updateError } = await supabase
      .from('users')
      .update({
        last_activity: last_activity_at,
        battery_level: battery_level || null,
        device_info: device_info
      })
      .eq('id', userId);

    if (updateError) {
      console.error('User update error:', updateError);
    }

    res.status(200).json({
      success: true,
      activity: activity,
      message: is_auto ? 'アクティビティを自動記録しました' : '安否報告を記録しました'
    });

  } catch (error) {
    console.error('Activity API error:', error);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
}