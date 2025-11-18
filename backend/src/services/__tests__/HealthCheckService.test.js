const HealthCheckService = require('../HealthCheckService');

describe('HealthCheckService', () => {
  describe('getValueByPath', () => {
    it('should retrieve simple property', () => {
      const obj = { status: 'healthy' };
      expect(HealthCheckService.getValueByPath(obj, 'status')).toBe('healthy');
    });

    it('should retrieve nested property', () => {
      const obj = { data: { status: 'ok', uptime: 100 } };
      expect(HealthCheckService.getValueByPath(obj, 'data.status')).toBe('ok');
      expect(HealthCheckService.getValueByPath(obj, 'data.uptime')).toBe(100);
    });

    it('should retrieve deeply nested property', () => {
      const obj = { level1: { level2: { level3: { value: 'deep' } } } };
      expect(HealthCheckService.getValueByPath(obj, 'level1.level2.level3.value')).toBe('deep');
    });

    it('should return undefined for non-existent property', () => {
      const obj = { status: 'healthy' };
      expect(HealthCheckService.getValueByPath(obj, 'nonexistent')).toBeUndefined();
    });

    it('should return undefined for non-existent nested property', () => {
      const obj = { data: { status: 'ok' } };
      expect(HealthCheckService.getValueByPath(obj, 'data.nonexistent')).toBeUndefined();
    });

    it('should handle null values', () => {
      const obj = { value: null };
      expect(HealthCheckService.getValueByPath(obj, 'value')).toBeNull();
    });
  });

  describe('validateJsonPathAssertions', () => {
    describe('equals operator', () => {
      it('should return true when values are equal', () => {
        const data = { status: 'healthy' };
        const assertions = [{ path: 'status', operator: 'equals', value: 'healthy' }];
        expect(HealthCheckService.validateJsonPathAssertions(data, assertions)).toBe(true);
      });

      it('should return false when values are not equal', () => {
        const data = { status: 'unhealthy' };
        const assertions = [{ path: 'status', operator: 'equals', value: 'healthy' }];
        expect(HealthCheckService.validateJsonPathAssertions(data, assertions)).toBe(false);
      });

      it('should handle numeric values', () => {
        const data = { count: 42 };
        const assertions = [{ path: 'count', operator: 'equals', value: 42 }];
        expect(HealthCheckService.validateJsonPathAssertions(data, assertions)).toBe(true);
      });

      it('should handle nested paths', () => {
        const data = { response: { code: 200 } };
        const assertions = [{ path: 'response.code', operator: 'equals', value: 200 }];
        expect(HealthCheckService.validateJsonPathAssertions(data, assertions)).toBe(true);
      });
    });

    describe('notEquals operator', () => {
      it('should return true when values are not equal', () => {
        const data = { status: 'healthy' };
        const assertions = [{ path: 'status', operator: 'notEquals', value: 'unhealthy' }];
        expect(HealthCheckService.validateJsonPathAssertions(data, assertions)).toBe(true);
      });

      it('should return false when values are equal', () => {
        const data = { status: 'healthy' };
        const assertions = [{ path: 'status', operator: 'notEquals', value: 'healthy' }];
        expect(HealthCheckService.validateJsonPathAssertions(data, assertions)).toBe(false);
      });
    });

    describe('contains operator', () => {
      it('should return true when string contains value', () => {
        const data = { message: 'System is healthy' };
        const assertions = [{ path: 'message', operator: 'contains', value: 'healthy' }];
        expect(HealthCheckService.validateJsonPathAssertions(data, assertions)).toBe(true);
      });

      it('should return false when string does not contain value', () => {
        const data = { message: 'System is down' };
        const assertions = [{ path: 'message', operator: 'contains', value: 'healthy' }];
        expect(HealthCheckService.validateJsonPathAssertions(data, assertions)).toBe(false);
      });

      it('should handle numeric values as strings', () => {
        const data = { version: 123 };
        const assertions = [{ path: 'version', operator: 'contains', value: '12' }];
        expect(HealthCheckService.validateJsonPathAssertions(data, assertions)).toBe(true);
      });
    });

    describe('exists operator', () => {
      it('should return true when property exists', () => {
        const data = { status: 'healthy' };
        const assertions = [{ path: 'status', operator: 'exists', value: null }];
        expect(HealthCheckService.validateJsonPathAssertions(data, assertions)).toBe(true);
      });

      it('should return true when nested property exists', () => {
        const data = { data: { uptime: 1000 } };
        const assertions = [{ path: 'data.uptime', operator: 'exists', value: null }];
        expect(HealthCheckService.validateJsonPathAssertions(data, assertions)).toBe(true);
      });

      it('should return false when property does not exist', () => {
        const data = { status: 'healthy' };
        const assertions = [{ path: 'nonexistent', operator: 'exists', value: null }];
        expect(HealthCheckService.validateJsonPathAssertions(data, assertions)).toBe(false);
      });

      it('should return true when property exists with null value', () => {
        const data = { value: null };
        const assertions = [{ path: 'value', operator: 'exists', value: null }];
        expect(HealthCheckService.validateJsonPathAssertions(data, assertions)).toBe(true);
      });
    });

    describe('multiple assertions', () => {
      it('should return true when all assertions pass', () => {
        const data = { status: 'healthy', uptime: 1000, message: 'All systems operational' };
        const assertions = [
          { path: 'status', operator: 'equals', value: 'healthy' },
          { path: 'uptime', operator: 'exists', value: null },
          { path: 'message', operator: 'contains', value: 'operational' }
        ];
        expect(HealthCheckService.validateJsonPathAssertions(data, assertions)).toBe(true);
      });

      it('should return false when any assertion fails', () => {
        const data = { status: 'healthy', uptime: 1000 };
        const assertions = [
          { path: 'status', operator: 'equals', value: 'healthy' },
          { path: 'nonexistent', operator: 'exists', value: null }
        ];
        expect(HealthCheckService.validateJsonPathAssertions(data, assertions)).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should return false for unknown operator', () => {
        const data = { status: 'healthy' };
        const assertions = [{ path: 'status', operator: 'unknown', value: 'healthy' }];
        expect(HealthCheckService.validateJsonPathAssertions(data, assertions)).toBe(false);
      });

      it('should return true for empty assertions array', () => {
        const data = { status: 'healthy' };
        expect(HealthCheckService.validateJsonPathAssertions(data, [])).toBe(true);
      });

      it('should handle malformed data gracefully', () => {
        const data = null;
        const assertions = [{ path: 'status', operator: 'exists', value: null }];
        expect(HealthCheckService.validateJsonPathAssertions(data, assertions)).toBe(false);
      });
    });
  });
});
