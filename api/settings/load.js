// Vercel Serverless Function - ユーザー設定読み込み API
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  console.log('User settings load function started');
  
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
    const userId = decoded.userId;

    console.log('Loading settings for user:', userId);

    // ユーザーの設定を取得
    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('setting_name, setting_value')
      .eq('user_id', userId)
      .in('setting_name', ['location_sharing', 'manual_safety_reports', 'emergency_checks']);

    if (settingsError) {
      console.error('Settings load error:', settingsError);
      return res.status(500).json({ 
        error: 'Failed to load settings',
        debug: settingsError.message 
      });
    }

    console.log('Raw settings from database:', userSettings);

    // デフォルト設定
    const defaultSettings = {
      location_sharing: false,
      manual_safety_reports: true,  // デフォルトで有効
      emergency_checks: true        // デフォルトで有効
    };

    // 設定をマッピング
    const settings = { ...defaultSettings };
    
    if (userSettings && userSettings.length > 0) {
      userSettings.forEach(setting => {
        settings[setting.setting_name] = setting.setting_value === 'enabled';
      });
    }

    console.log('Processed settings:', settings);

    res.status(200).json({
      success: true,
      settings: {
        location: settings.location_sharing,
        manualReport: settings.manual_safety_reports,
        emergency: settings.emergency_checks
      }
    });

  } catch (error) {
    console.error('Load settings error:', {
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