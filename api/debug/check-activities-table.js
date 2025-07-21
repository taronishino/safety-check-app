// Vercel Serverless Function - activitiesテーブル構造確認 API
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  console.log('Activities table check function started');
  
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
    // activitiesテーブルの構造を確認
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_columns', { table_name: 'activities' })
      .then(() => null) // RPCが存在しない場合は無視
      .catch(() => null);

    // 代替方法: 実際のデータを1件取得してみる
    const { data: sampleData, error: sampleError } = await supabase
      .from('activities')
      .select('*')
      .limit(1);

    // テーブルが存在するかテスト
    const { data: testData, error: testError } = await supabase
      .from('activities')
      .select('user_id, activity_type, last_activity_at, device_info, metadata, created_at')
      .limit(1);

    // 簡単な挿入テスト（エラーを確認するため）
    const testInsertData = {
      user_id: 999999, // 存在しないユーザーID（テスト用）
      activity_type: 'test',
      last_activity_at: new Date().toISOString(),
      device_info: 'test-device',
      metadata: JSON.stringify({ test: true })
    };

    const { data: insertTest, error: insertError } = await supabase
      .from('activities')
      .insert(testInsertData)
      .select();

    // 結果を返す
    res.status(200).json({
      table_exists: !testError,
      sample_data: {
        data: sampleData,
        error: sampleError?.message
      },
      test_select: {
        data: testData,
        error: testError?.message
      },
      test_insert: {
        data: insertTest,
        error: insertError?.message,
        error_code: insertError?.code,
        error_details: insertError?.details
      },
      test_insert_data: testInsertData
    });

  } catch (error) {
    console.error('Activities table check error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    res.status(500).json({ 
      error: 'Internal server error',
      debug: error.message
    });
  }
}