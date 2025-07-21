// emergency/status のテスト用API
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
    const parentId = 13; // test1のID

    console.log('Testing emergency status for parent ID:', parentId);
    
    // 直接クエリをテスト
    const { data: allRequests, error: allError } = await supabase
      .from('emergency_requests')
      .select('*')
      .eq('parent_id', parentId);
      
    console.log('All requests for parent 13:', { allRequests, allError });
    
    const { data: pendingRequests, error: pendingError } = await supabase
      .from('emergency_requests')
      .select('*')
      .eq('parent_id', parentId)
      .eq('status', 'pending');
      
    console.log('Pending requests for parent 13:', { pendingRequests, pendingError });
    
    const { data: pendingOrderedRequests, error: orderedError } = await supabase
      .from('emergency_requests')
      .select('*')
      .eq('parent_id', parentId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
      
    console.log('Ordered pending requests for parent 13:', { pendingOrderedRequests, orderedError });

    return res.status(200).json({
      success: true,
      parent_id: parentId,
      all_requests: {
        count: allRequests?.length || 0,
        data: allRequests || [],
        error: allError?.message || null
      },
      pending_requests: {
        count: pendingRequests?.length || 0,
        data: pendingRequests || [],
        error: pendingError?.message || null
      },
      ordered_pending_requests: {
        count: pendingOrderedRequests?.length || 0,
        data: pendingOrderedRequests || [],
        error: orderedError?.message || null
      }
    });

  } catch (error) {
    console.error('Test emergency status error:', error);
    return res.status(500).json({
      error: error.message
    });
  }
}