const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../db');

const BASE = 'https://graph.facebook.com/v19.0';

function token() {
  return process.env.META_ACCESS_TOKEN;
}

// ── Webhook verification (GET) ──────────────────────────────────────────────
router.get('/webhook', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': verify, 'hub.challenge': challenge } = req.query;
  if (mode === 'subscribe' && verify === process.env.META_VERIFY_TOKEN) {
    return res.send(challenge);
  }
  res.sendStatus(403);
});

// ── Webhook events (POST) ───────────────────────────────────────────────────
router.post('/webhook', (req, res) => {
  const body = req.body;
  if (body.object === 'page' || body.object === 'leadgen') {
    for (const entry of (body.entry || [])) {
      for (const change of (entry.changes || [])) {
        if (change.field === 'leadgen') {
          processLeadWebhook(change.value).catch(console.error);
        }
      }
    }
  }
  res.sendStatus(200);
});

async function processLeadWebhook(data) {
  const { leadgen_id, form_id, ad_id, campaign_name } = data;
  if (!leadgen_id) return;

  // Fetch lead details from Meta
  const { data: lead } = await axios.get(`${BASE}/${leadgen_id}`, {
    params: { access_token: token(), fields: 'field_data,created_time,form_id,ad_id,ad_name,campaign_id,campaign_name' }
  });

  const fields = {};
  for (const f of (lead.field_data || [])) {
    fields[f.name] = f.values?.[0];
  }

  // Check for existing contact
  const email = fields.email || fields['email_address'];
  const phone = fields.phone_number || fields['phone'];
  let contact = null;
  if (email) contact = db.prepare('SELECT id FROM contacts WHERE email = ?').get(email);
  if (!contact && phone) contact = db.prepare('SELECT id FROM contacts WHERE phone = ?').get(phone);

  let contact_id = contact?.id;
  if (!contact_id) {
    const r = db.prepare(`
      INSERT INTO contacts (first_name, last_name, email, phone, source, meta_lead_id, status)
      VALUES (?, ?, ?, ?, 'meta_lead', ?, 'lead')
    `).run(
      fields.first_name || fields['full_name']?.split(' ')[0] || 'Unknown',
      fields.last_name || fields['full_name']?.split(' ').slice(1).join(' ') || null,
      email || null, phone || null, leadgen_id
    );
    contact_id = r.lastInsertRowid;
  } else {
    db.prepare("UPDATE contacts SET meta_lead_id=?, source='meta_lead', updated_at=datetime('now') WHERE id=?").run(leadgen_id, contact_id);
  }

  // Save raw lead
  db.prepare(`
    INSERT OR IGNORE INTO meta_leads (lead_gen_id, form_id, ad_id, campaign_name, contact_id, raw_data)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(leadgen_id, form_id || lead.form_id, ad_id || lead.ad_id, campaign_name || lead.campaign_name, contact_id, JSON.stringify(lead));
}

// ── Sync Ads Insights ───────────────────────────────────────────────────────
router.post('/sync-ads', async (req, res) => {
  const { date_preset = 'last_30d' } = req.body;
  const adAccountId = process.env.META_AD_ACCOUNT_ID;
  if (!adAccountId) return res.status(400).json({ error: 'META_AD_ACCOUNT_ID not configured' });

  try {
    const { data } = await axios.get(`${BASE}/${adAccountId}/insights`, {
      params: {
        access_token: token(),
        date_preset,
        level: 'ad',
        fields: 'ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,impressions,clicks,spend,reach,cpc,cpm,ctr,cost_per_lead,date_start,date_stop',
        limit: 500
      }
    });

    const stmt = db.prepare(`
      INSERT INTO meta_ads (ad_id, ad_name, adset_id, adset_name, campaign_id, campaign_name,
        impressions, clicks, spend, reach, cpc, cpm, ctr, cost_per_lead, date_start, date_stop, synced_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
      ON CONFLICT(ad_id) DO UPDATE SET
        impressions=excluded.impressions, clicks=excluded.clicks, spend=excluded.spend,
        reach=excluded.reach, cpc=excluded.cpc, cpm=excluded.cpm, ctr=excluded.ctr,
        cost_per_lead=excluded.cost_per_lead, synced_at=excluded.synced_at
    `);

    const upsert = db.transaction((rows) => {
      for (const r of rows) stmt.run(r.ad_id, r.ad_name, r.adset_id, r.adset_name, r.campaign_id, r.campaign_name,
        Number(r.impressions)||0, Number(r.clicks)||0, Number(r.spend)||0, Number(r.reach)||0,
        Number(r.cpc)||0, Number(r.cpm)||0, Number(r.ctr)||0, Number(r.cost_per_lead)||0,
        r.date_start, r.date_stop);
    });

    upsert(data.data || []);
    res.json({ synced: (data.data || []).length });
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// ── Fetch Leads from a form ─────────────────────────────────────────────────
router.post('/sync-leads', async (req, res) => {
  const { form_id } = req.body;
  if (!form_id) return res.status(400).json({ error: 'form_id required' });

  try {
    const { data } = await axios.get(`${BASE}/${form_id}/leads`, {
      params: {
        access_token: token(),
        fields: 'id,field_data,created_time,ad_id,ad_name,campaign_id,campaign_name',
        limit: 100
      }
    });

    let imported = 0;
    for (const lead of (data.data || [])) {
      const fields = {};
      for (const f of (lead.field_data || [])) fields[f.name] = f.values?.[0];

      const email = fields.email || fields['email_address'];
      const phone = fields.phone_number || fields['phone'];
      let contact = null;
      if (email) contact = db.prepare('SELECT id FROM contacts WHERE email = ?').get(email);
      if (!contact && phone) contact = db.prepare('SELECT id FROM contacts WHERE phone = ?').get(phone);

      let contact_id = contact?.id;
      if (!contact_id) {
        const r = db.prepare(`
          INSERT INTO contacts (first_name, last_name, email, phone, source, meta_lead_id, status)
          VALUES (?, ?, ?, ?, 'meta_lead', ?, 'lead')
        `).run(
          fields.first_name || fields['full_name']?.split(' ')[0] || 'Unknown',
          fields.last_name || fields['full_name']?.split(' ').slice(1).join(' ') || null,
          email || null, phone || null, lead.id
        );
        contact_id = r.lastInsertRowid;
      }

      db.prepare(`
        INSERT OR IGNORE INTO meta_leads (lead_gen_id, form_id, ad_id, campaign_name, contact_id, raw_data)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(lead.id, form_id, lead.ad_id, lead.campaign_name, contact_id, JSON.stringify(lead));
      imported++;
    }
    res.json({ imported });
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// ── Read stored ads / leads ─────────────────────────────────────────────────
router.get('/ads', (req, res) => {
  const ads = db.prepare('SELECT * FROM meta_ads ORDER BY spend DESC').all();
  const summary = db.prepare(`
    SELECT SUM(spend) as total_spend, SUM(clicks) as total_clicks,
    SUM(impressions) as total_impressions, SUM(leads) as total_leads,
    COUNT(*) as ad_count FROM meta_ads
  `).get();
  res.json({ ads, summary });
});

router.get('/leads', (req, res) => {
  const leads = db.prepare(`
    SELECT ml.*, c.first_name, c.last_name, c.email, c.phone
    FROM meta_leads ml LEFT JOIN contacts c ON ml.contact_id = c.id
    ORDER BY ml.created_at DESC
  `).all();
  res.json(leads);
});

// ── Lead forms list ─────────────────────────────────────────────────────────
router.get('/forms', async (req, res) => {
  const adAccountId = process.env.META_AD_ACCOUNT_ID;
  if (!adAccountId) return res.status(400).json({ error: 'META_AD_ACCOUNT_ID not configured' });
  try {
    const { data } = await axios.get(`${BASE}/${adAccountId}/leadgen_forms`, {
      params: { access_token: token(), fields: 'id,name,status,leads_count,created_time', limit: 100 }
    });
    res.json(data.data || []);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

module.exports = router;
