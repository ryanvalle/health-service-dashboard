const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { DEFAULT_PROMPT } = require('../config/openai-config');

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

/**
 * @swagger
 * /api/settings/openai:
 *   put:
 *     summary: Update OpenAI settings
 *     tags: [Settings]
 */
router.put('/openai', [
  body('openai_enabled').optional().isBoolean(),
  body('openai_api_key').optional().isString(),
  body('openai_response_limit').optional().isInt({ min: 100, max: 4000 }),
  body('openai_custom_prompt').optional().isString()
], validate, async (req, res) => {
  try {
    const updates = [];
    
    if (req.body.openai_enabled !== undefined) {
      updates.push({
        key: 'openai_enabled',
        value: req.body.openai_enabled.toString()
      });
    }
    
    if (req.body.openai_api_key !== undefined) {
      updates.push({
        key: 'openai_api_key',
        value: req.body.openai_api_key
      });
    }
    
    if (req.body.openai_response_limit !== undefined) {
      updates.push({
        key: 'openai_response_limit',
        value: req.body.openai_response_limit.toString()
      });
    }
    
    if (req.body.openai_custom_prompt !== undefined) {
      updates.push({
        key: 'openai_custom_prompt',
        value: req.body.openai_custom_prompt
      });
    }

    for (const update of updates) {
      await db.run(
        'UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
        [update.value, update.key]
      );
    }

    res.json({ 
      message: 'OpenAI settings updated successfully',
      updated: updates.map(u => u.key)
    });
  } catch (error) {
    console.error('Error updating OpenAI settings:', error);
    res.status(500).json({ error: 'Failed to update OpenAI settings' });
  }
});

/**
 * @swagger
 * /api/settings/openai/default-prompt:
 *   get:
 *     summary: Get the default OpenAI prompt
 *     tags: [Settings]
 */
router.get('/openai/default-prompt', (req, res) => {
  res.json({ default_prompt: DEFAULT_PROMPT });
});

module.exports = router;
