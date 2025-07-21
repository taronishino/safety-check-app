// デバッグ用: 親側の詳細ステータス確認
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
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

    // 1. 親子関係を取得
    const { data: relationships, error: relError } = await supabase
      .from('relationships')
      .select('child_id')
      .eq('parent_id', parentId);

    // 2. 子のサブスクリプション状況を取得
    let childSubscriptions = [];
    
    if (relationships && relationships.length > 0) {
      const childIds = relationships.map(rel => rel.child_id);
      
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('user_id, plan_type, status, trial_end')
        .in('user_id', childIds);
      
      
      childSubscriptions = subs || [];
    }

    // 3. デバッグ情報をまとめる
    const debug = {
      parent_id: parentId,
      relationships: relationships || [],
      child_subscriptions: childSubscriptions,
      analysis: {
        has_children: relationships && relationships.length > 0,
        children_count: relationships ? relationships.length : 0,
        premium_children: childSubscriptions.filter(s => s.plan_type === 'premium' && s.status === 'active').length,
        should_allow_manual_reports: false
      }
    };

    // 4. 最終判定（1親:1子の新仕様）
    const childIds = relationships.map(rel => rel.child_id);
    const targetChildId = childIds[childIds.length - 1]; // 最後（最新）の子のみを使用
    
    // メインの子のプレミアムプラン状態
    const targetChildSub = childSubscriptions.find(s => s.user_id === targetChildId);
    const hasChildPremium = targetChildSub && targetChildSub.plan_type === 'premium' && targetChildSub.status === 'active';
    
    debug.analysis.should_allow_manual_reports = false; // Feature removed
    debug.analysis.premium_access = hasChildPremium;
    debug.analysis.target_child_id = targetChildId;
    debug.analysis.target_child_premium = hasChildPremium;
    debug.analysis.note = 'Manual safety reports feature removed. Using 1-parent:1-child design';

    res.status(200).json(debug);

  } catch (error) {
    console.error('Debug API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}