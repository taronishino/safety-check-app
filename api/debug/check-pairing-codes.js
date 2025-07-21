// デバッグ用 - ペアリングコード確認API
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== Pairing Codes Debug ===');
    
    // 環境変数チェック
    console.log('Environment check:', {
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
    });

    // 全ペアリングコードを取得
    const { data: codes, error: codesError } = await supabase
      .from('pairing_codes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (codesError) {
      console.error('Pairing codes fetch error:', codesError);
      return res.status(500).json({ 
        error: 'Failed to fetch pairing codes',
        details: codesError.message 
      });
    }

    // 現在時刻と期限切れチェック
    const now = new Date();
    const activeCode = codes?.find(code => 
      !code.used && new Date(code.expires_at) > now
    );

    res.status(200).json({
      success: true,
      timestamp: now.toISOString(),
      total_codes: codes?.length || 0,
      active_codes: codes?.filter(code => 
        !code.used && new Date(code.expires_at) > now
      ).length || 0,
      latest_codes: codes?.map(code => ({
        code: code.code,
        parent_id: code.parent_id,
        expires_at: code.expires_at,
        used: code.used,
        created_at: code.created_at,
        is_expired: new Date(code.expires_at) <= now,
        minutes_until_expiry: Math.round((new Date(code.expires_at) - now) / (1000 * 60))
      })) || [],
      debug_info: {
        supabase_connected: true,
        table_accessible: !codesError
      }
    });

  } catch (error) {
    console.error('Debug API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}