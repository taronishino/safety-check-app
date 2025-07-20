// Vercel Serverless Function - サブスクリプションアップグレード API
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

    const { plan_type } = req.body;

    if (!plan_type || !['basic', 'premium'].includes(plan_type)) {
      return res.status(400).json({ error: 'Invalid plan type' });
    }

    // 現在のサブスクリプションを取得
    const { data: currentSub, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      // サブスクリプションが存在しない場合は新規作成
      const { data: newSub, error: createError } = await supabase
        .from('subscriptions')
        .insert([{
          user_id: userId,
          plan_type,
          status: 'active',
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (createError) {
        console.error('Subscription creation error:', createError);
        return res.status(500).json({ error: 'Failed to create subscription' });
      }

      return res.status(201).json({
        success: true,
        subscription: newSub,
        message: `${plan_type === 'premium' ? 'プレミアム' : '無料'}プランを開始しました`
      });
    }

    // 既存のサブスクリプションを更新
    const { data: updatedSub, error: updateError } = await supabase
      .from('subscriptions')
      .update({
        plan_type,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Subscription update error:', updateError);
      return res.status(500).json({ error: 'Failed to update subscription' });
    }

    res.status(200).json({
      success: true,
      subscription: updatedSub,
      message: plan_type === 'premium' 
        ? 'プレミアムプランにアップグレードしました！7日間の無料体験をお楽しみください。'
        : '無料プランに変更しました。'
    });

  } catch (error) {
    console.error('Subscription upgrade error:', error);
    
    // JWTエラーの場合は401を返す
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
}