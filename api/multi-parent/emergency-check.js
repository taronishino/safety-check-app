// Vercel Serverless Function - 緊急確認送信 API
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
    const childId = decoded.userId;

    const { parent_id, message } = req.body;

    console.log('=== Emergency Check Debug ===');
    console.log('Child ID:', childId);
    console.log('Request body:', req.body);
    console.log('Parent ID:', parent_id);
    console.log('Message:', message);

    if (!parent_id || !message) {
      return res.status(400).json({ error: 'Parent ID and message are required' });
    }

    // プラン制限チェック
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', childId)
      .single();

    const now = new Date();
    const isTrialActive = subscription?.trial_end && new Date(subscription.trial_end) > now;
    const isPremium = subscription?.plan_type === 'premium' || isTrialActive;

    if (!isPremium) {
      return res.status(403).json({
        error: 'この機能はプレミアム機能です',
        reason: 'plan_limitation',
        current_plan: subscription?.plan_type || 'basic',
        required_plan: 'premium'
      });
    }

    // 親子関係の確認
    console.log('Checking relationship:', { parent_id, child_id: childId });
    const { data: relationship, error: relError } = await supabase
      .from('relationships')
      .select('*')
      .eq('parent_id', parent_id)
      .eq('child_id', childId)
      .single();
      
    console.log('Relationship check result:', { relationship, relError });

    if (relError || !relationship) {
      return res.status(403).json({ error: 'No relationship found' });
    }

    // 同じ親への古いpending依頼をクリーンアップ
    console.log('Cleaning up old pending requests for parent:', parent_id);
    await supabase
      .from('emergency_requests')
      .update({ status: 'expired' })
      .eq('parent_id', parent_id)
      .eq('status', 'pending');

    // 緊急確認を記録（emergency_requestsテーブル使用）
    console.log('Inserting emergency request:', {
      requester_id: childId,
      parent_id: parent_id,
      message: message,
      status: 'pending'
    });

    const { data: emergencyCheck, error: insertError } = await supabase
      .from('emergency_requests')
      .insert({
        requester_id: childId,
        parent_id: parent_id,
        message: message,
        status: 'pending'
      })
      .select()
      .single();

    console.log('Insert result:', { emergencyCheck, insertError });

    if (insertError) {
      console.error('Emergency check insert error:', insertError);
      return res.status(500).json({ error: 'Failed to record emergency check' });
    }

    // 親の情報を取得
    const { data: parentData } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', parent_id)
      .single();

    // 子の情報を取得
    const { data: childData } = await supabase
      .from('users')
      .select('name')
      .eq('id', childId)
      .single();

    // プッシュ通知は将来の実装として、現在は親アプリでのポーリングに依存
    console.log(`Emergency check created: ID ${emergencyCheck.id} from child ${childId} to parent ${parent_id}`);

    res.status(200).json({
      success: true,
      message: '緊急確認を送信しました',
      emergency_check: emergencyCheck,
      sent_to: {
        parent_id: parent_id,
        parent_name: parentData?.name || 'Unknown',
        parent_email: parentData?.email || ''
      },
      timestamp: emergencyCheck.created_at
    });

  } catch (error) {
    console.error('Emergency check error:', error);
    console.error('Stack trace:', error.stack);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.status(500).json({ error: 'Internal server error', debug: error.message });
  }
}