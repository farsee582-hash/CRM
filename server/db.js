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
    -- Showroom locations
    CREATE TABLE IF NOT EXISTS showrooms (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      city TEXT,
      address TEXT,
      phone TEXT,
      manager_name TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- CRM users with roles
    CREATE TABLE IF NOT EXISTS crm_users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT,
      role TEXT DEFAULT 'sales_rep',  -- sales_rep | manager | admin
      showroom_id INTEGER REFERENCES showrooms(id) ON DELETE SET NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Marketing campaigns
    CREATE TABLE IF NOT EXISTS campaigns (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      source TEXT,   -- Facebook, Instagram, WhatsApp, Walk-in, Referral, etc.
      showroom_id INTEGER REFERENCES showrooms(id) ON DELETE SET NULL,
      budget NUMERIC(12,2),
      start_date DATE,
      end_date DATE,
      status TEXT DEFAULT 'active',
      meta_campaign_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Contacts / Leads
    CREATE TABLE IF NOT EXISTS contacts (
      id SERIAL PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT,
      email TEXT,
      phone TEXT,
      company_id INTEGER,
      company TEXT,
      job_title TEXT,
      lead_stage TEXT DEFAULT 'new',       -- new | contacted | proposal | closed_won | closed_lost
      status TEXT DEFAULT 'lead',          -- lead | prospect | customer
      source TEXT DEFAULT 'manual',        -- manual | meta_lead | whatsapp | walk_in | referral | social_media | campaign
      showroom_id INTEGER REFERENCES showrooms(id) ON DELETE SET NULL,
      assigned_to INTEGER REFERENCES crm_users(id) ON DELETE SET NULL,
      campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
      meta_lead_id TEXT,
      whatsapp_id TEXT,
      tags JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Companies
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

    -- Add company FK after both tables exist
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'contacts_company_id_fkey'
      ) THEN
        ALTER TABLE contacts ADD CONSTRAINT contacts_company_id_fkey
          FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
      END IF;
    END $$;

    -- Deals / Pipeline
    CREATE TABLE IF NOT EXISTS deals (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
      company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
      showroom_id INTEGER REFERENCES showrooms(id) ON DELETE SET NULL,
      assigned_to INTEGER REFERENCES crm_users(id) ON DELETE SET NULL,
      campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
      value NUMERIC(15,2) DEFAULT 0,
      currency TEXT DEFAULT 'INR',
      stage TEXT DEFAULT 'new_lead',  -- new_lead | proposal_shared | under_review | closed_won | closed_lost
      probability INTEGER DEFAULT 0,
      expected_close DATE,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Sales transactions (jewelry-specific)
    CREATE TABLE IF NOT EXISTS sales (
      id SERIAL PRIMARY KEY,
      contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
      showroom_id INTEGER REFERENCES showrooms(id) ON DELETE SET NULL,
      assigned_to INTEGER REFERENCES crm_users(id) ON DELETE SET NULL,
      campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,

      -- Product category
      product_category TEXT NOT NULL, -- gold | diamond | platinum | silver | advance | scheme

      -- Common fields
      bill_no TEXT,
      order_no TEXT,
      scheme_no TEXT,
      amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      contact_person TEXT,

      -- Jewelry-specific
      weight_grams NUMERIC(10,3),
      diamond_carat NUMERIC(10,3),

      sale_date DATE DEFAULT CURRENT_DATE,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Tasks
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
      deal_id INTEGER REFERENCES deals(id) ON DELETE SET NULL,
      assigned_to INTEGER REFERENCES crm_users(id) ON DELETE SET NULL,
      due_date TIMESTAMPTZ,
      priority TEXT DEFAULT 'normal',  -- low | normal | high | urgent
      status TEXT DEFAULT 'not_started', -- not_started | in_progress | completed | cancelled
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Events
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
      assigned_to INTEGER REFERENCES crm_users(id) ON DELETE SET NULL,
      showroom_id INTEGER REFERENCES showrooms(id) ON DELETE SET NULL,
      start_time TIMESTAMPTZ,
      end_time TIMESTAMPTZ,
      reminder_minutes INTEGER DEFAULT 30,
      status TEXT DEFAULT 'upcoming', -- upcoming | completed | cancelled
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Calls
    CREATE TABLE IF NOT EXISTS calls (
      id SERIAL PRIMARY KEY,
      contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
      assigned_to INTEGER REFERENCES crm_users(id) ON DELETE SET NULL,
      call_type TEXT DEFAULT 'outbound',   -- outbound | inbound
      call_outcome TEXT DEFAULT 'connected', -- connected | not_connected | follow_up | interested | not_interested
      start_time TIMESTAMPTZ DEFAULT NOW(),
      duration_minutes INTEGER DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Notes / Activity log
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

    -- Meta Ads
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

    -- Meta Leads
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

    -- WhatsApp messages
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
