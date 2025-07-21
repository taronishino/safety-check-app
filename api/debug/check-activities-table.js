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
    console.log('Starting activities table check...');

    // 代替方法: 実際のデータを1件取得してみる
    let sampleData = null;
    let sampleError = null;
    try {
      const result = await supabase
        .from('activities')
        .select('*')
        .limit(1);
      sampleData = result.data;
      sampleError = result.error;
    } catch (err) {
      sampleError = err;
    }

    // テーブルが存在するかテスト
    let testData = null;
    let testError = null;
    try {
      const result = await supabase
        .from('activities')
        .select('user_id, activity_type, last_activity_at, device_info, metadata, created_at')
        .limit(1);
      testData = result.data;
      testError = result.error;
    } catch (err) {
      testError = err;
    }

    // 簡単な挿入テスト（エラーを確認するため）
    const testInsertData = {
      user_id: 999999, // 存在しないユーザーID（テスト用）
      activity_type: 'test',
      last_activity_at: new Date().toISOString(),
      device_info: 'test-device',
      metadata: JSON.stringify({ test: true })
    };

    let insertTest = null;
    let insertError = null;
    try {
      const result = await supabase
        .from('activities')
        .insert(testInsertData)
        .select();
      insertTest = result.data;
      insertError = result.error;
    } catch (err) {
      insertError = err;
    }

    console.log('Activities table check completed');

    // 結果を返す
    res.status(200).json({
      table_exists: !testError,
      sample_data: {
        data: sampleData,
        error: sampleError?.message || sampleError?.toString()
      },
      test_select: {
        data: testData,
        error: testError?.message || testError?.toString()
      },
      test_insert: {
        data: insertTest,
        error: insertError?.message || insertError?.toString(),
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