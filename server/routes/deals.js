const express = require('express')
const router = express.Router()
const { all, get, run } = require('../db')

const STAGES = ['new_lead','proposal_shared','under_review','closed_won','closed_lost']

router.get('/', async (req, res) => {
  const { stage, contact_id, showroom_id, campaign_id, assigned_to } = req.query
  let sql = `
    SELECT d.*,
      c.first_name || ' ' || COALESCE(c.last_name,'') as contact_name,
      sh.name as showroom_name,
      u.name as assigned_name,
      cp.name as campaign_name
    FROM deals d
    LEFT JOIN contacts c ON d.contact_id=c.id
    LEFT JOIN showrooms sh ON d.showroom_id=sh.id
    LEFT JOIN crm_users u ON d.assigned_to=u.id
    LEFT JOIN campaigns cp ON d.campaign_id=cp.id
    WHERE 1=1
  `
  const params = []
  if (stage) { params.push(stage); sql += ` AND d.stage=$${params.length}` }
  if (contact_id) { params.push(contact_id); sql += ` AND d.contact_id=$${params.length}` }
  if (showroom_id) { params.push(showroom_id); sql += ` AND d.showroom_id=$${params.length}` }
  if (campaign_id) { params.push(campaign_id); sql += ` AND d.campaign_id=$${params.length}` }
  if (assigned_to) { params.push(assigned_to); sql += ` AND d.assigned_to=$${params.length}` }
  sql += ' ORDER BY d.created_at DESC'

  const deals = await all(sql, params)
  const pipeline = STAGES.map(s => ({
    stage: s,
    deals: deals.filter(d => d.stage === s),
    total: deals.filter(d => d.stage === s).reduce((sum, d) => sum + Number(d.value||0), 0)
  }))
  res.json({ deals, pipeline, stages: STAGES })
})

router.get('/:id', async (req, res) => {
  const deal = await get(`
    SELECT d.*, c.first_name || ' ' || COALESCE(c.last_name,'') as contact_name,
      sh.name as showroom_name, u.name as assigned_name
    FROM deals d
    LEFT JOIN contacts c ON d.contact_id=c.id
    LEFT JOIN showrooms sh ON d.showroom_id=sh.id
    LEFT JOIN crm_users u ON d.assigned_to=u.id
    WHERE d.id=$1
  `, [req.params.id])
  if (!deal) return res.status(404).json({ error: 'Not found' })
  const [notes, tasks] = await Promise.all([
    all('SELECT * FROM notes WHERE deal_id=$1 ORDER BY created_at DESC', [deal.id]),
    all('SELECT * FROM tasks WHERE deal_id=$1 ORDER BY due_date ASC', [deal.id]),
  ])
  res.json({ ...deal, notes, tasks })
})

router.post('/', async (req, res) => {
  const { title, contact_id, showroom_id, assigned_to, campaign_id, value, stage, probability, expected_close, notes } = req.body
  if (!title) return res.status(400).json({ error: 'title required' })
  const r = await run(`
    INSERT INTO deals (title,contact_id,showroom_id,assigned_to,campaign_id,value,currency,stage,probability,expected_close,notes)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id
  `, [title, contact_id||null, showroom_id||null, assigned_to||null, campaign_id||null,
      value||0, 'INR', stage||'new_lead', probability||0, expected_close||null, notes||null])
  res.status(201).json({ id: r.rows[0].id })
})

router.put('/:id', async (req, res) => {
  const fields = ['title','contact_id','showroom_id','assigned_to','campaign_id','value','stage','probability','expected_close','notes']
  const updates = []; const params = []
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f}=$${params.length+1}`); params.push(req.body[f]) }
  }
  if (!updates.length) return res.status(400).json({ error: 'nothing to update' })
  updates.push('updated_at=NOW()')
  params.push(req.params.id)
  await run(`UPDATE deals SET ${updates.join(',')} WHERE id=$${params.length}`, params)
  res.json({ ok: true })
})

router.delete('/:id', async (req, res) => {
  await run('DELETE FROM deals WHERE id=$1', [req.params.id])
  res.json({ ok: true })
})

module.exports = router
