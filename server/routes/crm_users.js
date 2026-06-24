const express = require('express')
const router = express.Router()
const { all, run } = require('../db')

router.get('/', async (req, res) => {
  const rows = await all(`
    SELECT u.*, s.name as showroom_name,
      COUNT(DISTINCT c.id)::int as lead_count,
      COALESCE(SUM(sl.amount),0) as total_sales
    FROM crm_users u
    LEFT JOIN showrooms s ON u.showroom_id = s.id
    LEFT JOIN contacts c ON c.assigned_to = u.id
    LEFT JOIN sales sl ON sl.assigned_to = u.id
    WHERE u.is_active = TRUE
    GROUP BY u.id, s.name ORDER BY u.name
  `)
  res.json(rows)
})

router.post('/', async (req, res) => {
  const { name, email, phone, role, showroom_id } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  const r = await run(
    'INSERT INTO crm_users (name,email,phone,role,showroom_id) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [name, email, phone, role||'sales_rep', showroom_id||null]
  )
  res.status(201).json({ id: r.rows[0].id })
})

router.put('/:id', async (req, res) => {
  const fields = ['name','email','phone','role','showroom_id','is_active']
  const updates = []; const params = []
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f}=$${params.length+1}`); params.push(req.body[f]) }
  }
  params.push(req.params.id)
  await run(`UPDATE crm_users SET ${updates.join(',')} WHERE id=$${params.length}`, params)
  res.json({ ok: true })
})

router.delete('/:id', async (req, res) => {
  await run('UPDATE crm_users SET is_active=FALSE WHERE id=$1', [req.params.id])
  res.json({ ok: true })
})

module.exports = router
