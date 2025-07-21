// emergency_checks テーブル確認API
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // emergency_checks テーブルの確認
    const { data: checks, error: checksError } = await supabase
      .from('emergency_checks')
      .select('*')
      .limit(5);

    // subscriptions テーブルの確認
    const { data: subs, error: subsError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', 10)
      .single();

    return res.status(200).json({
      success: true,
      emergency_checks_table: {
        exists: !checksError,
        error: checksError?.message || null,
        sample_data: checks || []
      },
      subscriptions_table: {
        exists: !subsError,
        error: subsError?.message || null,
        user_10_subscription: subs || null
      }
    });

  } catch (error) {
    return res.status(200).json({
      error: error.message,
      debug: 'Table check failed'
    });
  }
}