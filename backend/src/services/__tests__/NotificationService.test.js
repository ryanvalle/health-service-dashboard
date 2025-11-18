const NotificationService = require('../NotificationService');

// Mock the Resend module
const mockSend = jest.fn();
jest.mock('resend', () => {
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: {
        send: mockSend
      }
    }))
  };
});

const { Resend } = require('resend');

describe('NotificationService', () => {
  let mockEndpoint;
  let mockCheckResult;
  let mockSettings;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock endpoint
    mockEndpoint = {
      id: 'test-endpoint-1',
      name: 'Test API',
      url: 'https://api.example.com/health',
      method: 'GET'
    };

    // Mock check result
    mockCheckResult = {
      endpoint_id: 'test-endpoint-1',
      timestamp: new Date().toISOString(),
      is_healthy: false,
      status_code: 500,
      response_time: 1500,
      error_message: 'Expected status 200, got 500'
    };

    // Mock settings
    mockSettings = {
      resend_enabled: 'true',
      resend_api_key: 're_test_key',
      notification_email: 'test@example.com'
    };
  });

  describe('sendFailureEmail', () => {
    it('should send email when notifications are enabled', async () => {
      mockSend.mockResolvedValue({ id: 'msg_123' });

      const result = await NotificationService.sendFailureEmail(
        mockEndpoint,
        mockCheckResult,
        mockSettings
      );

      expect(Resend).toHaveBeenCalledWith('re_test_key');
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'Health Check Dashboard <onboarding@resend.dev>',
          to: ['test@example.com'],
          subject: 'Health Check Failed: Test API',
          html: expect.stringContaining('Test API'),
          text: expect.stringContaining('Test API')
        })
      );
      expect(result).toEqual({ sent: true, messageId: 'msg_123' });
    });

    it('should not send email when notifications are disabled', async () => {
      mockSettings.resend_enabled = 'false';

      const result = await NotificationService.sendFailureEmail(
        mockEndpoint,
        mockCheckResult,
        mockSettings
      );

      expect(Resend).not.toHaveBeenCalled();
      expect(result).toEqual({ sent: false, reason: 'Notifications disabled' });
    });

    it('should not send email when API key is missing', async () => {
      mockSettings.resend_api_key = '';

      const result = await NotificationService.sendFailureEmail(
        mockEndpoint,
        mockCheckResult,
        mockSettings
      );

      expect(Resend).not.toHaveBeenCalled();
      expect(result).toEqual({ sent: false, reason: 'No API key configured' });
    });

    it('should not send email when email address is missing', async () => {
      mockSettings.notification_email = '';

      const result = await NotificationService.sendFailureEmail(
        mockEndpoint,
        mockCheckResult,
        mockSettings
      );

      expect(Resend).not.toHaveBeenCalled();
      expect(result).toEqual({ sent: false, reason: 'No email address configured' });
    });

    it('should handle Resend API errors gracefully', async () => {
      const errorMessage = 'Invalid API key';
      mockSend.mockRejectedValue(new Error(errorMessage));

      const result = await NotificationService.sendFailureEmail(
        mockEndpoint,
        mockCheckResult,
        mockSettings
      );

      expect(result).toEqual({ sent: false, reason: errorMessage });
    });
  });

  describe('generateEmailHTML', () => {
    it('should generate HTML with all check result details', () => {
      const html = NotificationService.generateEmailHTML(mockEndpoint, mockCheckResult);

      expect(html).toContain('Test API');
      expect(html).toContain('https://api.example.com/health');
      expect(html).toContain('GET');
      expect(html).toContain('500');
      expect(html).toContain('1500ms');
      expect(html).toContain('Expected status 200, got 500');
    });

    it('should handle missing status code', () => {
      const resultWithoutStatus = { ...mockCheckResult, status_code: null };
      const html = NotificationService.generateEmailHTML(mockEndpoint, resultWithoutStatus);

      expect(html).toContain('Test API');
      expect(html).not.toContain('Status Code:');
    });

    it('should handle missing response time', () => {
      const resultWithoutTime = { ...mockCheckResult, response_time: null };
      const html = NotificationService.generateEmailHTML(mockEndpoint, resultWithoutTime);

      expect(html).toContain('Test API');
      expect(html).not.toContain('Response Time:');
    });

    it('should handle missing error message', () => {
      const resultWithoutError = { ...mockCheckResult, error_message: null };
      const html = NotificationService.generateEmailHTML(mockEndpoint, resultWithoutError);

      expect(html).toContain('Test API');
      expect(html).not.toContain('Error:');
    });
  });

  describe('generateEmailText', () => {
    it('should generate plain text with all check result details', () => {
      const text = NotificationService.generateEmailText(mockEndpoint, mockCheckResult);

      expect(text).toContain('Test API');
      expect(text).toContain('https://api.example.com/health');
      expect(text).toContain('GET');
      expect(text).toContain('Status Code: 500');
      expect(text).toContain('Response Time: 1500ms');
      expect(text).toContain('Error: Expected status 200, got 500');
    });

    it('should handle missing optional fields', () => {
      const minimalResult = {
        endpoint_id: 'test-endpoint-1',
        timestamp: new Date().toISOString(),
        is_healthy: false
      };
      const text = NotificationService.generateEmailText(mockEndpoint, minimalResult);

      expect(text).toContain('Test API');
      expect(text).not.toContain('Status Code:');
      expect(text).not.toContain('Response Time:');
      expect(text).not.toContain('Error:');
    });
  });
});
