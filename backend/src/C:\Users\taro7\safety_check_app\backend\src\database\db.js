const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class DatabaseManager {
  constructor() {
    this.db = null;
  }

  async connect() {
    try {
      const dbPath = process.env.DB_PATH || './data/database.sqlite';
      const dbDir = path.dirname(dbPath);

      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = new Database(dbPath);
      console.log('Connected to SQLite database');

      this.db.pragma('foreign_keys = ON');
      this.createTables();

      return this.db;
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw error;
    }
  }

  createTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        phone_number TEXT UNIQUE,
        email TEXT UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        last_activity_at DATETIME NOT NULL,
        battery_level INTEGER CHECK (battery_level >= 0 AND battery_level <= 100),
        device_info TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS relationships (
        id TEXT PRIMARY KEY,
        parent_id TEXT REFERENCES users(id),
        child_id TEXT REFERENCES users(id),
        status TEXT DEFAULT 'active',
        relationship_type TEXT DEFAULT 'parent',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(parent_id, child_id)
      )`,

      `CREATE TABLE IF NOT EXISTS notification_settings (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        threshold_hours INTEGER DEFAULT 24,
        enabled BOOLEAN DEFAULT 1,
        fcm_token TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const tableSQL of tables) {
      this.db.exec(tableSQL);
    }

    // 関係性ごとの通知設定テーブル（複数親対応）
    this.db.exec(`CREATE TABLE IF NOT EXISTS relationship_notification_settings (
      id TEXT PRIMARY KEY,
      relationship_id TEXT REFERENCES relationships(id),
      child_id TEXT REFERENCES users(id),
      parent_id TEXT REFERENCES users(id),
      threshold_hours INTEGER DEFAULT 24,
      enabled BOOLEAN DEFAULT 1,
      priority INTEGER DEFAULT 1,
      relationship_type TEXT DEFAULT 'parent',
      nickname TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(relationship_id)
    )`);

    // プッシュ通知購読テーブルを追加
    this.db.exec(`CREATE TABLE IF NOT EXISTS push_subscriptions (
      user_id TEXT PRIMARY KEY REFERENCES users(id),
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 通知履歴テーブルを追加
    this.db.exec(`CREATE TABLE IF NOT EXISTS notification_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id TEXT REFERENCES users(id),
      parent_id TEXT REFERENCES users(id),
      notification_type TEXT NOT NULL,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // ユーザー設定テーブルを追加
    this.db.exec(`CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY REFERENCES users(id),
      enable_daily_report BOOLEAN DEFAULT 1,
      report_button_text TEXT DEFAULT '安否報告',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 位置情報テーブルを追加
    this.db.exec(`CREATE TABLE IF NOT EXISTS user_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT REFERENCES users(id),
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      accuracy REAL,
      address TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_current BOOLEAN DEFAULT 1,
      location_type TEXT DEFAULT 'manual'
    )`);

    // 位置情報設定テーブルを追加
    this.db.exec(`CREATE TABLE IF NOT EXISTS location_settings (
      user_id TEXT PRIMARY KEY REFERENCES users(id),
      enable_location_sharing BOOLEAN DEFAULT 0,
      share_with_family BOOLEAN DEFAULT 1,
      location_update_interval INTEGER DEFAULT 300,
      location_frequency TEXT DEFAULT 'disabled',
      emergency_location_sharing BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // ユーザー契約テーブルを追加
    this.db.exec(`CREATE TABLE IF NOT EXISTS user_subscriptions (
      user_id TEXT PRIMARY KEY REFERENCES users(id),
      plan_type TEXT DEFAULT 'basic',
      subscription_start DATETIME DEFAULT CURRENT_TIMESTAMP,
      subscription_end DATETIME,
      status TEXT DEFAULT 'active',
      trial_end DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 機能使用量管理テーブルを追加
    this.db.exec(`CREATE TABLE IF NOT EXISTS feature_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT REFERENCES users(id),
      feature_name TEXT NOT NULL,
      usage_count INTEGER DEFAULT 0,
      last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
      monthly_limit INTEGER,
      reset_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // プラン機能制限テーブルを追加
    this.db.exec(`CREATE TABLE IF NOT EXISTS plan_features (
      plan_type TEXT,
      feature_name TEXT,
      is_enabled BOOLEAN DEFAULT 0,
      monthly_limit INTEGER DEFAULT -1,
      PRIMARY KEY (plan_type, feature_name)
    )`);

    // デフォルトのプラン機能を設定
    this.db.exec(`INSERT OR IGNORE INTO plan_features (plan_type, feature_name, is_enabled, monthly_limit) VALUES
      ('basic', 'single_parent_monitoring', 1, -1),
      ('basic', 'activity_detection', 1, -1),
      ('basic', 'basic_notifications', 1, -1),
      ('premium', 'multiple_parent_monitoring', 1, -1),
      ('premium', 'manual_safety_report', 1, -1),
      ('premium', 'location_sharing', 1, -1),
      ('premium', 'emergency_location', 1, -1),
      ('premium', 'detailed_analytics', 1, -1),
      ('premium', 'custom_notifications', 1, -1),
      ('premium', 'data_export', 1, 10)
    )`);

    console.log('Database tables created/verified');
  }

  run(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.run(params);
      return { id: result.lastInsertRowid, changes: result.changes };
    } catch (error) {
      throw error;
    }
  }

  query(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.all(params);
    } catch (error) {
      throw error;
    }
  }

  queryOne(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.get(params);
    } catch (error) {
      throw error;
    }
  }

  close() {
    if (this.db) {
      this.db.close();
      console.log('Database connection closed');
    }
  }
}

const database = new DatabaseManager();

module.exports = database;