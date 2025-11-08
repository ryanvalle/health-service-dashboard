const db = require('./database');
const fs = require('fs');
const path = require('path');

async function migrate() {
  try {
    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    await db.connect();

    // Create endpoints table
    await db.run(`
      CREATE TABLE IF NOT EXISTS endpoints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        method TEXT DEFAULT 'GET',
        headers TEXT,
        expected_status_codes TEXT,
        json_path_assertions TEXT,
        response_time_threshold INTEGER,
        check_frequency INTEGER,
        cron_schedule TEXT,
        timeout INTEGER DEFAULT 30000,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create check_results table
    await db.run(`
      CREATE TABLE IF NOT EXISTS check_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        endpoint_id INTEGER NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_healthy INTEGER NOT NULL,
        status_code INTEGER,
        response_body TEXT,
        response_time INTEGER,
        error_message TEXT,
        FOREIGN KEY (endpoint_id) REFERENCES endpoints(id) ON DELETE CASCADE
      )
    `);

    // Create index on endpoint_id and timestamp for faster queries
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_check_results_endpoint_timestamp 
      ON check_results(endpoint_id, timestamp DESC)
    `);

    // Create settings table for retention policy
    await db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default retention period if not exists
    await db.run(`
      INSERT OR IGNORE INTO settings (key, value) 
      VALUES ('retention_days', '30')
    `);

    console.log('Database migration completed successfully');
    await db.close();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  migrate();
}

module.exports = migrate;
