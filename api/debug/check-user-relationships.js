// デバッグ用 - ユーザー関係確認API
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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

  try {
    const { user_id } = req.query;

    // 1. 全ての親子関係を取得
    const { data: allRelationships, error: relError } = await supabase
      .from('relationships')
      .select('*')
      .order('created_at', { ascending: false });

    if (relError) {
      console.error('Relationships fetch error:', relError);
    }

    // 2. ユーザー情報を取得（ID 10, 13を含む）
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email, name, created_at')
      .in('id', [10, 13])
      .order('id');

    if (userError) {
      console.error('Users fetch error:', userError);
    }

    // 3. 特定のchild_id = 10の関係を確認
    const { data: childRelations, error: childError } = await supabase
      .from('relationships')
      .select(`
        *,
        parent:users!parent_id(id, email, name)
      `)
      .eq('child_id', 10);

    if (childError) {
      console.error('Child relations fetch error:', childError);
    }

    // 4. 特定のparent_id = 13の関係を確認
    const { data: parentRelations, error: parentError } = await supabase
      .from('relationships')
      .select(`
        *,
        child:users!child_id(id, email, name)
      `)
      .eq('parent_id', 13);

    if (parentError) {
      console.error('Parent relations fetch error:', parentError);
    }

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      all_relationships: {
        total: allRelationships?.length || 0,
        data: allRelationships || []
      },
      users_10_and_13: users || [],
      child_10_relations: {
        total: childRelations?.length || 0,
        data: childRelations || []
      },
      parent_13_relations: {
        total: parentRelations?.length || 0,
        data: parentRelations || []
      },
      debug_summary: {
        child_10_has_parents: (childRelations?.length || 0) > 0,
        parent_13_has_children: (parentRelations?.length || 0) > 0,
        relationship_exists: allRelationships?.some(r => r.parent_id === 13 && r.child_id === 10) || false
      }
    });

  } catch (error) {
    console.error('Debug API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}