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
 * /api/endpoints/export:
 *   get:
 *     summary: Export endpoint configurations
 *     tags: [Endpoints]
 *     parameters:
 *       - in: query
 *         name: ids
 *         schema:
 *           type: string
 *         description: Comma-separated list of endpoint UUIDs to export. If not provided, all endpoints are exported.
 */
router.get('/export', async (req, res) => {
  try {
    let endpoints;
    
    if (req.query.ids) {
      // Export specific endpoints
      const ids = req.query.ids.split(',').map(id => id.trim());
      endpoints = await Promise.all(
        ids.map(id => Endpoint.findById(id))
      );
      // Filter out any null results (endpoints not found)
      endpoints = endpoints.filter(e => e !== null);
    } else {
      // Export all endpoints
      endpoints = await Endpoint.findAll();
    }

    // Remove system fields that shouldn't be exported
    const exportData = endpoints.map(endpoint => {
      const { latest_check, stats_7d, stats_30d, created_at, updated_at, ...exportEndpoint } = endpoint;
      return exportEndpoint;
    });

    // Create export object with schema version
    const exportObject = {
      schema_version: '1.0',
      exported_at: new Date().toISOString(),
      endpoints: exportData
    };

    res.json(exportObject);
  } catch (error) {
    console.error('Error exporting endpoints:', error);
    res.status(500).json({ error: 'Failed to export endpoints' });
  }
});

/**
 * @swagger
 * /api/endpoints/import:
 *   post:
 *     summary: Import endpoint configurations
 *     tags: [Endpoints]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               schema_version:
 *                 type: string
 *               endpoints:
 *                 type: array
 */
router.post('/import', async (req, res) => {
  try {
    const { schema_version, endpoints } = req.body;

    // Validate schema
    if (!schema_version || schema_version !== '1.0') {
      return res.status(400).json({ 
        error: 'Invalid or unsupported schema version. Expected version 1.0' 
      });
    }

    if (!Array.isArray(endpoints)) {
      return res.status(400).json({ 
        error: 'Invalid import data: endpoints must be an array' 
      });
    }

    // Validate each endpoint
    const validationErrors = [];
    endpoints.forEach((endpoint, index) => {
      if (!endpoint.name || typeof endpoint.name !== 'string') {
        validationErrors.push(`Endpoint ${index}: name is required and must be a string`);
      }
      if (!endpoint.url || typeof endpoint.url !== 'string') {
        validationErrors.push(`Endpoint ${index}: url is required and must be a string`);
      }
      if (endpoint.method && !['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'].includes(endpoint.method)) {
        validationErrors.push(`Endpoint ${index}: invalid method ${endpoint.method}`);
      }
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validationErrors
      });
    }

    // Import endpoints
    const importResults = {
      successful: [],
      failed: []
    };

    for (const endpointData of endpoints) {
      try {
        // Remove id if it exists to create a new endpoint with a new UUID
        const { id, ...dataWithoutId } = endpointData;
        
        const newEndpoint = await Endpoint.create(dataWithoutId);
        
        // Schedule the new endpoint
        schedulerService.scheduleEndpoint(newEndpoint);
        
        importResults.successful.push({
          name: newEndpoint.name,
          id: newEndpoint.id,
          url: newEndpoint.url
        });
      } catch (error) {
        importResults.failed.push({
          name: endpointData.name,
          url: endpointData.url,
          error: error.message
        });
      }
    }

    res.json({
      message: 'Import completed',
      summary: {
        total: endpoints.length,
        successful: importResults.successful.length,
        failed: importResults.failed.length
      },
      results: importResults
    });
  } catch (error) {
    console.error('Error importing endpoints:', error);
    res.status(500).json({ error: 'Failed to import endpoints' });
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

/**
 * @swagger
 * /api/endpoints/{id}/compare:
 *   post:
 *     summary: Compare two check results using OpenAI
 *     tags: [Endpoints]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - checkId1
 *               - checkId2
 *             properties:
 *               checkId1:
 *                 type: integer
 *                 description: ID of the first check result to compare
 *               checkId2:
 *                 type: integer
 *                 description: ID of the second check result to compare
 */
router.post('/:id/compare', [
  param('id').isUUID(),
  body('checkId1').isInt(),
  body('checkId2').isInt()
], validate, async (req, res) => {
  try {
    const { checkId1, checkId2 } = req.body;

    // Verify endpoint exists
    const endpoint = await Endpoint.findById(req.params.id);
    if (!endpoint) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }

    // Get both check results
    const checkResult1 = await CheckResult.findById(parseInt(checkId1));
    if (!checkResult1) {
      return res.status(404).json({ error: 'First check result not found' });
    }

    const checkResult2 = await CheckResult.findById(parseInt(checkId2));
    if (!checkResult2) {
      return res.status(404).json({ error: 'Second check result not found' });
    }

    // Verify both check results belong to the endpoint
    if (checkResult1.endpoint_id !== endpoint.id) {
      return res.status(400).json({ error: 'First check result does not belong to this endpoint' });
    }

    if (checkResult2.endpoint_id !== endpoint.id) {
      return res.status(400).json({ error: 'Second check result does not belong to this endpoint' });
    }

    // Check if OpenAI is configured
    const isConfigured = await OpenAIService.isConfigured();
    if (!isConfigured) {
      return res.status(400).json({ 
        error: 'OpenAI analysis is not enabled or configured. Please configure OpenAI settings first.' 
      });
    }

    // Compare the responses
    const comparison = await OpenAIService.compareResponses(endpoint, checkResult1, checkResult2);

    res.json({
      comparison,
      compared_at: new Date().toISOString(),
      checkResult1: {
        id: checkResult1.id,
        timestamp: checkResult1.timestamp,
        status_code: checkResult1.status_code,
        is_healthy: checkResult1.is_healthy
      },
      checkResult2: {
        id: checkResult2.id,
        timestamp: checkResult2.timestamp,
        status_code: checkResult2.status_code,
        is_healthy: checkResult2.is_healthy
      }
    });
  } catch (error) {
    console.error('Error comparing check results:', error);
    res.status(500).json({ error: error.message || 'Failed to compare check results' });
  }
});

/**
 * @swagger
 * /api/check-results/{id}:
 *   delete:
 *     summary: Delete a specific check result
 *     tags: [Check Results]
 */
router.delete('/check-results/:id', [
  param('id').isInt()
], validate, async (req, res) => {
  try {
    const checkId = parseInt(req.params.id);
    
    // Get the check result to verify it exists and get its endpoint_id
    const checkResult = await CheckResult.findById(checkId);
    if (!checkResult) {
      return res.status(404).json({ error: 'Check result not found' });
    }

    // Delete the check result
    const success = await CheckResult.delete(checkId);
    if (!success) {
      return res.status(404).json({ error: 'Check result not found' });
    }

    res.json({ message: 'Check result deleted successfully' });
  } catch (error) {
    console.error('Error deleting check result:', error);
    res.status(500).json({ error: 'Failed to delete check result' });
  }
});

module.exports = router;
