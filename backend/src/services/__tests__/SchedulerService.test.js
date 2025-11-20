const SchedulerService = require('../SchedulerService');
const HealthCheckService = require('../HealthCheckService');

jest.mock('../HealthCheckService', () => ({
  executeCheck: jest.fn(() => Promise.resolve())
}));

describe('SchedulerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Stop all scheduled tasks before each test
    SchedulerService.stopAll();
  });

  afterEach(() => {
    // Clean up after each test
    SchedulerService.stopAll();
  });

  describe('scheduleEndpoint', () => {
    it('should schedule an endpoint with interval type', () => {
      const endpoint = {
        id: 'test-id-1',
        name: 'Test Endpoint',
        url: 'https://api.example.com/health',
        schedule_type: 'interval',
        check_frequency: 5,
        is_active: true
      };

      SchedulerService.scheduleEndpoint(endpoint);

      expect(SchedulerService.intervalTasks.has(endpoint.id)).toBe(true);
      expect(SchedulerService.scheduledTasks.has(endpoint.id)).toBe(false);
    });

    it('should schedule an endpoint with cron type', () => {
      const endpoint = {
        id: 'test-id-2',
        name: 'Test Endpoint',
        url: 'https://api.example.com/health',
        schedule_type: 'cron',
        cron_schedule: '*/5 * * * *',
        is_active: true
      };

      SchedulerService.scheduleEndpoint(endpoint);

      expect(SchedulerService.scheduledTasks.has(endpoint.id)).toBe(true);
      expect(SchedulerService.intervalTasks.has(endpoint.id)).toBe(false);
    });

    it('should not schedule an inactive endpoint', () => {
      const endpoint = {
        id: 'test-id-3',
        name: 'Test Endpoint',
        url: 'https://api.example.com/health',
        schedule_type: 'interval',
        check_frequency: 5,
        is_active: false
      };

      SchedulerService.scheduleEndpoint(endpoint);

      expect(SchedulerService.intervalTasks.has(endpoint.id)).toBe(false);
      expect(SchedulerService.scheduledTasks.has(endpoint.id)).toBe(false);
    });

    it('should use interval when schedule_type is interval and check_frequency is set', () => {
      const endpoint = {
        id: 'test-id-4',
        name: 'Test Endpoint',
        url: 'https://api.example.com/health',
        schedule_type: 'interval',
        check_frequency: 10,
        cron_schedule: '*/5 * * * *', // Should be ignored
        is_active: true
      };

      SchedulerService.scheduleEndpoint(endpoint);

      expect(SchedulerService.intervalTasks.has(endpoint.id)).toBe(true);
      expect(SchedulerService.scheduledTasks.has(endpoint.id)).toBe(false);
    });

    it('should use cron when schedule_type is cron and cron_schedule is set', () => {
      const endpoint = {
        id: 'test-id-5',
        name: 'Test Endpoint',
        url: 'https://api.example.com/health',
        schedule_type: 'cron',
        check_frequency: 10, // Should be ignored
        cron_schedule: '*/5 * * * *',
        is_active: true
      };

      SchedulerService.scheduleEndpoint(endpoint);

      expect(SchedulerService.scheduledTasks.has(endpoint.id)).toBe(true);
      expect(SchedulerService.intervalTasks.has(endpoint.id)).toBe(false);
    });

    it('should not schedule if schedule_type is cron but cron_schedule is missing', () => {
      const endpoint = {
        id: 'test-id-6',
        name: 'Test Endpoint',
        url: 'https://api.example.com/health',
        schedule_type: 'cron',
        check_frequency: 10,
        is_active: true
      };

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      SchedulerService.scheduleEndpoint(endpoint);

      expect(SchedulerService.scheduledTasks.has(endpoint.id)).toBe(false);
      expect(SchedulerService.intervalTasks.has(endpoint.id)).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('invalid scheduling configuration')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should not schedule if schedule_type is interval but check_frequency is missing', () => {
      const endpoint = {
        id: 'test-id-7',
        name: 'Test Endpoint',
        url: 'https://api.example.com/health',
        schedule_type: 'interval',
        cron_schedule: '*/5 * * * *',
        is_active: true
      };

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      SchedulerService.scheduleEndpoint(endpoint);

      expect(SchedulerService.scheduledTasks.has(endpoint.id)).toBe(false);
      expect(SchedulerService.intervalTasks.has(endpoint.id)).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('invalid scheduling configuration')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should default to interval if schedule_type is not set', () => {
      const endpoint = {
        id: 'test-id-8',
        name: 'Test Endpoint',
        url: 'https://api.example.com/health',
        check_frequency: 5,
        is_active: true
      };

      SchedulerService.scheduleEndpoint(endpoint);

      expect(SchedulerService.intervalTasks.has(endpoint.id)).toBe(true);
      expect(SchedulerService.scheduledTasks.has(endpoint.id)).toBe(false);
    });

    it('should unschedule existing task before rescheduling', () => {
      const endpoint = {
        id: 'test-id-9',
        name: 'Test Endpoint',
        url: 'https://api.example.com/health',
        schedule_type: 'interval',
        check_frequency: 5,
        is_active: true
      };

      // Schedule first time
      SchedulerService.scheduleEndpoint(endpoint);
      const firstTaskId = SchedulerService.intervalTasks.get(endpoint.id);

      // Schedule again (should unschedule and reschedule)
      SchedulerService.scheduleEndpoint(endpoint);
      const secondTaskId = SchedulerService.intervalTasks.get(endpoint.id);

      expect(firstTaskId).toBeDefined();
      expect(secondTaskId).toBeDefined();
      // The task should be different (new interval created)
      expect(firstTaskId).not.toBe(secondTaskId);
    });
  });

  describe('unscheduleEndpoint', () => {
    it('should unschedule an interval task', () => {
      const endpoint = {
        id: 'test-id-10',
        name: 'Test Endpoint',
        url: 'https://api.example.com/health',
        schedule_type: 'interval',
        check_frequency: 5,
        is_active: true
      };

      SchedulerService.scheduleEndpoint(endpoint);
      expect(SchedulerService.intervalTasks.has(endpoint.id)).toBe(true);

      SchedulerService.unscheduleEndpoint(endpoint.id);
      expect(SchedulerService.intervalTasks.has(endpoint.id)).toBe(false);
    });

    it('should unschedule a cron task', () => {
      const endpoint = {
        id: 'test-id-11',
        name: 'Test Endpoint',
        url: 'https://api.example.com/health',
        schedule_type: 'cron',
        cron_schedule: '*/5 * * * *',
        is_active: true
      };

      SchedulerService.scheduleEndpoint(endpoint);
      expect(SchedulerService.scheduledTasks.has(endpoint.id)).toBe(true);

      SchedulerService.unscheduleEndpoint(endpoint.id);
      expect(SchedulerService.scheduledTasks.has(endpoint.id)).toBe(false);
    });
  });
});
