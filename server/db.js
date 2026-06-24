const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? { rejectUnauthorized: false } : false
})

const run = (text, params) => pool.query(text, params)
const get = async (text, params) => { const r = await pool.query(text, params); return r.rows[0] }
const all = async (text, params) => { const r = await pool.query(text, params); return r.rows }

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS companies (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      industry TEXT,
      website TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      city TEXT,
      country TEXT,
      employees INTEGER,
      annual_revenue NUMERIC(15,2),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id SERIAL PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT,
      email TEXT,
      phone TEXT,
      company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
      company TEXT,
      job_title TEXT,
      status TEXT DEFAULT 'lead',
      source TEXT DEFAULT 'manual',
      meta_lead_id TEXT,
      whatsapp_id TEXT,
      tags JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS deals (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
      company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
      value NUMERIC(15,2) DEFAULT 0,
      currency TEXT DEFAULT 'USD',
      stage TEXT DEFAULT 'prospecting',
      probability INTEGER DEFAULT 0,
      expected_close DATE,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT DEFAULT 'task',
      contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
      deal_id INTEGER REFERENCES deals(id) ON DELETE SET NULL,
      due_date TIMESTAMPTZ,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notes (
      id SERIAL PRIMARY KEY,
      contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
      deal_id INTEGER REFERENCES deals(id) ON DELETE CASCADE,
      type TEXT DEFAULT 'note',
      body TEXT NOT NULL,
      direction TEXT DEFAULT 'outbound',
      whatsapp_message_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS meta_ads (
      id SERIAL PRIMARY KEY,
      ad_id TEXT UNIQUE,
      ad_name TEXT,
      adset_id TEXT,
      adset_name TEXT,
      campaign_id TEXT,
      campaign_name TEXT,
      impressions BIGINT DEFAULT 0,
      clicks BIGINT DEFAULT 0,
      spend NUMERIC(12,2) DEFAULT 0,
      leads INTEGER DEFAULT 0,
      reach BIGINT DEFAULT 0,
      cpc NUMERIC(10,4) DEFAULT 0,
      cpm NUMERIC(10,4) DEFAULT 0,
      ctr NUMERIC(8,4) DEFAULT 0,
      cost_per_lead NUMERIC(10,2) DEFAULT 0,
      date_start DATE,
      date_stop DATE,
      synced_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS meta_leads (
      id SERIAL PRIMARY KEY,
      lead_gen_id TEXT UNIQUE,
      form_id TEXT,
      form_name TEXT,
      ad_id TEXT,
      campaign_name TEXT,
      contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
      raw_data JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS whatsapp_messages (
      id SERIAL PRIMARY KEY,
      message_id TEXT UNIQUE,
      contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
      direction TEXT NOT NULL,
      type TEXT DEFAULT 'text',
      body TEXT,
      status TEXT DEFAULT 'sent',
      timestamp TIMESTAMPTZ DEFAULT NOW()
    );
  `)
  console.log('Database ready')
}

module.exports = { pool, run, get, all, init }
