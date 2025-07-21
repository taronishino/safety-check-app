// デバッグ用 - 親子関係確認API
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
    console.log('=== Relationships Debug ===');
    
    const { parent_id } = req.query;

    // すべての関係を取得（parent_idが指定されていればフィルタ）
    let query = supabase
      .from('relationships')
      .select(`
        *,
        parent:parent_id(id, email, name),
        child:child_id(id, email, name)
      `)
      .order('created_at', { ascending: false });

    if (parent_id) {
      query = query.eq('parent_id', parent_id);
    }

    const { data: relationships, error: relError } = await query;

    if (relError) {
      console.error('Relationships fetch error:', relError);
      return res.status(500).json({ 
        error: 'Failed to fetch relationships',
        details: relError.message 
      });
    }

    // アクティブなペアリングコードも取得
    const { data: activeCodes, error: codeError } = await supabase
      .from('pairing_codes')
      .select('*')
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      relationships: {
        total: relationships?.length || 0,
        details: relationships || []
      },
      active_pairing_codes: {
        total: activeCodes?.length || 0,
        codes: activeCodes?.map(code => ({
          code: code.code,
          parent_id: code.parent_id,
          expires_at: code.expires_at,
          minutes_left: Math.round((new Date(code.expires_at) - new Date()) / (1000 * 60))
        })) || []
      },
      debug_info: {
        parent_id_filter: parent_id || 'none',
        supabase_connected: true
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