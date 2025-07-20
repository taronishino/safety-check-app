// Vercel Serverless Function - ユーザー登録 API
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // 既存ユーザーチェック
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // パスワードハッシュ化
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // ユーザー作成
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert([{
        email,
        password_hash: hashedPassword,
        name
      }])
      .select()
      .single();

    if (userError) {
      return res.status(500).json({ error: 'Failed to create user' });
    }

    // デフォルトサブスクリプション作成
    const { error: subError } = await supabase
      .from('subscriptions')
      .insert([{
        user_id: newUser.id,
        plan_type: 'basic',
        status: 'active'
      }]);

    if (subError) {
      console.error('Subscription creation error:', subError);
    }

    // JWT生成
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name
      },
      token,
      subscription: { plan_type: 'basic', status: 'active' }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}