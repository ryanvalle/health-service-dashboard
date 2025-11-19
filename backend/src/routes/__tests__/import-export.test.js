const request = require('supertest');
const express = require('express');
const endpointsRouter = require('../endpoints');
const Endpoint = require('../../models/Endpoint');

jest.mock('../../models/Endpoint');
jest.mock('../../models/CheckResult');
jest.mock('../../services/SchedulerService', () => ({
  scheduleEndpoint: jest.fn(),
  rescheduleEndpoint: jest.fn(),
  unscheduleEndpoint: jest.fn()
}));

const app = express();
app.use(express.json());
app.use('/api/endpoints', endpointsRouter);

describe('Endpoints Routes - Import/Export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/endpoints/export', () => {
    const mockEndpoints = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test API 1',
        url: 'https://api.example.com/health',
        method: 'GET',
        headers: { 'Authorization': 'Bearer token' },
        expected_status_codes: [200],
        json_path_assertions: [],
        response_time_threshold: 5000,
        check_frequency: 5,
        cron_schedule: null,
        timeout: 30000,
        uptime_threshold: 90,
        tags: ['production'],
        folder: null,
        is_active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        latest_check: { status: 'healthy' },
        stats_7d: { uptime: 99.9 }
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Test API 2',
        url: 'https://api2.example.com/health',
        method: 'POST',
        headers: {},
        expected_status_codes: [200, 201],
        json_path_assertions: [{ path: 'status', operator: 'equals', value: 'ok' }],
        response_time_threshold: 3000,
        check_frequency: 10,
        cron_schedule: null,
        timeout: 30000,
        uptime_threshold: 95,
        tags: ['staging'],
        folder: 'services',
        is_active: true,
        created_at: '2023-01-02T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z'
      }
    ];

    it('should export all endpoints when no ids are provided', async () => {
      Endpoint.findAll.mockResolvedValue(mockEndpoints);

      const response = await request(app)
        .get('/api/endpoints/export')
        .expect(200);

      expect(response.body).toHaveProperty('schema_version', '1.0');
      expect(response.body).toHaveProperty('exported_at');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body.endpoints).toHaveLength(2);
      
      // Verify system fields are removed
      expect(response.body.endpoints[0]).not.toHaveProperty('created_at');
      expect(response.body.endpoints[0]).not.toHaveProperty('updated_at');
      expect(response.body.endpoints[0]).not.toHaveProperty('latest_check');
      expect(response.body.endpoints[0]).not.toHaveProperty('stats_7d');
      
      // Verify endpoint data is preserved
      expect(response.body.endpoints[0].name).toBe('Test API 1');
      expect(response.body.endpoints[0].url).toBe('https://api.example.com/health');
      expect(response.body.endpoints[1].name).toBe('Test API 2');
    });

    it('should export specific endpoints when ids are provided', async () => {
      const specificEndpoint = mockEndpoints[0];
      Endpoint.findById.mockImplementation((id) => {
        if (id === '550e8400-e29b-41d4-a716-446655440000') {
          return Promise.resolve(specificEndpoint);
        }
        return Promise.resolve(null);
      });

      const response = await request(app)
        .get('/api/endpoints/export?ids=550e8400-e29b-41d4-a716-446655440000')
        .expect(200);

      expect(response.body.endpoints).toHaveLength(1);
      expect(response.body.endpoints[0].name).toBe('Test API 1');
      expect(Endpoint.findById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should export multiple specific endpoints', async () => {
      Endpoint.findById.mockImplementation((id) => {
        const endpoint = mockEndpoints.find(e => e.id === id);
        return Promise.resolve(endpoint || null);
      });

      const response = await request(app)
        .get('/api/endpoints/export?ids=550e8400-e29b-41d4-a716-446655440000,550e8400-e29b-41d4-a716-446655440001')
        .expect(200);

      expect(response.body.endpoints).toHaveLength(2);
      expect(Endpoint.findById).toHaveBeenCalledTimes(2);
    });

    it('should handle export error gracefully', async () => {
      Endpoint.findAll.mockRejectedValue(new Error('Database error'));

      await request(app)
        .get('/api/endpoints/export')
        .expect(500)
        .expect({ error: 'Failed to export endpoints' });
    });
  });

  describe('POST /api/endpoints/import', () => {
    const validImportData = {
      schema_version: '1.0',
      exported_at: '2023-01-01T00:00:00Z',
      endpoints: [
        {
          name: 'Imported API',
          url: 'https://imported.example.com/health',
          method: 'GET',
          headers: {},
          expected_status_codes: [200],
          json_path_assertions: [],
          response_time_threshold: 5000,
          check_frequency: 5,
          timeout: 30000,
          uptime_threshold: 90,
          tags: [],
          folder: null,
          is_active: true
        }
      ]
    };

    it('should successfully import valid endpoints', async () => {
      const createdEndpoint = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        ...validImportData.endpoints[0]
      };
      
      Endpoint.create.mockResolvedValue(createdEndpoint);

      const response = await request(app)
        .post('/api/endpoints/import')
        .send(validImportData)
        .expect(200);

      expect(response.body.message).toBe('Import completed');
      expect(response.body.summary.total).toBe(1);
      expect(response.body.summary.successful).toBe(1);
      expect(response.body.summary.failed).toBe(0);
      expect(response.body.results.successful).toHaveLength(1);
      expect(response.body.results.successful[0].name).toBe('Imported API');
      expect(Endpoint.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Imported API',
          url: 'https://imported.example.com/health'
        })
      );
    });

    it('should reject invalid schema version', async () => {
      const invalidData = {
        schema_version: '2.0',
        endpoints: []
      };

      await request(app)
        .post('/api/endpoints/import')
        .send(invalidData)
        .expect(400)
        .expect({
          error: 'Invalid or unsupported schema version. Expected version 1.0'
        });
    });

    it('should reject missing schema version', async () => {
      const invalidData = {
        endpoints: []
      };

      await request(app)
        .post('/api/endpoints/import')
        .send(invalidData)
        .expect(400)
        .expect({
          error: 'Invalid or unsupported schema version. Expected version 1.0'
        });
    });

    it('should reject non-array endpoints', async () => {
      const invalidData = {
        schema_version: '1.0',
        endpoints: 'not an array'
      };

      await request(app)
        .post('/api/endpoints/import')
        .send(invalidData)
        .expect(400)
        .expect({
          error: 'Invalid import data: endpoints must be an array'
        });
    });

    it('should validate endpoint data', async () => {
      const invalidData = {
        schema_version: '1.0',
        endpoints: [
          {
            url: 'https://example.com'
            // missing name
          },
          {
            name: 'Test',
            // missing url
          },
          {
            name: 'Test 3',
            url: 'https://example3.com',
            method: 'INVALID'
          }
        ]
      };

      const response = await request(app)
        .post('/api/endpoints/import')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toHaveLength(3);
    });

    it('should handle partial import failures', async () => {
      const importData = {
        schema_version: '1.0',
        endpoints: [
          {
            name: 'Success API',
            url: 'https://success.example.com',
            method: 'GET'
          },
          {
            name: 'Fail API',
            url: 'https://fail.example.com',
            method: 'GET'
          }
        ]
      };

      Endpoint.create.mockImplementation((data) => {
        if (data.name === 'Success API') {
          return Promise.resolve({
            id: '550e8400-e29b-41d4-a716-446655440000',
            ...data
          });
        } else {
          return Promise.reject(new Error('Database constraint violation'));
        }
      });

      const response = await request(app)
        .post('/api/endpoints/import')
        .send(importData)
        .expect(200);

      expect(response.body.summary.total).toBe(2);
      expect(response.body.summary.successful).toBe(1);
      expect(response.body.summary.failed).toBe(1);
      expect(response.body.results.successful).toHaveLength(1);
      expect(response.body.results.failed).toHaveLength(1);
      expect(response.body.results.failed[0].error).toBe('Database constraint violation');
    });

    it('should remove id from imported endpoints to create new UUIDs', async () => {
      const dataWithId = {
        schema_version: '1.0',
        endpoints: [
          {
            id: 'old-uuid-123',
            name: 'Test API',
            url: 'https://test.example.com',
            method: 'GET'
          }
        ]
      };

      Endpoint.create.mockResolvedValue({
        id: 'new-uuid-456',
        name: 'Test API',
        url: 'https://test.example.com',
        method: 'GET'
      });

      await request(app)
        .post('/api/endpoints/import')
        .send(dataWithId)
        .expect(200);

      expect(Endpoint.create).toHaveBeenCalledWith(
        expect.not.objectContaining({ id: 'old-uuid-123' })
      );
      expect(Endpoint.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test API',
          url: 'https://test.example.com'
        })
      );
    });

    it('should handle import error gracefully', async () => {
      // Mock a server error during the creation of endpoint
      const validData = {
        schema_version: '1.0',
        endpoints: [
          {
            name: 'Test',
            url: 'https://test.com',
            method: 'GET'
          }
        ]
      };

      Endpoint.create.mockRejectedValue(new Error('Unexpected server error'));

      const response = await request(app)
        .post('/api/endpoints/import')
        .send(validData)
        .expect(200); // Import doesn't fail, it just reports failures

      expect(response.body.summary.failed).toBe(1);
      expect(response.body.results.failed[0].error).toBe('Unexpected server error');
    });
  });
});
