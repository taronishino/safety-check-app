const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/auth');

// Routes
const authRoutes = require('./routes/auth');
const activityRoutes = require('./routes/activity');
const pairingRoutes = require('./routes/pairing');
const notificationRoutes = require('./routes/notification');
const multiParentNotificationRoutes = require('./routes/multiParentNotification');

const app = express();
const PORT = process.env.PORT || 3000;

// データベース接続
const db = require('./database/db');

// データベース初期化
async function initializeDatabase() {
  try {
    await db.connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Database connection failed', error);
    process.exit(1);
  }
}

// セキュリティ設定
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  },
}));

// レート制限
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 最大100リクエスト
  message: {
    error: 'リクエストが多すぎます。しばらく待ってから再試行してください。'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// CORS設定
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ミドルウェア
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静的ファイル配信
app.use(express.static('public'));

// ログ記録
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
  });
  next();
});

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/activity', authMiddleware, activityRoutes);
app.use('/api/pairing', authMiddleware, pairingRoutes);
app.use('/api/notification', authMiddleware, notificationRoutes);
app.use('/api/multi-parent', authMiddleware, multiParentNotificationRoutes);

// 404 ハンドラー（APIルートのみ）
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'エンドポイントが見つかりません',
    path: req.originalUrl,
  });
});

// エラーハンドラー
app.use(errorHandler);

// サーバー起動
async function startServer() {
  await initializeDatabase();
  
  app.listen(PORT, () => {
    logger.info(`サーバーが起動しました: http://localhost:${PORT}`);
    logger.info(`環境: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer();

// プロセス終了ハンドラー
process.on('SIGTERM', () => {
  logger.info('SIGTERM受信。サーバーを終了します...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT受信。サーバーを終了します...');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未処理のPromise拒否:', { reason, promise });
});

process.on('uncaughtException', (error) => {
  logger.error('未処理の例外:', error);
  process.exit(1);
});

module.exports = app;