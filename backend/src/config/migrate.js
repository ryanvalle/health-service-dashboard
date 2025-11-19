const db = require('./database');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

    // Create endpoints table with UUID
    console.log('[MIGRATE] Creating endpoints table...');
    await db.run(`
      CREATE TABLE IF NOT EXISTS endpoints (
        id TEXT PRIMARY KEY,
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
        uptime_threshold INTEGER DEFAULT 90,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[MIGRATE] Endpoints table created');

    // Add uptime_threshold column if it doesn't exist (for existing databases)
    try {
      await db.run(`ALTER TABLE endpoints ADD COLUMN uptime_threshold INTEGER DEFAULT 90`);
      console.log('[MIGRATE] Added uptime_threshold column');
    } catch (err) {
      // Column already exists or other error, ignore
      console.log('[MIGRATE] uptime_threshold column already exists or error:', err.message);
    }

    // Add tags column if it doesn't exist (for existing databases)
    try {
      await db.run(`ALTER TABLE endpoints ADD COLUMN tags TEXT`);
      console.log('[MIGRATE] Added tags column');
    } catch (err) {
      // Column already exists or other error, ignore
      console.log('[MIGRATE] tags column already exists or error:', err.message);
    }

    // Add folder column if it doesn't exist (for existing databases)
    try {
      await db.run(`ALTER TABLE endpoints ADD COLUMN folder TEXT`);
      console.log('[MIGRATE] Added folder column');
    } catch (err) {
      // Column already exists or other error, ignore
      console.log('[MIGRATE] folder column already exists or error:', err.message);
    }

    // Create check_results table
    console.log('[MIGRATE] Creating check_results table...');
    await db.run(`
      CREATE TABLE IF NOT EXISTS check_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        endpoint_id TEXT NOT NULL,
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

    // Add OpenAI settings
    console.log('[MIGRATE] Setting OpenAI defaults...');
    await db.run(`
      INSERT OR IGNORE INTO settings (key, value) 
      VALUES 
        ('openai_enabled', 'false'),
        ('openai_api_key', ''),
        ('openai_response_limit', '1000'),
        ('openai_custom_prompt', '')
    `);
    console.log('[MIGRATE] OpenAI defaults set');

    // Add Resend notification settings
    console.log('[MIGRATE] Setting Resend notification defaults...');
    await db.run(`
      INSERT OR IGNORE INTO settings (key, value) 
      VALUES 
        ('resend_enabled', 'false'),
        ('resend_api_key', ''),
        ('notification_email', '')
    `);
    console.log('[MIGRATE] Resend notification defaults set');

    // Add analysis columns to check_results if they don't exist
    try {
      await db.run(`ALTER TABLE check_results ADD COLUMN ai_analysis TEXT`);
      console.log('[MIGRATE] Added ai_analysis column');
    } catch (err) {
      console.log('[MIGRATE] ai_analysis column already exists or error:', err.message);
    }

    try {
      await db.run(`ALTER TABLE check_results ADD COLUMN analyzed_at DATETIME`);
      console.log('[MIGRATE] Added analyzed_at column');
    } catch (err) {
      console.log('[MIGRATE] analyzed_at column already exists or error:', err.message);
    }

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
