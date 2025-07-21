// Vercel Serverless Function - 設定テスト API
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  console.log('Test settings function started');
  
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
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    console.log('Testing settings for user:', user_id);

    // 1. user_settingsテーブルの確認
    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user_id);

    // 2. 親子関係の確認
    const { data: childRelationships, error: childRelError } = await supabase
      .from('relationships')
      .select('*')
      .eq('child_id', user_id);

    const { data: parentRelationships, error: parentRelError } = await supabase
      .from('relationships')
      .select('*')
      .eq('parent_id', user_id);

    // 3. サブスクリプションの確認
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user_id);

    // 4. テスト用設定を挿入
    const testSetting = {
      user_id: parseInt(user_id),
      setting_name: 'test_setting',
      setting_value: 'test_value',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: insertResult, error: insertError } = await supabase
      .from('user_settings')
      .insert(testSetting)
      .select();

    // 5. テスト設定を削除
    const { error: deleteError } = await supabase
      .from('user_settings')
      .delete()
      .eq('user_id', user_id)
      .eq('setting_name', 'test_setting');

    res.status(200).json({
      success: true,
      user_id: parseInt(user_id),
      userSettings,
      childRelationships,
      parentRelationships, 
      subscriptions,
      test_insert: {
        success: !insertError,
        error: insertError?.message,
        result: insertResult
      },
      test_delete: {
        success: !deleteError,
        error: deleteError?.message
      },
      errors: {
        settingsError: settingsError?.message,
        childRelError: childRelError?.message,
        parentRelError: parentRelError?.message,
        subError: subError?.message
      }
    });

  } catch (error) {
    console.error('Test settings error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    res.status(500).json({ 
      error: 'Internal server error',
      debug: error.message
    });
  }
}