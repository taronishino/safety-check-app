// Vercel Serverless Function - 子側：親の安否報告取得 API
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  console.log('Child get parent reports function started');
  
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
    // JWT認証
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No valid authorization header' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const childId = decoded.userId;

    console.log('Getting parent reports for child:', childId);

    // 子に関連付けられた親を取得
    const { data: relationships, error: relError } = await supabase
      .from('relationships')
      .select('parent_id')
      .eq('child_id', childId);

    if (relError) {
      console.error('Relationships fetch error:', relError);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!relationships || relationships.length === 0) {
      return res.status(200).json({
        reports: [],
        message: 'No parent relationships found'
      });
    }

    // 親のIDリストを取得
    const parentIds = relationships.map(rel => rel.parent_id);
    console.log('Found parent IDs:', parentIds);

    // 子の最後の既読時刻を取得
    const { data: lastReadMarker, error: readError } = await supabase
      .from('activities')
      .select('created_at')
      .eq('user_id', childId)
      .eq('type', 'parent_reports_read')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let lastReadTime = null;
    if (!readError && lastReadMarker) {
      lastReadTime = lastReadMarker.created_at;
      console.log('Last read time:', lastReadTime);
    }

    // 親の安否報告を取得（最新10件）
    let reportsQuery = supabase
      .from('activities')
      .select(`
        id,
        user_id,
        type,
        message,
        device_info,
        metadata,
        created_at,
        last_activity_at
      `)
      .in('user_id', parentIds)
      .eq('type', 'safety_report')
      .order('created_at', { ascending: false })
      .limit(10);

    // 既読時刻より新しいもののみ取得
    if (lastReadTime) {
      reportsQuery = reportsQuery.gt('created_at', lastReadTime);
    }

    const { data: reports, error: reportsError } = await reportsQuery;

    if (reportsError) {
      console.error('Reports fetch error:', reportsError);
      return res.status(500).json({ error: 'Database error' });
    }

    console.log('Found parent reports:', reports?.length || 0);

    // 親の名前を取得
    const { data: parents, error: parentsError } = await supabase
      .from('users')
      .select('id, name')
      .in('id', parentIds);

    // レポートに親の名前を追加
    const reportsWithNames = (reports || []).map(report => {
      const parent = parents?.find(p => p.id === report.user_id);
      return {
        ...report,
        parent_name: parent?.name || '親',
        status_display: getStatusDisplay(report.metadata?.report_status, report.message)
      };
    });

    res.status(200).json({
      success: true,
      reports: reportsWithNames,
      count: reportsWithNames.length
    });

  } catch (error) {
    console.error('Get parent reports error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // JWTエラーの場合は401を返す
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      debug: error.message
    });
  }
}

// ステータス表示を取得
function getStatusDisplay(status, message) {
  const statusMap = {
    'fine': '😊 元気',
    'ok': '👍 問題なし',
    'need_help': '🆘 助けが必要'
  };
  
  return statusMap[status] || message || '📱 報告';
}