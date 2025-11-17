const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');

const router = express.Router();

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: Get all settings
 *     tags: [Settings]
 */
router.get('/', async (req, res) => {
  try {
    const settings = await db.all('SELECT * FROM settings');
    const settingsObj = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});
    res.json(settingsObj);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * @swagger
 * /api/settings/retention:
 *   put:
 *     summary: Update retention period
 *     tags: [Settings]
 */
router.put('/retention', [
  body('retention_days').isInt({ min: 1, max: 365 })
], validate, async (req, res) => {
  try {
    await db.run(
      'UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
      [req.body.retention_days.toString(), 'retention_days']
    );

    res.json({ 
      retention_days: req.body.retention_days,
      message: 'Retention period updated successfully' 
    });
  } catch (error) {
    console.error('Error updating retention period:', error);
    res.status(500).json({ error: 'Failed to update retention period' });
  }
});

module.exports = router;
