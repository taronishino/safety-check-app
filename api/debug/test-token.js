// JWT トークンテスト用API
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(200).json({ 
        error: 'No auth header',
        debug: {
          hasAuthHeader: !!authHeader,
          authHeaderValue: authHeader || 'null'
        }
      });
    }

    const token = authHeader.substring(7);
    
    if (!process.env.JWT_SECRET) {
      return res.status(200).json({ 
        error: 'JWT_SECRET not found',
        debug: {
          hasJwtSecret: false
        }
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    return res.status(200).json({
      success: true,
      decoded: decoded,
      debug: {
        hasJwtSecret: !!process.env.JWT_SECRET,
        tokenLength: token.length
      }
    });

  } catch (error) {
    return res.status(200).json({
      error: error.message,
      name: error.name,
      debug: {
        hasJwtSecret: !!process.env.JWT_SECRET
      }
    });
  }
}