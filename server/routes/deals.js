const express = require('express')
const router = express.Router()
const { all, get, run } = require('../db')

const STAGES = ['prospecting','qualification','proposal','negotiation','closed_won','closed_lost']

router.get('/', async (req, res) => {
  const { stage, contact_id } = req.query
  let sql = `
    SELECT d.*, c.first_name || ' ' || COALESCE(c.last_name,'') as contact_name
    FROM deals d LEFT JOIN contacts c ON d.contact_id=c.id WHERE 1=1
  `
  const params = []
  if (stage) { params.push(stage); sql += ` AND d.stage=$${params.length}` }
  if (contact_id) { params.push(contact_id); sql += ` AND d.contact_id=$${params.length}` }
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
    SELECT d.*, c.first_name || ' ' || COALESCE(c.last_name,'') as contact_name
    FROM deals d LEFT JOIN contacts c ON d.contact_id=c.id WHERE d.id=$1
  `, [req.params.id])
  if (!deal) return res.status(404).json({ error: 'Not found' })
  const [notes, tasks] = await Promise.all([
    all('SELECT * FROM notes WHERE deal_id=$1 ORDER BY created_at DESC', [deal.id]),
    all('SELECT * FROM tasks WHERE deal_id=$1 ORDER BY due_date ASC', [deal.id]),
  ])
  res.json({ ...deal, notes, tasks })
})

router.post('/', async (req, res) => {
  const { title, contact_id, company_id, value, currency, stage, probability, expected_close, notes } = req.body
  if (!title) return res.status(400).json({ error: 'title required' })
  const r = await run(`
    INSERT INTO deals (title,contact_id,company_id,value,currency,stage,probability,expected_close,notes)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id
  `, [title,contact_id||null,company_id||null,value||0,currency||'USD',stage||'prospecting',probability||0,expected_close||null,notes])
  res.status(201).json({ id: r.rows[0].id })
})

router.put('/:id', async (req, res) => {
  const fields = ['title','contact_id','company_id','value','currency','stage','probability','expected_close','notes']
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
