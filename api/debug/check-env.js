// デバッグ用: 環境変数とテーブルチェック
import { createClient } from '@supabase/supabase-js';

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

  const debug = {
    env: {
      SUPABASE_URL: process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing',
      SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? '✅ Set' : '❌ Missing',
      JWT_SECRET: process.env.JWT_SECRET ? '✅ Set' : '❌ Missing',
      NODE_ENV: process.env.NODE_ENV || 'Not set'
    },
    database: {
      connection: false,
      tables: [],
      user_settings_exists: false
    }
  };

  // Supabase接続テスト
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    try {
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
      
      // テーブル一覧取得
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
      
      if (!tablesError && tables) {
        debug.database.connection = true;
        debug.database.tables = tables.map(t => t.table_name);
        debug.database.user_settings_exists = tables.some(t => t.table_name === 'user_settings');
      } else {
        debug.database.error = tablesError?.message || 'Unknown error';
      }
    } catch (error) {
      debug.database.error = error.message;
    }
  }

  res.status(200).json(debug);
}