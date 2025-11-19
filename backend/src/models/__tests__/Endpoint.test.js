const Endpoint = require('../Endpoint');

describe('Endpoint', () => {
  describe('parse', () => {
    it('should parse valid endpoint data', () => {
      const rawEndpoint = {
        id: '123',
        name: 'Test Endpoint',
        url: 'https://api.example.com/health',
        method: 'GET',
        headers: '{"Authorization": "Bearer token"}',
        expected_status_codes: '[200, 201]',
        json_path_assertions: '[{"path": "status", "operator": "equals", "value": "ok"}]',
        timeout: 30000,
        is_active: 1
      };

      const parsed = Endpoint.parse(rawEndpoint);

      expect(parsed.id).toBe('123');
      expect(parsed.name).toBe('Test Endpoint');
      expect(parsed.url).toBe('https://api.example.com/health');
      expect(parsed.headers).toEqual({ Authorization: 'Bearer token' });
      expect(parsed.expected_status_codes).toEqual([200, 201]);
      expect(parsed.json_path_assertions).toEqual([
        { path: 'status', operator: 'equals', value: 'ok' }
      ]);
      expect(parsed.is_active).toBe(true);
    });

    it('should handle missing headers', () => {
      const rawEndpoint = {
        id: '123',
        name: 'Test Endpoint',
        url: 'https://api.example.com/health',
        method: 'GET',
        headers: null,
        expected_status_codes: '[200]',
        json_path_assertions: '[]',
        is_active: 1
      };

      const parsed = Endpoint.parse(rawEndpoint);
      expect(parsed.headers).toEqual({});
    });

    it('should handle empty headers', () => {
      const rawEndpoint = {
        id: '123',
        name: 'Test Endpoint',
        url: 'https://api.example.com/health',
        method: 'GET',
        headers: '{}',
        expected_status_codes: '[200]',
        json_path_assertions: '[]',
        is_active: 1
      };

      const parsed = Endpoint.parse(rawEndpoint);
      expect(parsed.headers).toEqual({});
    });

    it('should handle missing expected_status_codes with default', () => {
      const rawEndpoint = {
        id: '123',
        name: 'Test Endpoint',
        url: 'https://api.example.com/health',
        method: 'GET',
        headers: '{}',
        expected_status_codes: null,
        json_path_assertions: '[]',
        is_active: 1
      };

      const parsed = Endpoint.parse(rawEndpoint);
      expect(parsed.expected_status_codes).toEqual([200]);
    });

    it('should handle missing json_path_assertions with default', () => {
      const rawEndpoint = {
        id: '123',
        name: 'Test Endpoint',
        url: 'https://api.example.com/health',
        method: 'GET',
        headers: '{}',
        expected_status_codes: '[200]',
        json_path_assertions: null,
        is_active: 1
      };

      const parsed = Endpoint.parse(rawEndpoint);
      expect(parsed.json_path_assertions).toEqual([]);
    });

    it('should convert is_active to boolean (true)', () => {
      const rawEndpoint = {
        id: '123',
        name: 'Test Endpoint',
        url: 'https://api.example.com/health',
        method: 'GET',
        headers: '{}',
        expected_status_codes: '[200]',
        json_path_assertions: '[]',
        is_active: 1
      };

      const parsed = Endpoint.parse(rawEndpoint);
      expect(parsed.is_active).toBe(true);
    });

    it('should convert is_active to boolean (false)', () => {
      const rawEndpoint = {
        id: '123',
        name: 'Test Endpoint',
        url: 'https://api.example.com/health',
        method: 'GET',
        headers: '{}',
        expected_status_codes: '[200]',
        json_path_assertions: '[]',
        is_active: 0
      };

      const parsed = Endpoint.parse(rawEndpoint);
      expect(parsed.is_active).toBe(false);
    });

    it('should return null for null endpoint', () => {
      const parsed = Endpoint.parse(null);
      expect(parsed).toBeNull();
    });

    it('should return null for undefined endpoint', () => {
      const parsed = Endpoint.parse(undefined);
      expect(parsed).toBeNull();
    });

    it('should handle complex nested JSON path assertions', () => {
      const rawEndpoint = {
        id: '123',
        name: 'Test Endpoint',
        url: 'https://api.example.com/health',
        method: 'GET',
        headers: '{}',
        expected_status_codes: '[200]',
        json_path_assertions: '[{"path": "data.items.0.status", "operator": "equals", "value": "ok"}]',
        is_active: 1
      };

      const parsed = Endpoint.parse(rawEndpoint);
      expect(parsed.json_path_assertions).toEqual([
        { path: 'data.items.0.status', operator: 'equals', value: 'ok' }
      ]);
    });

    it('should preserve all original properties', () => {
      const rawEndpoint = {
        id: '123',
        name: 'Test Endpoint',
        url: 'https://api.example.com/health',
        method: 'POST',
        headers: '{"Content-Type": "application/json"}',
        expected_status_codes: '[200, 201, 202]',
        json_path_assertions: '[]',
        timeout: 60000,
        check_frequency: 5,
        cron_schedule: '*/5 * * * *',
        response_time_threshold: 1000,
        uptime_threshold: 95,
        is_active: 1,
        created_at: '2023-01-01 00:00:00',
        updated_at: '2023-01-02 00:00:00'
      };

      const parsed = Endpoint.parse(rawEndpoint);
      
      expect(parsed.id).toBe('123');
      expect(parsed.method).toBe('POST');
      expect(parsed.timeout).toBe(60000);
      expect(parsed.check_frequency).toBe(5);
      expect(parsed.cron_schedule).toBe('*/5 * * * *');
      expect(parsed.response_time_threshold).toBe(1000);
      expect(parsed.uptime_threshold).toBe(95);
      expect(parsed.created_at).toBe('2023-01-01 00:00:00');
      expect(parsed.updated_at).toBe('2023-01-02 00:00:00');
    });

    it('should parse tags when present', () => {
      const rawEndpoint = {
        id: '123',
        name: 'Test Endpoint',
        url: 'https://api.example.com/health',
        method: 'GET',
        headers: '{}',
        expected_status_codes: '[200]',
        json_path_assertions: '[]',
        tags: '["production", "api", "critical"]',
        is_active: 1
      };

      const parsed = Endpoint.parse(rawEndpoint);
      expect(parsed.tags).toEqual(['production', 'api', 'critical']);
    });

    it('should handle missing tags with default empty array', () => {
      const rawEndpoint = {
        id: '123',
        name: 'Test Endpoint',
        url: 'https://api.example.com/health',
        method: 'GET',
        headers: '{}',
        expected_status_codes: '[200]',
        json_path_assertions: '[]',
        tags: null,
        is_active: 1
      };

      const parsed = Endpoint.parse(rawEndpoint);
      expect(parsed.tags).toEqual([]);
    });
  });
});
