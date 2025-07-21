// emergency_checks テーブル構造確認API
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
    // テスト用の挿入を試行
    const testInsert = {
      child_id: 10,
      parent_id: 13,
      message: 'テスト緊急確認',
      status: 'pending'
    };

    console.log('Testing insert with:', testInsert);

    const { data: result, error: insertError } = await supabase
      .from('emergency_checks')
      .insert(testInsert)
      .select()
      .single();

    console.log('Test insert result:', { result, insertError });

    // 既存のデータも確認
    const { data: existing, error: selectError } = await supabase
      .from('emergency_checks')
      .select('*')
      .limit(5);

    return res.status(200).json({
      success: true,
      test_insert: {
        success: !insertError,
        error: insertError?.message || null,
        data: result
      },
      existing_records: {
        success: !selectError,
        error: selectError?.message || null,
        data: existing || []
      }
    });

  } catch (error) {
    console.error('Test error:', error);
    return res.status(500).json({
      error: error.message,
      debug: 'Test failed'
    });
  }
}