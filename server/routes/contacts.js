const express = require('express')
const router = express.Router()
const { all, get, run, pool } = require('../db')

router.get('/', async (req, res) => {
  const { search='', status='', source='', lead_stage='', showroom_id='', assigned_to='', campaign_id='', limit=100, offset=0 } = req.query
  let sql = `
    SELECT c.*,
      sh.name as showroom_name,
      u.name as assigned_name,
      cp.name as campaign_name
    FROM contacts c
    LEFT JOIN showrooms sh ON c.showroom_id = sh.id
    LEFT JOIN crm_users u ON c.assigned_to = u.id
    LEFT JOIN campaigns cp ON c.campaign_id = cp.id
    WHERE 1=1
  `
  const params = []
  const add = (val, clause) => { params.push(val); sql += ` AND ${clause.replace('?', `$${params.length}`)}` }

  if (search) { params.push(`%${search}%`); sql += ` AND (c.first_name ILIKE $${params.length} OR c.last_name ILIKE $${params.length} OR c.email ILIKE $${params.length} OR c.phone ILIKE $${params.length})` }
  if (status) add(status, 'c.status=?')
  if (source) add(source, 'c.source=?')
  if (lead_stage) add(lead_stage, 'c.lead_stage=?')
  if (showroom_id) add(showroom_id, 'c.showroom_id=?')
  if (assigned_to) add(assigned_to, 'c.assigned_to=?')
  if (campaign_id) add(campaign_id, 'c.campaign_id=?')

  sql += ` ORDER BY c.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`
  params.push(Number(limit), Number(offset))

  const contacts = await all(sql, params)
  const { rows:[{n}] } = await pool.query('SELECT COUNT(*)::int as n FROM contacts')
  res.json({ contacts, total: n })
})

router.get('/:id', async (req, res) => {
  const contact = await get(`
    SELECT c.*, sh.name as showroom_name, u.name as assigned_name, cp.name as campaign_name
    FROM contacts c
    LEFT JOIN showrooms sh ON c.showroom_id=sh.id
    LEFT JOIN crm_users u ON c.assigned_to=u.id
    LEFT JOIN campaigns cp ON c.campaign_id=cp.id
    WHERE c.id=$1
  `, [req.params.id])
  if (!contact) return res.status(404).json({ error: 'Not found' })

  const [notes, tasks, deals, messages, sales] = await Promise.all([
    all('SELECT * FROM notes WHERE contact_id=$1 ORDER BY created_at DESC', [contact.id]),
    all('SELECT * FROM tasks WHERE contact_id=$1 ORDER BY due_date ASC', [contact.id]),
    all('SELECT * FROM deals WHERE contact_id=$1 ORDER BY created_at DESC', [contact.id]),
    all('SELECT * FROM whatsapp_messages WHERE contact_id=$1 ORDER BY timestamp DESC LIMIT 50', [contact.id]),
    all('SELECT * FROM sales WHERE contact_id=$1 ORDER BY sale_date DESC', [contact.id]),
  ])
  res.json({ ...contact, notes, tasks, deals, messages, sales })
})

router.post('/', async (req, res) => {
  const { first_name, last_name, email, phone, company_id, company, job_title,
    lead_stage, status, source, showroom_id, assigned_to, campaign_id, whatsapp_id, tags } = req.body
  if (!first_name) return res.status(400).json({ error: 'first_name required' })
  const r = await run(`
    INSERT INTO contacts
      (first_name,last_name,email,phone,company_id,company,job_title,lead_stage,status,source,showroom_id,assigned_to,campaign_id,whatsapp_id,tags)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id
  `, [first_name,last_name,email,phone,company_id||null,company,job_title,
      lead_stage||'new',status||'lead',source||'manual',showroom_id||null,assigned_to||null,campaign_id||null,whatsapp_id,JSON.stringify(tags||[])])
  res.status(201).json({ id: r.rows[0].id })
})

router.put('/:id', async (req, res) => {
  const fields = ['first_name','last_name','email','phone','company_id','company','job_title',
    'lead_stage','status','source','showroom_id','assigned_to','campaign_id','whatsapp_id','tags']
  const updates = []; const params = []
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f}=$${params.length+1}`)
      params.push(f==='tags' ? JSON.stringify(req.body[f]) : req.body[f])
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'nothing to update' })
  updates.push('updated_at=NOW()')
  params.push(req.params.id)
  await run(`UPDATE contacts SET ${updates.join(',')} WHERE id=$${params.length}`, params)
  res.json({ ok: true })
})

router.delete('/:id', async (req, res) => {
  await run('DELETE FROM contacts WHERE id=$1', [req.params.id])
  res.json({ ok: true })
})

module.exports = router
