const express = require('express')
const router = express.Router()
const axios = require('axios')
const { run, get, all } = require('../db')

const BASE = 'https://graph.facebook.com/v19.0'
const token = () => process.env.META_ACCESS_TOKEN

router.get('/webhook', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': verify, 'hub.challenge': challenge } = req.query
  if (mode === 'subscribe' && verify === process.env.META_VERIFY_TOKEN) return res.send(challenge)
  res.sendStatus(403)
})

router.post('/webhook', (req, res) => {
  const body = req.body
  if (body.object === 'page' || body.object === 'leadgen') {
    for (const entry of (body.entry || [])) {
      for (const change of (entry.changes || [])) {
        if (change.field === 'leadgen') processLeadWebhook(change.value).catch(console.error)
      }
    }
  }
  res.sendStatus(200)
})

async function processLeadWebhook(data) {
  const { leadgen_id, form_id, ad_id, campaign_name } = data
  if (!leadgen_id) return
  const { data: lead } = await axios.get(`${BASE}/${leadgen_id}`, {
    params: { access_token: token(), fields: 'field_data,created_time,form_id,ad_id,ad_name,campaign_id,campaign_name' }
  })
  const fields = {}
  for (const f of (lead.field_data || [])) fields[f.name] = f.values?.[0]
  const email = fields.email || fields['email_address']
  const phone = fields.phone_number || fields['phone']

  let contact = null
  if (email) contact = await get('SELECT id FROM contacts WHERE email=$1', [email])
  if (!contact && phone) contact = await get('SELECT id FROM contacts WHERE phone=$1', [phone])

  let contact_id = contact?.id
  if (!contact_id) {
    const r = await run(`INSERT INTO contacts (first_name,last_name,email,phone,source,meta_lead_id,status) VALUES ($1,$2,$3,$4,'meta_lead',$5,'lead') RETURNING id`,
      [fields.first_name || fields['full_name']?.split(' ')[0] || 'Unknown', fields.last_name || fields['full_name']?.split(' ').slice(1).join(' ') || null, email||null, phone||null, leadgen_id])
    contact_id = r.rows[0].id
  } else {
    await run("UPDATE contacts SET meta_lead_id=$1, source='meta_lead', updated_at=NOW() WHERE id=$2", [leadgen_id, contact_id])
  }

  await run(`INSERT INTO meta_leads (lead_gen_id,form_id,ad_id,campaign_name,contact_id,raw_data) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (lead_gen_id) DO NOTHING`,
    [leadgen_id, form_id||lead.form_id, ad_id||lead.ad_id, campaign_name||lead.campaign_name, contact_id, JSON.stringify(lead)])
}

router.post('/sync-ads', async (req, res) => {
  const { date_preset = 'last_30d' } = req.body
  const adAccountId = process.env.META_AD_ACCOUNT_ID
  if (!adAccountId) return res.status(400).json({ error: 'META_AD_ACCOUNT_ID not configured' })
  try {
    const { data } = await axios.get(`${BASE}/${adAccountId}/insights`, {
      params: { access_token: token(), date_preset, level: 'ad', fields: 'ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,impressions,clicks,spend,reach,cpc,cpm,ctr,cost_per_lead,date_start,date_stop', limit: 500 }
    })
    let synced = 0
    for (const r of (data.data || [])) {
      await run(`
        INSERT INTO meta_ads (ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,impressions,clicks,spend,reach,cpc,cpm,ctr,cost_per_lead,date_start,date_stop,synced_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW())
        ON CONFLICT (ad_id) DO UPDATE SET impressions=EXCLUDED.impressions,clicks=EXCLUDED.clicks,spend=EXCLUDED.spend,reach=EXCLUDED.reach,cpc=EXCLUDED.cpc,cpm=EXCLUDED.cpm,ctr=EXCLUDED.ctr,cost_per_lead=EXCLUDED.cost_per_lead,synced_at=NOW()
      `, [r.ad_id,r.ad_name,r.adset_id,r.adset_name,r.campaign_id,r.campaign_name,r.impressions||0,r.clicks||0,r.spend||0,r.reach||0,r.cpc||0,r.cpm||0,r.ctr||0,r.cost_per_lead||0,r.date_start,r.date_stop])
      synced++
    }
    res.json({ synced })
  } catch (err) { res.status(500).json({ error: err.response?.data || err.message }) }
})

router.post('/sync-leads', async (req, res) => {
  const { form_id } = req.body
  if (!form_id) return res.status(400).json({ error: 'form_id required' })
  try {
    const { data } = await axios.get(`${BASE}/${form_id}/leads`, {
      params: { access_token: token(), fields: 'id,field_data,created_time,ad_id,ad_name,campaign_id,campaign_name', limit: 100 }
    })
    let imported = 0
    for (const lead of (data.data || [])) {
      const fields = {}
      for (const f of (lead.field_data || [])) fields[f.name] = f.values?.[0]
      const email = fields.email || fields['email_address']
      const phone = fields.phone_number || fields['phone']

      let contact = null
      if (email) contact = await get('SELECT id FROM contacts WHERE email=$1', [email])
      if (!contact && phone) contact = await get('SELECT id FROM contacts WHERE phone=$1', [phone])

      let contact_id = contact?.id
      if (!contact_id) {
        const r = await run(`INSERT INTO contacts (first_name,last_name,email,phone,source,meta_lead_id,status) VALUES ($1,$2,$3,$4,'meta_lead',$5,'lead') RETURNING id`,
          [fields.first_name || 'Unknown', fields.last_name||null, email||null, phone||null, lead.id])
        contact_id = r.rows[0].id
      }
      await run(`INSERT INTO meta_leads (lead_gen_id,form_id,ad_id,campaign_name,contact_id,raw_data) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (lead_gen_id) DO NOTHING`,
        [lead.id, form_id, lead.ad_id, lead.campaign_name, contact_id, JSON.stringify(lead)])
      imported++
    }
    res.json({ imported })
  } catch (err) { res.status(500).json({ error: err.response?.data || err.message }) }
})

router.get('/ads', async (req, res) => {
  const ads = await all('SELECT * FROM meta_ads ORDER BY spend DESC')
  const summary = await get('SELECT COALESCE(SUM(spend),0) as total_spend, COALESCE(SUM(clicks),0) as total_clicks, COALESCE(SUM(impressions),0) as total_impressions, COALESCE(SUM(leads),0) as total_leads FROM meta_ads')
  res.json({ ads, summary })
})

router.get('/leads', async (req, res) => {
  const leads = await all(`SELECT ml.*, c.first_name, c.last_name, c.email, c.phone FROM meta_leads ml LEFT JOIN contacts c ON ml.contact_id=c.id ORDER BY ml.created_at DESC`)
  res.json(leads)
})

router.get('/forms', async (req, res) => {
  const adAccountId = process.env.META_AD_ACCOUNT_ID
  if (!adAccountId) return res.status(400).json({ error: 'META_AD_ACCOUNT_ID not configured' })
  try {
    const { data } = await axios.get(`${BASE}/${adAccountId}/leadgen_forms`, {
      params: { access_token: token(), fields: 'id,name,status,leads_count,created_time', limit: 100 }
    })
    res.json(data.data || [])
  } catch (err) { res.status(500).json({ error: err.response?.data || err.message }) }
})

module.exports = router
