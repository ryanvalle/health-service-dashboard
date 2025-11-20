const cron = require('node-cron');
const Endpoint = require('../models/Endpoint');
const HealthCheckService = require('./HealthCheckService');

class SchedulerService {
  constructor() {
    this.scheduledTasks = new Map();
    this.intervalTasks = new Map();
  }

  /**
   * Start scheduler for all endpoints
   */
  async start() {
    console.log('Starting scheduler service...');
    
    // Load all active endpoints
    const endpoints = await Endpoint.findAll();
    
    for (const endpoint of endpoints) {
      if (endpoint.is_active) {
        this.scheduleEndpoint(endpoint);
      }
    }

    console.log(`Scheduler started with ${this.scheduledTasks.size + this.intervalTasks.size} active checks`);
  }

  /**
   * Schedule a single endpoint
   */
  scheduleEndpoint(endpoint) {
    // Remove existing schedule if any
    this.unscheduleEndpoint(endpoint.id);

    if (!endpoint.is_active) {
      return;
    }

    // Schedule based on schedule_type field
    const scheduleType = endpoint.schedule_type || 'interval';
    
    if (scheduleType === 'cron' && endpoint.cron_schedule) {
      this.scheduleCron(endpoint);
    } else if (scheduleType === 'interval' && endpoint.check_frequency) {
      this.scheduleInterval(endpoint);
    } else {
      console.warn(`Endpoint ${endpoint.name} has invalid scheduling configuration: type=${scheduleType}, frequency=${endpoint.check_frequency}, cron=${endpoint.cron_schedule}`);
    }
  }

  /**
   * Schedule using cron expression
   */
  scheduleCron(endpoint) {
    try {
      const task = cron.schedule(endpoint.cron_schedule, async () => {
        console.log(`Running scheduled check for: ${endpoint.name}`);
        await HealthCheckService.executeCheck(endpoint);
      });

      this.scheduledTasks.set(endpoint.id, task);
      console.log(`Scheduled cron check for ${endpoint.name}: ${endpoint.cron_schedule}`);
    } catch (error) {
      console.error(`Error scheduling cron for ${endpoint.name}:`, error);
    }
  }

  /**
   * Schedule using interval in minutes
   */
  scheduleInterval(endpoint) {
    const intervalMs = endpoint.check_frequency * 60 * 1000;
    
    // Execute immediately
    HealthCheckService.executeCheck(endpoint).catch(err => {
      console.error(`Error in initial check for ${endpoint.name}:`, err);
    });

    // Then schedule recurring checks
    const intervalId = setInterval(async () => {
      console.log(`Running interval check for: ${endpoint.name}`);
      await HealthCheckService.executeCheck(endpoint);
    }, intervalMs);

    this.intervalTasks.set(endpoint.id, intervalId);
    console.log(`Scheduled interval check for ${endpoint.name}: every ${endpoint.check_frequency} minutes`);
  }

  /**
   * Unschedule an endpoint
   */
  unscheduleEndpoint(endpointId) {
    // Stop cron task
    const cronTask = this.scheduledTasks.get(endpointId);
    if (cronTask) {
      cronTask.stop();
      this.scheduledTasks.delete(endpointId);
    }

    // Stop interval task
    const intervalId = this.intervalTasks.get(endpointId);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervalTasks.delete(endpointId);
    }
  }

  /**
   * Reschedule an endpoint (useful after updates)
   */
  async rescheduleEndpoint(endpointId) {
    const endpoint = await Endpoint.findById(endpointId);
    if (endpoint) {
      this.scheduleEndpoint(endpoint);
    }
  }

  /**
   * Stop all scheduled tasks
   */
  stopAll() {
    console.log('Stopping all scheduled tasks...');

    this.scheduledTasks.forEach(task => task.stop());
    this.scheduledTasks.clear();

    this.intervalTasks.forEach(intervalId => clearInterval(intervalId));
    this.intervalTasks.clear();

    console.log('All tasks stopped');
  }
}

module.exports = new SchedulerService();
