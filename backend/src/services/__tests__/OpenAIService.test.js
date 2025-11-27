const OpenAIService = require('../OpenAIService');
const db = require('../../config/database');
const axios = require('axios');

jest.mock('../../config/database');
jest.mock('axios');

describe('OpenAIService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSettings', () => {
    it('should return OpenAI settings from database', async () => {
      const mockSettings = [
        { key: 'openai_enabled', value: 'true' },
        { key: 'openai_api_key', value: 'sk-test123' },
        { key: 'openai_response_limit', value: '1000' },
        { key: 'openai_custom_prompt', value: 'Custom prompt' }
      ];
      
      db.all.mockResolvedValue(mockSettings);

      const settings = await OpenAIService.getSettings();

      expect(settings).toEqual({
        enabled: true,
        apiKey: 'sk-test123',
        responseLimit: 1000,
        customPrompt: 'Custom prompt'
      });
      expect(db.all).toHaveBeenCalledWith('SELECT * FROM settings WHERE key LIKE "openai_%"');
    });

    it('should handle missing settings with defaults', async () => {
      db.all.mockResolvedValue([]);

      const settings = await OpenAIService.getSettings();

      expect(settings.enabled).toBe(false);
      expect(settings.apiKey).toBe('');
      expect(settings.responseLimit).toBe(1000);
      expect(settings.customPrompt).toBe('');
    });
  });

  describe('isConfigured', () => {
    it('should return true when enabled and API key is set', async () => {
      const mockSettings = [
        { key: 'openai_enabled', value: 'true' },
        { key: 'openai_api_key', value: 'sk-test123' },
        { key: 'openai_response_limit', value: '1000' },
        { key: 'openai_custom_prompt', value: '' }
      ];
      
      db.all.mockResolvedValue(mockSettings);

      const isConfigured = await OpenAIService.isConfigured();

      expect(isConfigured).toBe(true);
    });

    it('should return false when not enabled', async () => {
      const mockSettings = [
        { key: 'openai_enabled', value: 'false' },
        { key: 'openai_api_key', value: 'sk-test123' },
        { key: 'openai_response_limit', value: '1000' },
        { key: 'openai_custom_prompt', value: '' }
      ];
      
      db.all.mockResolvedValue(mockSettings);

      const isConfigured = await OpenAIService.isConfigured();

      expect(isConfigured).toBe(false);
    });

    it('should return false when API key is missing', async () => {
      const mockSettings = [
        { key: 'openai_enabled', value: 'true' },
        { key: 'openai_api_key', value: '' },
        { key: 'openai_response_limit', value: '1000' },
        { key: 'openai_custom_prompt', value: '' }
      ];
      
      db.all.mockResolvedValue(mockSettings);

      const isConfigured = await OpenAIService.isConfigured();

      expect(isConfigured).toBe(false);
    });
  });

  describe('analyzeCheckResult', () => {
    const mockEndpoint = {
      id: 'test-uuid',
      name: 'Test API',
      url: 'https://api.example.com/health',
      method: 'GET',
      headers: { 'Authorization': 'Bearer token123' },
      expected_status_codes: [200],
      response_time_threshold: 5000
    };

    const mockCheckResult = {
      id: 1,
      endpoint_id: 'test-uuid',
      is_healthy: false,
      status_code: 500,
      response_body: '{"error": "Internal Server Error"}',
      response_time: 1500,
      error_message: 'Expected status 200, got 500',
      timestamp: '2023-01-01T00:00:00Z'
    };

    it('should successfully analyze a check result', async () => {
      const mockSettings = [
        { key: 'openai_enabled', value: 'true' },
        { key: 'openai_api_key', value: 'sk-test123' },
        { key: 'openai_response_limit', value: '1000' },
        { key: 'openai_custom_prompt', value: '' }
      ];
      
      db.all.mockResolvedValue(mockSettings);

      const mockOpenAIResponse = {
        data: {
          choices: [
            {
              message: {
                content: 'The API returned a 500 error indicating an internal server error. This suggests...'
              }
            }
          ]
        }
      };

      axios.post.mockResolvedValue(mockOpenAIResponse);

      const analysis = await OpenAIService.analyzeCheckResult(mockEndpoint, mockCheckResult);

      expect(analysis).toContain('500 error');
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          model: 'gpt-3.5-turbo',
          max_tokens: 1000
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk-test123'
          })
        })
      );
    });

    it('should throw error when OpenAI is not enabled', async () => {
      const mockSettings = [
        { key: 'openai_enabled', value: 'false' }
      ];
      
      db.all.mockResolvedValue(mockSettings);

      await expect(
        OpenAIService.analyzeCheckResult(mockEndpoint, mockCheckResult)
      ).rejects.toThrow('OpenAI analysis is not enabled');
    });

    it('should throw error when API key is missing', async () => {
      const mockSettings = [
        { key: 'openai_enabled', value: 'true' },
        { key: 'openai_api_key', value: '' }
      ];
      
      db.all.mockResolvedValue(mockSettings);

      await expect(
        OpenAIService.analyzeCheckResult(mockEndpoint, mockCheckResult)
      ).rejects.toThrow('OpenAI API key is not configured');
    });

    it('should handle invalid API key error', async () => {
      const mockSettings = [
        { key: 'openai_enabled', value: 'true' },
        { key: 'openai_api_key', value: 'sk-invalid' }
      ];
      
      db.all.mockResolvedValue(mockSettings);

      axios.post.mockRejectedValue({
        response: { status: 401, data: { error: 'Invalid API key' } }
      });

      await expect(
        OpenAIService.analyzeCheckResult(mockEndpoint, mockCheckResult)
      ).rejects.toThrow('Invalid OpenAI API key');
    });

    it('should handle rate limit error', async () => {
      const mockSettings = [
        { key: 'openai_enabled', value: 'true' },
        { key: 'openai_api_key', value: 'sk-test123' }
      ];
      
      db.all.mockResolvedValue(mockSettings);

      axios.post.mockRejectedValue({
        response: { status: 429, data: { error: 'Rate limit exceeded' } }
      });

      await expect(
        OpenAIService.analyzeCheckResult(mockEndpoint, mockCheckResult)
      ).rejects.toThrow('OpenAI API rate limit exceeded');
    });

    it('should handle timeout error', async () => {
      const mockSettings = [
        { key: 'openai_enabled', value: 'true' },
        { key: 'openai_api_key', value: 'sk-test123' }
      ];
      
      db.all.mockResolvedValue(mockSettings);

      axios.post.mockRejectedValue({
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded'
      });

      await expect(
        OpenAIService.analyzeCheckResult(mockEndpoint, mockCheckResult)
      ).rejects.toThrow('OpenAI API request timeout');
    });
  });

  describe('prepareAnalysisContext', () => {
    it('should prepare comprehensive analysis context', () => {
      const endpoint = {
        name: 'Test API',
        url: 'https://api.example.com/health',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer secrettoken' },
        expected_status_codes: [200, 201],
        response_time_threshold: 3000,
        json_path_assertions: [
          { path: 'status', operator: 'equals', value: 'ok' }
        ]
      };

      const checkResult = {
        timestamp: '2023-01-01T12:00:00Z',
        status_code: 500,
        response_time: 2000,
        error_message: 'Expected status 200 or 201, got 500',
        response_body: '{"error": "Database connection failed"}'
      };

      const context = OpenAIService.prepareAnalysisContext(endpoint, checkResult);

      expect(context).toContain('Test API');
      expect(context).toContain('https://api.example.com/health');
      expect(context).toContain('POST');
      expect(context).toContain('500');
      expect(context).toContain('2000ms');
      expect(context).toContain('Expected status 200 or 201, got 500');
      expect(context).toContain('Database connection failed');
      expect(context).toContain('Expected Status Codes: 200, 201');
      expect(context).toContain('Response Time Threshold: 3000ms');
    });

    it('should mask sensitive headers', () => {
      const endpoint = {
        name: 'Test',
        url: 'https://api.example.com',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer verylongsecrettoken123',
          'X-API-Key': 'shortkey'
        },
        expected_status_codes: [200]
      };

      const checkResult = {
        timestamp: '2023-01-01T12:00:00Z',
        status_code: 401,
        response_time: 100
      };

      const context = OpenAIService.prepareAnalysisContext(endpoint, checkResult);

      expect(context).toContain('Bear****n123'); // Masked authorization
      expect(context).toContain('****'); // Masked short key
      expect(context).not.toContain('verylongsecrettoken123');
      expect(context).not.toContain('shortkey');
    });

    it('should truncate long response bodies', () => {
      const endpoint = {
        name: 'Test',
        url: 'https://api.example.com',
        method: 'GET',
        expected_status_codes: [200]
      };

      const longBody = 'x'.repeat(3000);
      const checkResult = {
        timestamp: '2023-01-01T12:00:00Z',
        status_code: 200,
        response_time: 100,
        response_body: longBody
      };

      const context = OpenAIService.prepareAnalysisContext(endpoint, checkResult);

      expect(context).toContain('... (truncated)');
      expect(context.length).toBeLessThan(longBody.length + 1000);
    });
  });

  describe('maskSensitiveHeader', () => {
    it('should mask authorization headers', () => {
      expect(OpenAIService.maskSensitiveHeader('Authorization', 'Bearer token123456'))
        .toBe('Bear****3456');
      expect(OpenAIService.maskSensitiveHeader('authorization', 'Basic abc123def456'))
        .toBe('Basi****f456');
    });

    it('should mask API key headers', () => {
      expect(OpenAIService.maskSensitiveHeader('X-API-Key', 'sk-123456789'))
        .toBe('sk-1****6789');
      expect(OpenAIService.maskSensitiveHeader('api-key', 'key123'))
        .toBe('****');
    });

    it('should not mask non-sensitive headers', () => {
      expect(OpenAIService.maskSensitiveHeader('Content-Type', 'application/json'))
        .toBe('application/json');
      expect(OpenAIService.maskSensitiveHeader('User-Agent', 'Mozilla/5.0'))
        .toBe('Mozilla/5.0');
    });
  });

  describe('storeAnalysis', () => {
    it('should store analysis in database', async () => {
      db.run.mockResolvedValue({});

      await OpenAIService.storeAnalysis(123, 'Analysis result text');

      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE check_results'),
        ['Analysis result text', 123]
      );
    });
  });

  describe('compareResponses', () => {
    const mockEndpoint = {
      id: 'test-uuid',
      name: 'Test API',
      url: 'https://api.example.com/health',
      method: 'GET'
    };

    const mockCheckResult1 = {
      id: 1,
      endpoint_id: 'test-uuid',
      is_healthy: true,
      status_code: 200,
      response_body: '{"status": "ok", "version": "1.0"}',
      response_time: 100,
      timestamp: '2023-01-01T00:00:00Z'
    };

    const mockCheckResult2 = {
      id: 2,
      endpoint_id: 'test-uuid',
      is_healthy: true,
      status_code: 200,
      response_body: '{"status": "ok", "version": "2.0"}',
      response_time: 150,
      timestamp: '2023-01-02T00:00:00Z'
    };

    it('should successfully compare two responses', async () => {
      const mockSettings = [
        { key: 'openai_enabled', value: 'true' },
        { key: 'openai_api_key', value: 'sk-test123' },
        { key: 'openai_response_limit', value: '1000' },
        { key: 'openai_custom_prompt', value: '' }
      ];
      
      db.all.mockResolvedValue(mockSettings);

      const mockOpenAIResponse = {
        data: {
          choices: [
            {
              message: {
                content: '## Content Type\nJSON\n\n## Summary\nThe version changed from 1.0 to 2.0'
              }
            }
          ]
        }
      };

      axios.post.mockResolvedValue(mockOpenAIResponse);

      const comparison = await OpenAIService.compareResponses(mockEndpoint, mockCheckResult1, mockCheckResult2);

      expect(comparison).toContain('version changed');
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          model: 'gpt-3.5-turbo',
          max_tokens: 1000
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk-test123'
          }),
          timeout: 60000
        })
      );
    });

    it('should throw error when OpenAI is not enabled', async () => {
      const mockSettings = [
        { key: 'openai_enabled', value: 'false' }
      ];
      
      db.all.mockResolvedValue(mockSettings);

      await expect(
        OpenAIService.compareResponses(mockEndpoint, mockCheckResult1, mockCheckResult2)
      ).rejects.toThrow('OpenAI analysis is not enabled');
    });

    it('should throw error when API key is missing', async () => {
      const mockSettings = [
        { key: 'openai_enabled', value: 'true' },
        { key: 'openai_api_key', value: '' }
      ];
      
      db.all.mockResolvedValue(mockSettings);

      await expect(
        OpenAIService.compareResponses(mockEndpoint, mockCheckResult1, mockCheckResult2)
      ).rejects.toThrow('OpenAI API key is not configured');
    });
  });

  describe('prepareComparisonContext', () => {
    it('should prepare comprehensive comparison context', () => {
      const endpoint = {
        name: 'Test API',
        url: 'https://api.example.com/data',
        method: 'GET'
      };

      const checkResult1 = {
        timestamp: '2023-01-01T12:00:00Z',
        status_code: 200,
        response_time: 100,
        is_healthy: true,
        response_body: '{"data": "value1"}'
      };

      const checkResult2 = {
        timestamp: '2023-01-02T12:00:00Z',
        status_code: 200,
        response_time: 150,
        is_healthy: true,
        response_body: '{"data": "value2"}'
      };

      const context = OpenAIService.prepareComparisonContext(endpoint, checkResult1, checkResult2);

      expect(context).toContain('Test API');
      expect(context).toContain('https://api.example.com/data');
      expect(context).toContain('Response 1');
      expect(context).toContain('Response 2');
      expect(context).toContain('value1');
      expect(context).toContain('value2');
      expect(context).toContain('200');
      expect(context).toContain('100ms');
      expect(context).toContain('150ms');
    });

    it('should truncate long response bodies', () => {
      const endpoint = {
        name: 'Test',
        url: 'https://api.example.com',
        method: 'GET'
      };

      const longBody = 'x'.repeat(10000);
      const checkResult1 = {
        timestamp: '2023-01-01T12:00:00Z',
        status_code: 200,
        response_time: 100,
        is_healthy: true,
        response_body: longBody
      };

      const checkResult2 = {
        timestamp: '2023-01-02T12:00:00Z',
        status_code: 200,
        response_time: 100,
        is_healthy: true,
        response_body: '{"short": "body"}'
      };

      const context = OpenAIService.prepareComparisonContext(endpoint, checkResult1, checkResult2);

      expect(context).toContain('... (truncated)');
      expect(context.length).toBeLessThan(longBody.length + 1000);
    });

    it('should handle null response bodies', () => {
      const endpoint = {
        name: 'Test',
        url: 'https://api.example.com',
        method: 'GET'
      };

      const checkResult1 = {
        timestamp: '2023-01-01T12:00:00Z',
        status_code: 500,
        response_time: 100,
        is_healthy: false,
        error_message: 'Server error',
        response_body: null
      };

      const checkResult2 = {
        timestamp: '2023-01-02T12:00:00Z',
        status_code: 200,
        response_time: 100,
        is_healthy: true,
        response_body: undefined
      };

      const context = OpenAIService.prepareComparisonContext(endpoint, checkResult1, checkResult2);

      expect(context).toContain('Unhealthy');
      expect(context).toContain('Healthy');
      expect(context).toContain('Server error');
    });
  });
});
