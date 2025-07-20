const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const db = require('../database/db');
const { checkFeatureAccess, recordFeatureUsage } = require('../middleware/featureCheck');

// 位置情報を更新
router.post('/update', checkFeatureAccess('location_sharing'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude, accuracy, address, location_type = 'manual' } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: '緯度と経度が必要です' });
    }

    // 以前の位置情報を非現在に設定
    db.run(
      'UPDATE user_locations SET is_current = 0 WHERE user_id = ?',
      [userId]
    );

    // 新しい位置情報を追加
    const result = db.run(
      `INSERT INTO user_locations 
       (user_id, latitude, longitude, accuracy, address, location_type, is_current)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [userId, latitude, longitude, accuracy, address, location_type]
    );

    // 機能使用量を記録
    await recordFeatureUsage(userId, 'location_sharing');

    logger.info(`Location updated for user ${userId}`, {
      latitude,
      longitude,
      accuracy,
      location_type
    });

    res.json({ 
      success: true,
      message: '位置情報を更新しました',
      location_id: result.id
    });
  } catch (error) {
    logger.error('Error updating location:', error);
    res.status(500).json({ error: '位置情報の更新に失敗しました' });
  }
});

// 現在の位置情報を取得
router.get('/current', async (req, res) => {
  try {
    const userId = req.user.id;

    const location = db.queryOne(
      `SELECT * FROM user_locations 
       WHERE user_id = ? AND is_current = 1
       ORDER BY timestamp DESC LIMIT 1`,
      [userId]
    );

    if (!location) {
      return res.json({ location: null });
    }

    res.json({ location });
  } catch (error) {
    logger.error('Error fetching current location:', error);
    res.status(500).json({ error: '位置情報の取得に失敗しました' });
  }
});

// 家族の位置情報を取得（子用）
router.get('/family', async (req, res) => {
  try {
    const childId = req.user.id;

    // 関係性を取得して親のIDを取得
    const relationships = db.query(
      `SELECT r.parent_id, u.name as parent_name, rns.nickname, rns.relationship_type
       FROM relationships r
       JOIN users u ON r.parent_id = u.id
       LEFT JOIN relationship_notification_settings rns ON r.id = rns.relationship_id
       WHERE r.child_id = ? AND r.status = 'active'`,
      [childId]
    );

    const familyLocations = [];

    for (const rel of relationships) {
      // 位置情報共有設定を確認
      const locationSettings = db.queryOne(
        'SELECT * FROM location_settings WHERE user_id = ?',
        [rel.parent_id]
      );

      if (locationSettings && locationSettings.enable_location_sharing) {
        // 現在の位置情報を取得
        const location = db.queryOne(
          `SELECT * FROM user_locations 
           WHERE user_id = ? AND is_current = 1
           ORDER BY timestamp DESC LIMIT 1`,
          [rel.parent_id]
        );

        familyLocations.push({
          parent_id: rel.parent_id,
          parent_name: rel.parent_name,
          nickname: rel.nickname,
          relationship_type: rel.relationship_type,
          location: location || null,
          sharing_enabled: true
        });
      } else {
        familyLocations.push({
          parent_id: rel.parent_id,
          parent_name: rel.parent_name,
          nickname: rel.nickname,
          relationship_type: rel.relationship_type,
          location: null,
          sharing_enabled: false
        });
      }
    }

    res.json({ family_locations: familyLocations });
  } catch (error) {
    logger.error('Error fetching family locations:', error);
    res.status(500).json({ error: '家族の位置情報取得に失敗しました' });
  }
});

// 位置情報設定を取得
router.get('/settings', async (req, res) => {
  try {
    const userId = req.user.id;
    
    let settings = db.queryOne(
      'SELECT * FROM location_settings WHERE user_id = ?',
      [userId]
    );

    // 設定が存在しない場合はデフォルト値を返す
    if (!settings) {
      settings = {
        user_id: userId,
        enable_location_sharing: false,
        share_with_family: true,
        location_update_interval: 300,
        emergency_location_sharing: true
      };
    }

    res.json(settings);
  } catch (error) {
    logger.error('Error fetching location settings:', error);
    res.status(500).json({ error: '位置情報設定の取得に失敗しました' });
  }
});

// 位置情報設定を更新
router.put('/settings', async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      enable_location_sharing, 
      share_with_family, 
      location_update_interval,
      emergency_location_sharing 
    } = req.body;

    // 既存の設定を確認
    const existing = db.queryOne(
      'SELECT user_id FROM location_settings WHERE user_id = ?',
      [userId]
    );

    if (existing) {
      // 更新
      db.run(
        `UPDATE location_settings 
         SET enable_location_sharing = ?, 
             share_with_family = ?,
             location_update_interval = ?,
             emergency_location_sharing = ?,
             updated_at = datetime('now')
         WHERE user_id = ?`,
        [
          enable_location_sharing !== undefined ? (enable_location_sharing ? 1 : 0) : 0,
          share_with_family !== undefined ? (share_with_family ? 1 : 0) : 1,
          location_update_interval || 300,
          emergency_location_sharing !== undefined ? (emergency_location_sharing ? 1 : 0) : 1,
          userId
        ]
      );
    } else {
      // 新規作成
      db.run(
        `INSERT INTO location_settings 
         (user_id, enable_location_sharing, share_with_family, location_update_interval, emergency_location_sharing)
         VALUES (?, ?, ?, ?, ?)`,
        [
          userId,
          enable_location_sharing !== undefined ? (enable_location_sharing ? 1 : 0) : 0,
          share_with_family !== undefined ? (share_with_family ? 1 : 0) : 1,
          location_update_interval || 300,
          emergency_location_sharing !== undefined ? (emergency_location_sharing ? 1 : 0) : 1
        ]
      );
    }

    res.json({ 
      success: true,
      message: '位置情報設定を更新しました'
    });
  } catch (error) {
    logger.error('Error updating location settings:', error);
    res.status(500).json({ error: '位置情報設定の更新に失敗しました' });
  }
});

// 緊急時の位置情報共有
router.post('/emergency-share', checkFeatureAccess('emergency_location'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude, accuracy, message } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: '緯度と経度が必要です' });
    }

    // 緊急位置情報を保存
    db.run(
      'UPDATE user_locations SET is_current = 0 WHERE user_id = ?',
      [userId]
    );

    db.run(
      `INSERT INTO user_locations 
       (user_id, latitude, longitude, accuracy, location_type, is_current)
       VALUES (?, ?, ?, ?, 'emergency', 1)`,
      [userId, latitude, longitude, accuracy]
    );

    logger.info(`Emergency location shared by user ${userId}`, {
      latitude,
      longitude,
      message
    });

    res.json({ 
      success: true,
      message: '緊急位置情報を共有しました'
    });
  } catch (error) {
    logger.error('Error sharing emergency location:', error);
    res.status(500).json({ error: '緊急位置情報の共有に失敗しました' });
  }
});

module.exports = router;