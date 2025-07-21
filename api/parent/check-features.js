// Vercel Serverless Function - 親側機能アクセス確認 API
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  console.log('Parent feature check function started');
  
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

    console.log('Checking features for parent:', parentId);

    // 親に関連付けられた子を取得
    const { data: relationships, error: relError } = await supabase
      .from('relationships')
      .select('child_id')
      .eq('parent_id', parentId);

    if (relError) {
      console.error('Relationships fetch error:', relError);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!relationships || relationships.length === 0) {
      // 子がいない場合は基本機能のみ
      return res.status(200).json({
        available_features: {
          emergency_checks: false,
          location_sharing: false,
          manual_reports: false
        },
        subscription: {
          plan_type: 'basic',
          status: 'active',
          is_trial_active: false
        },
        message: 'No child relationships found'
      });
    }

    // 関連する子のプレミアムプラン状態を確認
    const childIds = relationships.map(rel => rel.child_id);
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('plan_type, status, user_id, trial_end')
      .in('user_id', childIds);

    if (subError) {
      console.error('Subscriptions fetch error:', subError);
      return res.status(500).json({ error: 'Database error' });
    }

    // いずれかの子がプレミアムプランかチェック
    let hasPremiumChild = false;
    let hasTrialChild = false;

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

    const hasAccess = hasPremiumChild || hasTrialChild;

    // 機能利用可能性を返す
    res.status(200).json({
      available_features: {
        emergency_checks: hasAccess,
        location_sharing: hasAccess,
        manual_reports: hasAccess  // 親側安否報告
      },
      subscription: {
        plan_type: hasAccess ? 'premium' : 'basic',
        status: 'active',
        is_trial_active: hasTrialChild
      },
      child_relationships: relationships.length,
      premium_children: hasPremiumChild ? 1 : 0
    });

  } catch (error) {
    console.error('Parent feature check error:', {
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