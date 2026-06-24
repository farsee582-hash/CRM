const express = require('express')
const router = express.Router()
const { all, run } = require('../db')

router.get('/', async (req, res) => {
  const { showroom_id } = req.query
  let sql = `
    SELECT c.*, s.name as showroom_name,
      COUNT(DISTINCT ct.id)::int as lead_count,
      COALESCE(SUM(sl.amount),0) as total_sales
    FROM campaigns c
    LEFT JOIN showrooms s ON c.showroom_id = s.id
    LEFT JOIN contacts ct ON ct.campaign_id = c.id
    LEFT JOIN sales sl ON sl.campaign_id = c.id
    WHERE 1=1
  `
  const params = []
  if (showroom_id) { params.push(showroom_id); sql += ` AND c.showroom_id=$${params.length}` }
  sql += ' GROUP BY c.id, s.name ORDER BY c.created_at DESC'
  res.json(await all(sql, params))
})

router.post('/', async (req, res) => {
  const { name, source, showroom_id, budget, start_date, end_date, status, meta_campaign_id } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  const r = await run(
    'INSERT INTO campaigns (name,source,showroom_id,budget,start_date,end_date,status,meta_campaign_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
    [name, source, showroom_id||null, budget||null, start_date||null, end_date||null, status||'active', meta_campaign_id||null]
  )
  res.status(201).json({ id: r.rows[0].id })
})

router.put('/:id', async (req, res) => {
  const fields = ['name','source','showroom_id','budget','start_date','end_date','status']
  const updates = []; const params = []
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f}=$${params.length+1}`); params.push(req.body[f]) }
  }
  params.push(req.params.id)
  await run(`UPDATE campaigns SET ${updates.join(',')} WHERE id=$${params.length}`, params)
  res.json({ ok: true })
})

router.delete('/:id', async (req, res) => {
  await run('DELETE FROM campaigns WHERE id=$1', [req.params.id])
  res.json({ ok: true })
})

// Lead stage breakdown for a campaign
router.get('/:id/stats', async (req, res) => {
  const byStage = await all(
    'SELECT lead_stage, COUNT(*)::int as count FROM contacts WHERE campaign_id=$1 GROUP BY lead_stage',
    [req.params.id]
  )
  const bySource = await all(
    'SELECT source, COUNT(*)::int as count FROM contacts WHERE campaign_id=$1 GROUP BY source',
    [req.params.id]
  )
  const sales = await all(
    'SELECT product_category, COUNT(*)::int as count, COALESCE(SUM(amount),0) as total FROM sales WHERE campaign_id=$1 GROUP BY product_category',
    [req.params.id]
  )
  res.json({ byStage, bySource, sales })
})

module.exports = router
