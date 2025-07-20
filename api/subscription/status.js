// Vercel Serverless Function - サブスクリプション状況取得 API
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
    const userId = decoded.userId;

    // サブスクリプション情報取得
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Subscription fetch error:', error);
      // デフォルトのbasicプランを返す
      return res.status(200).json({
        subscription: {
          plan_type: 'basic',
          status: 'active',
          user_id: userId
        },
        available_features: {
          multiple_parents: false,
          location_sharing: false,
          manual_reports: false,
          emergency_checks: false
        }
      });
    }

    // 利用可能機能を決定
    const isPremium = subscription.plan_type === 'premium';
    const available_features = {
      multiple_parents: isPremium,
      location_sharing: isPremium,
      manual_reports: isPremium,
      emergency_checks: isPremium
    };

    res.status(200).json({
      subscription,
      available_features
    });

  } catch (error) {
    console.error('Subscription status error:', error);
    
    // JWTエラーの場合は401を返す
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
}