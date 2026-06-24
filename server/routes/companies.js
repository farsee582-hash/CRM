const express = require('express')
const router = express.Router()
const { all, get, run } = require('../db')

router.get('/', async (req, res) => {
  const { search = '' } = req.query
  const companies = await all(`
    SELECT c.*, COUNT(ct.id)::int as contact_count
    FROM companies c
    LEFT JOIN contacts ct ON ct.company_id = c.id
    WHERE c.name ILIKE $1
    GROUP BY c.id
    ORDER BY c.name ASC
  `, [`%${search}%`])
  res.json({ companies })
})

router.post('/', async (req, res) => {
  const { name, industry, website, phone, email, address, city, country, employees, annual_revenue, notes } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  const r = await run(`
    INSERT INTO companies (name,industry,website,phone,email,address,city,country,employees,annual_revenue,notes)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id
  `, [name,industry,website,phone,email,address,city,country,employees||null,annual_revenue||null,notes])
  res.status(201).json({ id: r.rows[0].id })
})

router.put('/:id', async (req, res) => {
  const fields = ['name','industry','website','phone','email','address','city','country','employees','annual_revenue','notes']
  const updates = []; const params = []
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = $${params.length+1}`); params.push(req.body[f]) }
  }
  if (!updates.length) return res.status(400).json({ error: 'nothing to update' })
  updates.push(`updated_at = NOW()`)
  params.push(req.params.id)
  await run(`UPDATE companies SET ${updates.join(',')} WHERE id = $${params.length}`, params)
  res.json({ ok: true })
})

router.delete('/:id', async (req, res) => {
  await run('DELETE FROM companies WHERE id = $1', [req.params.id])
  res.json({ ok: true })
})

module.exports = router
