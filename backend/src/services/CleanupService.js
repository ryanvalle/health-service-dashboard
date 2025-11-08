const cron = require('node-cron');
const CheckResult = require('../models/CheckResult');
const db = require('../config/database');

class CleanupService {
  constructor() {
    this.task = null;
  }

  /**
   * Start the cleanup service
   * Runs daily at 2 AM
   */
  start() {
    console.log('Starting cleanup service...');
    
    // Schedule cleanup to run daily at 2 AM
    this.task = cron.schedule('0 2 * * *', async () => {
      await this.performCleanup();
    });

    // Also run cleanup on startup
    this.performCleanup();

    console.log('Cleanup service started (runs daily at 2 AM)');
  }

  /**
   * Perform the cleanup of old check results
   */
  async performCleanup() {
    try {
      console.log('Running cleanup of old check results...');

      // Get retention period from settings
      const setting = await db.get(
        'SELECT value FROM settings WHERE key = ?',
        ['retention_days']
      );

      const retentionDays = setting ? parseInt(setting.value) : 30;

      // Delete old check results
      const deletedCount = await CheckResult.deleteOlderThan(retentionDays);

      console.log(`Cleanup complete: Deleted ${deletedCount} check results older than ${retentionDays} days`);
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  /**
   * Stop the cleanup service
   */
  stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
      console.log('Cleanup service stopped');
    }
  }
}

module.exports = new CleanupService();
