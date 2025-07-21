// Vercel Serverless Function - 安否報告送信 API
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
    const parentId = decoded.userId;

    const { message } = req.body;

    // アクティビティとして安否報告を記録
    const { data: activity, error: actError } = await supabase
      .from('activities')
      .insert([{
        user_id: parentId,
        activity_type: 'manual_safety_report',
        metadata: {
          message: message || '私は元気です',
          reported_at: new Date().toISOString()
        }
      }])
      .select()
      .single();

    if (actError) {
      console.error('Activity creation error:', actError);
      return res.status(500).json({ error: 'Failed to record safety report' });
    }

    // 子供たちに通知（親子関係から子供を検索）
    const { data: relationships } = await supabase
      .from('relationships')
      .select('child_id')
      .eq('parent_id', parentId);

    if (relationships && relationships.length > 0) {
      // 各子供の手動安否報告設定を確認
      const childIds = relationships.map(rel => rel.child_id);
      
      const { data: childSettings } = await supabase
        .from('user_settings')
        .select('user_id, setting_value')
        .in('user_id', childIds)
        .eq('setting_name', 'manual_safety_reports');

      // 各子供への通知（手動安否報告が有効な子供のみ）
      for (const rel of relationships) {
        const childSetting = childSettings?.find(setting => setting.user_id === rel.child_id);
        const isEnabled = childSetting ? childSetting.setting_value === 'enabled' : true; // デフォルトは有効
        
        if (isEnabled) {
          console.log(`Notifying child ${rel.child_id} about safety report from parent ${parentId}`);
        } else {
          console.log(`Skipping notification to child ${rel.child_id} - manual safety reports disabled`);
        }
      }
    }

    res.status(201).json({
      success: true,
      message: '安否報告を送信しました',
      activity
    });

  } catch (error) {
    console.error('Safety report error:', error);
    
    // JWTエラーの場合は401を返す
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
}