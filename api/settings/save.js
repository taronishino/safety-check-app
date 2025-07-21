// Vercel Serverless Function - ユーザー設定保存 API
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  console.log('User settings save function started');
  
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

    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Invalid settings data' });
    }

    console.log('Saving settings for user:', userId, 'Settings:', settings);

    // 設定を個別に保存
    const settingsToSave = [
      {
        user_id: userId,
        setting_name: 'location_sharing',
        setting_value: settings.location ? 'enabled' : 'disabled'
      },
      {
        user_id: userId,
        setting_name: 'manual_safety_reports',
        setting_value: settings.manualReport ? 'enabled' : 'disabled'
      },
      {
        user_id: userId,
        setting_name: 'emergency_checks',
        setting_value: settings.emergency ? 'enabled' : 'disabled'
      }
    ];

    // 既存の設定を削除してから新しい設定を挿入
    const { error: deleteError } = await supabase
      .from('user_settings')
      .delete()
      .eq('user_id', userId)
      .in('setting_name', ['location_sharing', 'manual_safety_reports', 'emergency_checks']);

    if (deleteError) {
      console.error('Settings delete error:', deleteError);
      // 削除エラーは無視して継続（初回保存時は削除するものがない）
    }

    // 新しい設定を挿入
    const { data: insertedSettings, error: insertError } = await supabase
      .from('user_settings')
      .insert(settingsToSave)
      .select();

    if (insertError) {
      console.error('Settings insert error:', insertError);
      return res.status(500).json({ 
        error: 'Failed to save settings',
        debug: insertError.message 
      });
    }

    console.log('Settings saved successfully:', insertedSettings);

    res.status(200).json({
      success: true,
      message: 'Settings saved successfully',
      settings: {
        location_sharing: settings.location,
        manual_safety_reports: settings.manualReport,
        emergency_checks: settings.emergency
      }
    });

  } catch (error) {
    console.error('Save settings error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // JWTエラーの場合は401を返す
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      debug: error.message
    });
  }
}