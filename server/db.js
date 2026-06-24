const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir);

const db = new Database(path.join(dbDir, 'crm.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    company TEXT,
    job_title TEXT,
    status TEXT DEFAULT 'lead',
    source TEXT DEFAULT 'manual',
    meta_lead_id TEXT,
    whatsapp_id TEXT,
    tags TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS deals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
    value REAL DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    stage TEXT DEFAULT 'prospecting',
    probability INTEGER DEFAULT 0,
    expected_close TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
    deal_id INTEGER REFERENCES deals(id) ON DELETE SET NULL,
    due_date TEXT,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
    deal_id INTEGER REFERENCES deals(id) ON DELETE CASCADE,
    type TEXT DEFAULT 'note',
    body TEXT NOT NULL,
    direction TEXT DEFAULT 'outbound',
    whatsapp_message_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS meta_ads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad_id TEXT UNIQUE,
    ad_name TEXT,
    adset_id TEXT,
    adset_name TEXT,
    campaign_id TEXT,
    campaign_name TEXT,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    spend REAL DEFAULT 0,
    leads INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    cpc REAL DEFAULT 0,
    cpm REAL DEFAULT 0,
    ctr REAL DEFAULT 0,
    cost_per_lead REAL DEFAULT 0,
    date_start TEXT,
    date_stop TEXT,
    synced_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS meta_leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_gen_id TEXT UNIQUE,
    form_id TEXT,
    form_name TEXT,
    ad_id TEXT,
    campaign_name TEXT,
    contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
    raw_data TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id TEXT UNIQUE,
    contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
    direction TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    body TEXT,
    status TEXT DEFAULT 'sent',
    timestamp TEXT DEFAULT (datetime('now'))
  );
`);

module.exports = db;
