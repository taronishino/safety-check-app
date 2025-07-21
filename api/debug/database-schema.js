// データベース全体の構造確認API
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
    console.log('=== Database Schema Check ===');

    // 全テーブル一覧を取得
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_table_list', {});

    let schemaInfo = {};

    // 主要テーブルの構造を個別確認
    const tablesToCheck = [
      'users', 
      'relationships', 
      'subscriptions', 
      'pairing_codes',
      'activities',
      'emergency_requests',
      'emergency_checks'
    ];

    for (const tableName of tablesToCheck) {
      try {
        // テーブルの最初の1レコードを取得してカラム構造を確認
        const { data: sample, error: sampleError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)
          .single();

        schemaInfo[tableName] = {
          exists: !sampleError,
          error: sampleError?.message || null,
          columns: sample ? Object.keys(sample) : [],
          sample_data: sample || null
        };
      } catch (error) {
        schemaInfo[tableName] = {
          exists: false,
          error: error.message,
          columns: [],
          sample_data: null
        };
      }
    }

    // 各テーブルのレコード数も確認
    const recordCounts = {};
    for (const tableName of tablesToCheck) {
      if (schemaInfo[tableName].exists) {
        try {
          const { count, error } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });
          
          recordCounts[tableName] = error ? null : count;
        } catch (error) {
          recordCounts[tableName] = null;
        }
      }
    }

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      schema_info: schemaInfo,
      record_counts: recordCounts,
      summary: {
        total_tables_checked: tablesToCheck.length,
        existing_tables: Object.keys(schemaInfo).filter(t => schemaInfo[t].exists),
        missing_tables: Object.keys(schemaInfo).filter(t => !schemaInfo[t].exists)
      }
    });

  } catch (error) {
    console.error('Database schema check error:', error);
    return res.status(500).json({
      error: error.message,
      debug: 'Schema check failed'
    });
  }
}