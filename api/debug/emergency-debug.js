// 緊急確認データベースの詳細デバッグAPI
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
    console.log('=== Emergency Debug API ===');

    // 全ての緊急確認依頼を取得
    const { data: allRequests, error: allError } = await supabase
      .from('emergency_requests')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('All emergency requests:', allRequests);
    
    // pending状態の依頼のみ
    const { data: pendingRequests, error: pendingError } = await supabase
      .from('emergency_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    console.log('Pending emergency requests:', pendingRequests);

    // 関連するユーザー情報
    const userIds = [...new Set([
      ...(allRequests || []).map(r => r.requester_id),
      ...(allRequests || []).map(r => r.parent_id)
    ])];

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', userIds);

    console.log('Related users:', users);

    // 関連するrelationships
    const { data: relationships, error: relError } = await supabase
      .from('relationships')
      .select('*');

    console.log('All relationships:', relationships);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        all_emergency_requests: allRequests || [],
        pending_emergency_requests: pendingRequests || [],
        related_users: users || [],
        all_relationships: relationships || [],
        counts: {
          total_requests: allRequests?.length || 0,
          pending_requests: pendingRequests?.length || 0,
          users: users?.length || 0,
          relationships: relationships?.length || 0
        }
      },
      errors: {
        all_requests_error: allError?.message || null,
        pending_requests_error: pendingError?.message || null,
        users_error: usersError?.message || null,
        relationships_error: relError?.message || null
      }
    });

  } catch (error) {
    console.error('Emergency debug API error:', error);
    return res.status(500).json({
      error: error.message,
      debug: 'Debug API failed'
    });
  }
}