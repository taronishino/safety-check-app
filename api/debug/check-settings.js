// Vercel Serverless Function - 設定確認デバッグ API
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  console.log('Debug settings check function started');
  
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

    console.log('Checking settings for user:', userId);

    // 1. ユーザー設定を確認
    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId);

    // 2. 親子関係を確認（子側の視点から）
    const { data: relationships, error: relError } = await supabase
      .from('relationships')
      .select('*')
      .eq('child_id', userId);

    // 2b. 親子関係を確認（親側の視点から）
    const { data: parentRelationships, error: parentRelError } = await supabase
      .from('relationships')
      .select('*')
      .eq('parent_id', userId);

    // 3. 親のIDを取得
    let parentIds = [];
    if (relationships && relationships.length > 0) {
      parentIds = relationships.map(rel => rel.parent_id);
    }

    // 4. 親側から見た機能確認（親がいる場合）
    let parentFeatureCheck = null;
    if (parentIds.length > 0) {
      try {
        // 親の機能チェックAPIを模擬
        const childIds = [userId];
        
        // プレミアムプラン確認
        const { data: subscriptions } = await supabase
          .from('subscriptions')
          .select('plan_type, status, user_id, trial_end')
          .in('user_id', childIds);

        // 手動安否報告設定確認
        const { data: childSettings } = await supabase
          .from('user_settings')
          .select('user_id, setting_name, setting_value')
          .in('user_id', childIds)
          .eq('setting_name', 'manual_safety_reports');

        let hasPremiumChild = false;
        let hasTrialChild = false;
        let manualReportsEnabled = false;

        if (subscriptions && subscriptions.length > 0) {
          for (const sub of subscriptions) {
            if (sub.plan_type === 'premium' && sub.status === 'active') {
              hasPremiumChild = true;
            }
            if (sub.trial_end && new Date(sub.trial_end) > new Date()) {
              hasTrialChild = true;
            }
          }
        }

        if (childSettings && childSettings.length > 0) {
          for (const setting of childSettings) {
            if (setting.setting_value === 'enabled') {
              manualReportsEnabled = true;
              break;
            }
          }
        } else {
          manualReportsEnabled = true; // デフォルト
        }

        const hasAccess = hasPremiumChild || hasTrialChild;
        const canUseManualReports = hasAccess && manualReportsEnabled;

        parentFeatureCheck = {
          hasPremiumChild,
          hasTrialChild,
          hasAccess,
          manualReportsEnabled,
          canUseManualReports,
          subscriptions,
          childSettings
        };

      } catch (error) {
        parentFeatureCheck = { error: error.message };
      }
    }

    res.status(200).json({
      success: true,
      userId,
      userSettings,
      relationships,
      parentRelationships,
      parentIds,
      parentFeatureCheck,
      settingsError: settingsError?.message,
      relError: relError?.message,
      parentRelError: parentRelError?.message
    });

  } catch (error) {
    console.error('Debug settings check error:', {
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