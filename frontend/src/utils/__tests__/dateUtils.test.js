import {
  parseTimestamp,
  formatTimestamp,
  formatRelativeTime,
  getSystemTimezone,
  getTimezoneOptions,
  calculateNextCheckTime,
  formatChartTimestamp
} from '../dateUtils';

describe('dateUtils', () => {
  describe('parseTimestamp', () => {
    it('should parse UTC timestamp without timezone info', () => {
      const timestamp = '2023-11-17 15:30:00';
      const date = parseTimestamp(timestamp);
      expect(date).toBeInstanceOf(Date);
      expect(date.toISOString()).toBe('2023-11-17T15:30:00.000Z');
    });

    it('should parse ISO timestamp with Z', () => {
      const timestamp = '2023-11-17T15:30:00.000Z';
      const date = parseTimestamp(timestamp);
      expect(date).toBeInstanceOf(Date);
      expect(date.toISOString()).toBe('2023-11-17T15:30:00.000Z');
    });

    it('should parse ISO timestamp with T', () => {
      const timestamp = '2023-11-17T15:30:00';
      const date = parseTimestamp(timestamp);
      expect(date).toBeInstanceOf(Date);
    });

    it('should return null for null timestamp', () => {
      const date = parseTimestamp(null);
      expect(date).toBeNull();
    });

    it('should return null for undefined timestamp', () => {
      const date = parseTimestamp(undefined);
      expect(date).toBeNull();
    });

    it('should return null for empty string', () => {
      const date = parseTimestamp('');
      expect(date).toBeNull();
    });
  });

  describe('formatTimestamp', () => {
    const testDate = new Date('2023-11-17T15:30:45.000Z');

    it('should format timestamp with full format', () => {
      const formatted = formatTimestamp(testDate, { format: 'full', timezone: 'UTC' });
      expect(formatted).toContain('Nov');
      expect(formatted).toContain('17');
      expect(formatted).toContain('2023');
    });

    it('should format timestamp with date format', () => {
      const formatted = formatTimestamp(testDate, { format: 'date', timezone: 'UTC' });
      expect(formatted).toContain('Nov');
      expect(formatted).toContain('17');
      expect(formatted).toContain('2023');
      expect(formatted).not.toContain(':');
    });

    it('should format timestamp with time format', () => {
      const formatted = formatTimestamp(testDate, { format: 'time', timezone: 'UTC' });
      expect(formatted).toMatch(/\d{1,2}:\d{2}:\d{2}/);
    });

    it('should handle string timestamp', () => {
      const formatted = formatTimestamp('2023-11-17 15:30:45', { format: 'date', timezone: 'UTC' });
      expect(formatted).toContain('Nov');
      expect(formatted).toContain('17');
      expect(formatted).toContain('2023');
    });

    it('should return "Invalid date" for invalid input', () => {
      const formatted = formatTimestamp('invalid-date');
      expect(formatted).toBe('Invalid date');
    });

    it('should return "Invalid date" for null', () => {
      const formatted = formatTimestamp(null);
      expect(formatted).toBe('Invalid date');
    });
  });

  describe('formatRelativeTime', () => {
    it('should format recent time in seconds', () => {
      const now = new Date();
      const timestamp = new Date(now.getTime() - 30 * 1000);
      const formatted = formatRelativeTime(timestamp);
      expect(formatted).toContain('second');
      expect(formatted).toContain('ago');
    });

    it('should format time in minutes', () => {
      const now = new Date();
      const timestamp = new Date(now.getTime() - 5 * 60 * 1000);
      const formatted = formatRelativeTime(timestamp);
      expect(formatted).toContain('5 minute');
      expect(formatted).toContain('ago');
    });

    it('should format time in hours', () => {
      const now = new Date();
      const timestamp = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      const formatted = formatRelativeTime(timestamp);
      expect(formatted).toContain('3 hour');
      expect(formatted).toContain('ago');
    });

    it('should format time in days', () => {
      const now = new Date();
      const timestamp = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      const formatted = formatRelativeTime(timestamp);
      expect(formatted).toContain('2 day');
      expect(formatted).toContain('ago');
    });

    it('should use singular form for 1 unit', () => {
      const now = new Date();
      const timestamp = new Date(now.getTime() - 1 * 60 * 1000);
      const formatted = formatRelativeTime(timestamp);
      expect(formatted).toBe('1 minute ago');
    });

    it('should use plural form for multiple units', () => {
      const now = new Date();
      const timestamp = new Date(now.getTime() - 2 * 60 * 1000);
      const formatted = formatRelativeTime(timestamp);
      expect(formatted).toBe('2 minutes ago');
    });

    it('should format future time', () => {
      const now = new Date();
      const timestamp = new Date(now.getTime() + 5 * 60 * 1000);
      const formatted = formatRelativeTime(timestamp);
      expect(formatted).toContain('5 minute');
      expect(formatted).toContain('in');
    });

    it('should return "Invalid date" for invalid input', () => {
      const formatted = formatRelativeTime('invalid-date');
      expect(formatted).toBe('Invalid date');
    });
  });

  describe('getSystemTimezone', () => {
    it('should return a valid timezone string', () => {
      const timezone = getSystemTimezone();
      expect(typeof timezone).toBe('string');
      expect(timezone.length).toBeGreaterThan(0);
    });
  });

  describe('getTimezoneOptions', () => {
    it('should return an array of timezone options', () => {
      const options = getTimezoneOptions();
      expect(Array.isArray(options)).toBe(true);
      expect(options.length).toBeGreaterThan(0);
    });

    it('should have correct structure for each option', () => {
      const options = getTimezoneOptions();
      options.forEach(option => {
        expect(option).toHaveProperty('value');
        expect(option).toHaveProperty('label');
        expect(typeof option.value).toBe('string');
        expect(typeof option.label).toBe('string');
      });
    });

    it('should include auto option', () => {
      const options = getTimezoneOptions();
      const autoOption = options.find(opt => opt.value === 'auto');
      expect(autoOption).toBeDefined();
      expect(autoOption.label).toContain('Auto');
    });

    it('should include UTC option', () => {
      const options = getTimezoneOptions();
      const utcOption = options.find(opt => opt.value === 'UTC');
      expect(utcOption).toBeDefined();
    });

    it('should include common timezones', () => {
      const options = getTimezoneOptions();
      const values = options.map(opt => opt.value);
      expect(values).toContain('America/New_York');
      expect(values).toContain('America/Los_Angeles');
      expect(values).toContain('Europe/London');
      expect(values).toContain('Asia/Tokyo');
    });
  });

  describe('calculateNextCheckTime', () => {
    it('should calculate next check time for interval-based checks', () => {
      const endpoint = {
        is_active: true,
        check_frequency: 5,
        latest_check: {
          timestamp: '2023-11-17 15:30:00'
        }
      };
      const nextCheck = calculateNextCheckTime(endpoint);
      expect(nextCheck).toBeInstanceOf(Date);
      const expected = new Date('2023-11-17T15:30:00.000Z').getTime() + 5 * 60 * 1000;
      expect(nextCheck.getTime()).toBe(expected);
    });

    it('should return null for inactive endpoint', () => {
      const endpoint = {
        is_active: false,
        check_frequency: 5,
        latest_check: {
          timestamp: '2023-11-17 15:30:00'
        }
      };
      const nextCheck = calculateNextCheckTime(endpoint);
      expect(nextCheck).toBeNull();
    });

    it('should return null for cron-based checks', () => {
      const endpoint = {
        is_active: true,
        cron_schedule: '*/5 * * * *'
      };
      const nextCheck = calculateNextCheckTime(endpoint);
      expect(nextCheck).toBeNull();
    });

    it('should return null when no check frequency or latest check', () => {
      const endpoint = {
        is_active: true
      };
      const nextCheck = calculateNextCheckTime(endpoint);
      expect(nextCheck).toBeNull();
    });

    it('should return null when latest_check is missing', () => {
      const endpoint = {
        is_active: true,
        check_frequency: 5
      };
      const nextCheck = calculateNextCheckTime(endpoint);
      expect(nextCheck).toBeNull();
    });
  });

  describe('formatChartTimestamp', () => {
    it('should format timestamp for chart axis', () => {
      const timestamp = new Date('2023-11-17T19:04:30.000Z');
      const formatted = formatChartTimestamp(timestamp, { timezone: 'UTC' });
      expect(formatted).toMatch(/\d{1,2}\/\d{1,2} @ \d{1,2}:\d{2}[ap]/);
    });

    it('should handle string timestamp', () => {
      const timestamp = '2023-11-17 19:04:30';
      const formatted = formatChartTimestamp(timestamp, { timezone: 'UTC' });
      expect(formatted).toMatch(/\d{1,2}\/\d{1,2} @ \d{1,2}:\d{2}[ap]/);
    });

    it('should return empty string for invalid date', () => {
      const formatted = formatChartTimestamp('invalid-date');
      expect(formatted).toBe('');
    });

    it('should return empty string for null', () => {
      const formatted = formatChartTimestamp(null);
      expect(formatted).toBe('');
    });

    it('should format with PM indicator', () => {
      const timestamp = new Date('2023-11-17T19:04:30.000Z');
      const formatted = formatChartTimestamp(timestamp, { timezone: 'UTC' });
      expect(formatted).toContain('p');
    });

    it('should format with AM indicator', () => {
      const timestamp = new Date('2023-11-17T09:04:30.000Z');
      const formatted = formatChartTimestamp(timestamp, { timezone: 'UTC' });
      expect(formatted).toContain('a');
    });
  });
});
