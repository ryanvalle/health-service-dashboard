const request = require('supertest');
const express = require('express');
const endpointsRouter = require('../endpoints');
const Endpoint = require('../../models/Endpoint');
const CheckResult = require('../../models/CheckResult');
const OpenAIService = require('../../services/OpenAIService');

jest.mock('../../models/Endpoint');
jest.mock('../../models/CheckResult');
jest.mock('../../services/OpenAIService');
jest.mock('../../services/SchedulerService', () => ({
  scheduleEndpoint: jest.fn(),
  rescheduleEndpoint: jest.fn(),
  unscheduleEndpoint: jest.fn()
}));

const app = express();
app.use(express.json());
app.use('/api/endpoints', endpointsRouter);

describe('Endpoints Routes - Analysis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/endpoints/:id/check-results/:checkId/analyze', () => {
    const mockEndpoint = {
      id: 'test-uuid-123',
      name: 'Test API',
      url: 'https://api.example.com/health',
      method: 'GET',
      expected_status_codes: [200],
      is_active: true
    };

    const mockCheckResult = {
      id: 1,
      endpoint_id: 'test-uuid-123',
      is_healthy: false,
      status_code: 500,
      response_body: '{"error": "Internal Server Error"}',
      response_time: 1500,
      error_message: 'Expected status 200, got 500',
      timestamp: '2023-01-01T00:00:00Z'
    };

    it('should successfully analyze a check result', async () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      const mockEndpointWithUUID = { ...mockEndpoint, id: validUUID };
      const mockCheckResultWithUUID = { ...mockCheckResult, endpoint_id: validUUID };

      Endpoint.findById.mockResolvedValue(mockEndpointWithUUID);
      CheckResult.findById.mockResolvedValue(mockCheckResultWithUUID);
      OpenAIService.isConfigured.mockResolvedValue(true);
      OpenAIService.analyzeCheckResult.mockResolvedValue(
        'The API returned a 500 error. This indicates an internal server error...'
      );
      OpenAIService.storeAnalysis.mockResolvedValue();

      const response = await request(app)
        .post(`/api/endpoints/${validUUID}/check-results/1/analyze`)
        .expect(200);

      expect(response.body.analysis).toContain('500 error');
      expect(response.body.analyzed_at).toBeDefined();
      expect(OpenAIService.analyzeCheckResult).toHaveBeenCalledWith(mockEndpointWithUUID, mockCheckResultWithUUID);
      expect(OpenAIService.storeAnalysis).toHaveBeenCalledWith(1, expect.any(String));
    });

    it('should return 404 if endpoint not found', async () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      Endpoint.findById.mockResolvedValue(null);

      const response = await request(app)
        .post(`/api/endpoints/${validUUID}/check-results/1/analyze`)
        .expect(404);

      expect(response.body.error).toBe('Endpoint not found');
    });

    it('should return 404 if check result not found', async () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      Endpoint.findById.mockResolvedValue({ ...mockEndpoint, id: validUUID });
      CheckResult.findById.mockResolvedValue(null);

      const response = await request(app)
        .post(`/api/endpoints/${validUUID}/check-results/999/analyze`)
        .expect(404);

      expect(response.body.error).toBe('Check result not found');
    });

    it('should return 400 if check result does not belong to endpoint', async () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      Endpoint.findById.mockResolvedValue({ ...mockEndpoint, id: validUUID });
      CheckResult.findById.mockResolvedValue({
        ...mockCheckResult,
        endpoint_id: 'different-uuid'
      });

      const response = await request(app)
        .post(`/api/endpoints/${validUUID}/check-results/1/analyze`)
        .expect(400);

      expect(response.body.error).toContain('does not belong to this endpoint');
    });

    it('should return 400 if OpenAI is not configured', async () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      const mockCheckResultWithUUID = { ...mockCheckResult, endpoint_id: validUUID };

      Endpoint.findById.mockResolvedValue({ ...mockEndpoint, id: validUUID });
      CheckResult.findById.mockResolvedValue(mockCheckResultWithUUID);
      OpenAIService.isConfigured.mockResolvedValue(false);

      const response = await request(app)
        .post(`/api/endpoints/${validUUID}/check-results/1/analyze`)
        .expect(400);

      expect(response.body.error).toContain('OpenAI analysis is not enabled or configured');
    });

    it('should handle OpenAI service errors', async () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      const mockCheckResultWithUUID = { ...mockCheckResult, endpoint_id: validUUID };

      Endpoint.findById.mockResolvedValue({ ...mockEndpoint, id: validUUID });
      CheckResult.findById.mockResolvedValue(mockCheckResultWithUUID);
      OpenAIService.isConfigured.mockResolvedValue(true);
      OpenAIService.analyzeCheckResult.mockRejectedValue(
        new Error('OpenAI API rate limit exceeded')
      );

      const response = await request(app)
        .post(`/api/endpoints/${validUUID}/check-results/1/analyze`)
        .expect(500);

      expect(response.body.error).toContain('rate limit');
    });

    it('should validate endpoint UUID format', async () => {
      const response = await request(app)
        .post('/api/endpoints/invalid-format/check-results/1/analyze')
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should validate check ID is an integer', async () => {
      const response = await request(app)
        .post('/api/endpoints/550e8400-e29b-41d4-a716-446655440000/check-results/abc/analyze')
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });
  });
});
