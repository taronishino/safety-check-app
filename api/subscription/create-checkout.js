// Vercel Serverless Function - Stripeチェックアウトセッション作成
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Stripe初期化（テストモード）
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2023-10-16',
});

export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
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
    const userId = decoded.userId;
    const userEmail = decoded.email;

    // 価格設定（月額プラン）
    const priceId = process.env.STRIPE_PRICE_ID || 'price_dummy';
    
    // Stripeチェックアウトセッション作成
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      customer_email: userEmail,
      client_reference_id: userId.toString(),
      success_url: `${process.env.APP_URL || 'https://safety-check-app.vercel.app'}/child.html?payment=success`,
      cancel_url: `${process.env.APP_URL || 'https://safety-check-app.vercel.app'}/child.html?payment=cancelled`,
      metadata: {
        user_id: userId,
        plan_type: 'premium'
      }
    });

    // チェックアウトURLを返す
    res.status(200).json({
      success: true,
      checkout_url: session.url,
      session_id: session.id
    });

  } catch (error) {
    console.error('Checkout session creation error:', error);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}