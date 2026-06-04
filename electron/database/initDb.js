const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

function initLocalDb(dbPath) {
  // Ensure directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath, { verbose: console.log });
  db.pragma('journal_mode = WAL');

  // Create tables mimicking Supabase, with added sync_status fields
  
  // 1. Branches
  db.exec(`
    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      name TEXT UNIQUE NOT NULL,
      type TEXT,
      address TEXT,
      phone TEXT,
      manager TEXT,
      business_number TEXT,
      employee_count INTEGER,
      delivery_fees TEXT, -- JSON
      surcharges TEXT, -- JSON
      account TEXT,
      seeded INTEGER DEFAULT 0,
      extra_data TEXT, -- JSON
      created_at TEXT,
      sync_status TEXT DEFAULT 'synced',
      last_sync_time TEXT
    );
  `);

  // 2. Orders
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      order_number TEXT,
      status TEXT DEFAULT 'processing',
      receipt_type TEXT,
      branch_id TEXT,
      branch_name TEXT,
      order_date TEXT,
      orderer TEXT, -- JSON
      delivery_info TEXT, -- JSON
      pickup_info TEXT, -- JSON
      summary TEXT, -- JSON
      payment TEXT, -- JSON
      items TEXT, -- JSON
      memo TEXT,
      transfer_info TEXT, -- JSON
      actual_delivery_cost INTEGER,
      extra_data TEXT, -- JSON
      outsource_info TEXT, -- JSON
      actual_delivery_cost_cash INTEGER,
      delivery_cost_status TEXT,
      delivery_cost_updated_at TEXT,
      delivery_cost_updated_by TEXT,
      delivery_cost_reason TEXT,
      delivery_profit INTEGER,
      created_at TEXT,
      updated_at TEXT,
      completed_at TEXT,
      completed_by TEXT,
      sync_status TEXT DEFAULT 'pending_insert',
      last_sync_time TEXT
    );
  `);

  // 3. Print Jobs
  db.exec(`
    CREATE TABLE IF NOT EXISTS print_jobs (
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      printer_id TEXT,
      branch_id TEXT,
      document_type TEXT,
      document_data TEXT, -- JSON
      status TEXT DEFAULT 'pending',
      error_message TEXT,
      created_at TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'pending_insert',
      last_sync_time TEXT
    );
  `);

  // 4. Customers
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      name TEXT NOT NULL,
      contact TEXT NOT NULL,
      company_name TEXT,
      department TEXT,
      address TEXT,
      email TEXT,
      grade TEXT DEFAULT '신규',
      memo TEXT,
      points INTEGER DEFAULT 0,
      type TEXT DEFAULT 'personal',
      birthday TEXT,
      wedding_anniversary TEXT,
      created_at TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'synced',
      last_sync_time TEXT
    );
  `);

  console.log("Local SQLite database initialized at", dbPath);
  return db;
}

module.exports = { initLocalDb };
