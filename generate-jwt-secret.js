// JWT_SECRET生成スクリプト
import crypto from 'crypto';

// 32バイト（256ビット）のランダムな秘密鍵を生成
const secret = crypto.randomBytes(32).toString('hex');

console.log('===========================================');
console.log('🔐 JWT_SECRET for Production Environment');
console.log('===========================================');
console.log('');
console.log(secret);
console.log('');
console.log('⚠️  この値を安全に保管してください！');
console.log('📋 Vercelの環境変数 JWT_SECRET に設定します');
console.log('===========================================');