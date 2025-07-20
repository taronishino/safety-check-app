const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const db = require('../database/db');
const { checkFeatureAccess, recordFeatureUsage } = require('../middleware/featureCheck');
const logger = require('../utils/logger');

/**
 * POST /api/activity
 * 親の活動データを送信
 */
router.post('/', checkFeatureAccess('activity_detection'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { last_activity_at, battery_level, device_info } = req.body;

    if (!last_activity_at) {
      return res.status(400).json({ error: '最終活動時刻が必要です' });
    }

    // 活動データを保存
    const activityId = uuidv4();
    
    db.run(
      `INSERT INTO activities 
       (id, user_id, last_activity_at, battery_level, device_info)
       VALUES (?, ?, ?, ?, ?)`,
      [activityId, userId, last_activity_at, battery_level, device_info]
    );

    // 機能使用量を記録
    await recordFeatureUsage(userId, 'activity_detection');

    logger.info(`Activity recorded for user ${userId}`, {
      activityId,
      battery_level,
      device_info
    });

    res.status(201).json({
      success: true,
      message: '活動データを保存しました',
      activity_id: activityId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Activity save error:', error);
    res.status(500).json({
      error: '活動データの保存に失敗しました',
      details: error.message
    });
  }
});

module.exports = router;