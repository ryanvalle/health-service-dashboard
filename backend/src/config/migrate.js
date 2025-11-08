const db = require('./database');
const fs = require('fs');
const path = require('path');

async function migrate() {
  try {
    console.log('[MIGRATE] Starting migration...');
    // Create data directory if it doesn't exist
    const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/database.sqlite');
    const dataDir = path.dirname(dbPath);
    
    console.log('[MIGRATE] DB Path:', dbPath);
    console.log('[MIGRATE] Data Dir:', dataDir);
    
    if (!fs.existsSync(dataDir)) {
      console.log('[MIGRATE] Creating data directory:', dataDir);
      fs.mkdirSync(dataDir, { recursive: true });
    }

    console.log('[MIGRATE] Connecting to database...');
    await db.connect();
    console.log('[MIGRATE] Connected successfully');

    // Create endpoints table
    console.log('[MIGRATE] Creating endpoints table...');
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
    console.log('[MIGRATE] Endpoints table created');

    // Create check_results table
    console.log('[MIGRATE] Creating check_results table...');
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
    console.log('[MIGRATE] Check_results table created');

    // Create index on endpoint_id and timestamp for faster queries
    console.log('[MIGRATE] Creating index...');
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_check_results_endpoint_timestamp 
      ON check_results(endpoint_id, timestamp DESC)
    `);
    console.log('[MIGRATE] Index created');

    // Create settings table for retention policy
    console.log('[MIGRATE] Creating settings table...');
    await db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[MIGRATE] Settings table created');

    // Insert default retention period if not exists
    console.log('[MIGRATE] Setting default retention...');
    await db.run(`
      INSERT OR IGNORE INTO settings (key, value) 
      VALUES ('retention_days', '30')
    `);
    console.log('[MIGRATE] Default retention set');

    console.log('[MIGRATE] Database migration completed successfully');
  } catch (error) {
    console.error('[MIGRATE] Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  migrate();
}

module.exports = migrate;
