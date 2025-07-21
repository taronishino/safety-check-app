// emergency_requests テーブル確認API
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
    // emergency_requests テーブルの既存データを確認
    const { data: existing, error: selectError } = await supabase
      .from('emergency_requests')
      .select('*')
      .limit(5);

    console.log('Emergency requests select:', { existing, selectError });

    // テスト挿入を試行
    const testData = {
      child_id: 10,
      parent_id: 13,
      message: 'テスト緊急確認',
      status: 'pending'
    };

    const { data: insertResult, error: insertError } = await supabase
      .from('emergency_requests')
      .insert(testData)
      .select()
      .single();

    console.log('Emergency requests insert test:', { insertResult, insertError });

    return res.status(200).json({
      success: true,
      table_exists: !selectError,
      select_result: {
        error: selectError?.message || null,
        data: existing || []
      },
      insert_test: {
        success: !insertError,
        error: insertError?.message || null,
        data: insertResult
      }
    });

  } catch (error) {
    console.error('Emergency requests test error:', error);
    return res.status(500).json({
      error: error.message
    });
  }
}