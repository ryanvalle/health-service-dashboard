const express = require('express');
const { body, param, validationResult } = require('express-validator');
const Endpoint = require('../models/Endpoint');
const CheckResult = require('../models/CheckResult');
const HealthCheckService = require('../services/HealthCheckService');
const OpenAIService = require('../services/OpenAIService');
const schedulerService = require('../services/SchedulerService');

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
 * /api/endpoints:
 *   get:
 *     summary: Get all endpoints
 *     tags: [Endpoints]
 *     responses:
 *       200:
 *         description: List of all endpoints
 */
router.get('/', async (req, res) => {
  try {
    const endpoints = await Endpoint.findAll();
    
    // Get latest check result for each endpoint
    const endpointsWithStatus = await Promise.all(
      endpoints.map(async (endpoint) => {
        const latestCheck = await CheckResult.getLatestByEndpointId(endpoint.id);
        const stats = await CheckResult.getStats(endpoint.id, 7);
        return {
          ...endpoint,
          latest_check: latestCheck,
          stats_7d: stats
        };
      })
    );

    res.json(endpointsWithStatus);
  } catch (error) {
    console.error('Error fetching endpoints:', error);
    res.status(500).json({ error: 'Failed to fetch endpoints' });
  }
});

/**
 * @swagger
 * /api/endpoints/{id}:
 *   get:
 *     summary: Get a single endpoint by UUID
 *     tags: [Endpoints]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 */
router.get('/:id', [
  param('id').isUUID()
], validate, async (req, res) => {
  try {
    const endpoint = await Endpoint.findById(req.params.id);
    if (!endpoint) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }

    const latestCheck = await CheckResult.getLatestByEndpointId(endpoint.id);
    const stats = await CheckResult.getStats(endpoint.id, 30);

    res.json({
      ...endpoint,
      latest_check: latestCheck,
      stats_30d: stats
    });
  } catch (error) {
    console.error('Error fetching endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch endpoint' });
  }
});

/**
 * @swagger
 * /api/endpoints:
 *   post:
 *     summary: Create a new endpoint
 *     tags: [Endpoints]
 */
router.post('/', [
  body('name').notEmpty().trim(),
  body('url').isURL(),
  body('method').optional().isIn(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD']),
  body('timeout').optional().isInt({ min: 1000, max: 300000 }),
  body('check_frequency').optional().isInt({ min: 1 }),
  body('response_time_threshold').optional().isInt({ min: 0 })
], validate, async (req, res) => {
  try {
    const endpoint = await Endpoint.create(req.body);
    
    // Schedule the new endpoint
    schedulerService.scheduleEndpoint(endpoint);

    res.status(201).json(endpoint);
  } catch (error) {
    console.error('Error creating endpoint:', error);
    res.status(500).json({ error: 'Failed to create endpoint' });
  }
});

/**
 * @swagger
 * /api/endpoints/{id}:
 *   put:
 *     summary: Update an endpoint
 *     tags: [Endpoints]
 */
router.put('/:id', [
  param('id').isUUID(),
  body('name').optional().notEmpty().trim(),
  body('url').optional().isURL(),
  body('method').optional().isIn(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD']),
  body('timeout').optional().isInt({ min: 1000, max: 300000 }),
  body('check_frequency').optional().isInt({ min: 1 }),
  body('response_time_threshold').optional().isInt({ min: 0 })
], validate, async (req, res) => {
  try {
    const endpoint = await Endpoint.update(req.params.id, req.body);
    if (!endpoint) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }

    // Reschedule the endpoint
    await schedulerService.rescheduleEndpoint(endpoint.id);

    res.json(endpoint);
  } catch (error) {
    console.error('Error updating endpoint:', error);
    res.status(500).json({ error: 'Failed to update endpoint' });
  }
});

/**
 * @swagger
 * /api/endpoints/{id}:
 *   delete:
 *     summary: Delete an endpoint
 *     tags: [Endpoints]
 */
router.delete('/:id', [
  param('id').isUUID()
], validate, async (req, res) => {
  try {
    // Unschedule the endpoint
    schedulerService.unscheduleEndpoint(req.params.id);

    const success = await Endpoint.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }

    res.json({ message: 'Endpoint deleted successfully' });
  } catch (error) {
    console.error('Error deleting endpoint:', error);
    res.status(500).json({ error: 'Failed to delete endpoint' });
  }
});

/**
 * @swagger
 * /api/endpoints/{id}/check:
 *   post:
 *     summary: Manually trigger a health check
 *     tags: [Endpoints]
 */
router.post('/:id/check', [
  param('id').isUUID()
], validate, async (req, res) => {
  try {
    const endpoint = await Endpoint.findById(req.params.id);
    if (!endpoint) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }

    const result = await HealthCheckService.executeCheck(endpoint);
    res.json(result);
  } catch (error) {
    console.error('Error executing health check:', error);
    res.status(500).json({ error: 'Failed to execute health check' });
  }
});

/**
 * @swagger
 * /api/endpoints/{id}/history:
 *   get:
 *     summary: Get check history for an endpoint
 *     tags: [Endpoints]
 */
router.get('/:id/history', [
  param('id').isUUID()
], validate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const results = await CheckResult.findByEndpointId(req.params.id, limit);
    res.json(results);
  } catch (error) {
    console.error('Error fetching check history:', error);
    res.status(500).json({ error: 'Failed to fetch check history' });
  }
});

/**
 * @swagger
 * /api/endpoints/{id}/check-results/{checkId}/analyze:
 *   post:
 *     summary: Analyze a failed check result using OpenAI
 *     tags: [Endpoints]
 */
router.post('/:id/check-results/:checkId/analyze', [
  param('id').isUUID(),
  param('checkId').isInt()
], validate, async (req, res) => {
  try {
    // Verify endpoint exists
    const endpoint = await Endpoint.findById(req.params.id);
    if (!endpoint) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }

    // Get the check result
    const checkResult = await CheckResult.findById(parseInt(req.params.checkId));
    if (!checkResult) {
      return res.status(404).json({ error: 'Check result not found' });
    }

    // Verify the check result belongs to the endpoint
    if (checkResult.endpoint_id !== endpoint.id) {
      return res.status(400).json({ error: 'Check result does not belong to this endpoint' });
    }

    // Check if OpenAI is configured
    const isConfigured = await OpenAIService.isConfigured();
    if (!isConfigured) {
      return res.status(400).json({ 
        error: 'OpenAI analysis is not enabled or configured. Please configure OpenAI settings first.' 
      });
    }

    // Analyze the check result
    const analysis = await OpenAIService.analyzeCheckResult(endpoint, checkResult);
    
    // Store the analysis
    await OpenAIService.storeAnalysis(checkResult.id, analysis);

    res.json({
      analysis,
      analyzed_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error analyzing check result:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze check result' });
  }
});

module.exports = router;
