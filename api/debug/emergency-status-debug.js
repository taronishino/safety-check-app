// emergency/status の詳細デバッグAPI
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const authHeader = req.headers.authorization;
    
    let debugInfo = {
      hasAuthHeader: !!authHeader,
      authHeaderValue: authHeader || 'none',
      tokenInfo: null,
      decodedToken: null,
      queryResults: {}
    };

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      debugInfo.tokenInfo = {
        length: token.length,
        prefix: token.substring(0, 10) + '...'
      };

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        debugInfo.decodedToken = {
          userId: decoded.userId,
          email: decoded.email,
          iat: decoded.iat,
          exp: decoded.exp
        };

        const parentId = decoded.userId;

        // クエリ1: parent_idのみでフィルタ
        const { data: data1, error: error1 } = await supabase
          .from('emergency_requests')
          .select('*')
          .eq('parent_id', parentId);

        debugInfo.queryResults.byParentId = {
          count: data1?.length || 0,
          error: error1?.message || null,
          sample: data1?.[0] || null
        };

        // クエリ2: parent_id + status
        const { data: data2, error: error2 } = await supabase
          .from('emergency_requests')
          .select('*')
          .eq('parent_id', parentId)
          .eq('status', 'pending');

        debugInfo.queryResults.byParentIdAndStatus = {
          count: data2?.length || 0,
          error: error2?.message || null,
          sample: data2?.[0] || null
        };

        // クエリ3: 文字列として比較
        const { data: data3, error: error3 } = await supabase
          .from('emergency_requests')
          .select('*')
          .eq('parent_id', String(parentId))
          .eq('status', 'pending');

        debugInfo.queryResults.byParentIdStringAndStatus = {
          count: data3?.length || 0,
          error: error3?.message || null,
          sample: data3?.[0] || null
        };

        // クエリ4: parent_id 13を直接指定
        const { data: data4, error: error4 } = await supabase
          .from('emergency_requests')
          .select('*')
          .eq('parent_id', 13)
          .eq('status', 'pending');

        debugInfo.queryResults.directParent13 = {
          count: data4?.length || 0,
          error: error4?.message || null,
          sample: data4?.[0] || null
        };

      } catch (jwtError) {
        debugInfo.jwtError = jwtError.message;
      }
    }

    return res.status(200).json({
      success: true,
      debug: debugInfo,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}