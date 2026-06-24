const express = require('express')
const router = express.Router()
const { all, get, run } = require('../db')

router.get('/', async (req, res) => {
  const rows = await all(`
    SELECT s.*, COUNT(DISTINCT c.id)::int as lead_count, COUNT(DISTINCT sl.id)::int as sale_count
    FROM showrooms s
    LEFT JOIN contacts c ON c.showroom_id = s.id
    LEFT JOIN sales sl ON sl.showroom_id = s.id
    WHERE s.is_active = TRUE
    GROUP BY s.id ORDER BY s.name
  `)
  res.json(rows)
})

router.post('/', async (req, res) => {
  const { name, city, address, phone, manager_name } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  const r = await run(
    'INSERT INTO showrooms (name,city,address,phone,manager_name) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [name, city, address, phone, manager_name]
  )
  res.status(201).json({ id: r.rows[0].id })
})

router.put('/:id', async (req, res) => {
  const fields = ['name','city','address','phone','manager_name','is_active']
  const updates = []; const params = []
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f}=$${params.length+1}`); params.push(req.body[f]) }
  }
  params.push(req.params.id)
  await run(`UPDATE showrooms SET ${updates.join(',')} WHERE id=$${params.length}`, params)
  res.json({ ok: true })
})

router.delete('/:id', async (req, res) => {
  await run('UPDATE showrooms SET is_active=FALSE WHERE id=$1', [req.params.id])
  res.json({ ok: true })
})

module.exports = router
