const express = require('express')
const router = express.Router()
const { all, run, get } = require('../db')

router.get('/', async (req, res) => {
  const { status, assigned_to, showroom_id } = req.query
  let sql = `
    SELECT e.*,
      c.first_name || ' ' || COALESCE(c.last_name,'') as contact_name,
      u.name as assigned_name,
      sh.name as showroom_name
    FROM events e
    LEFT JOIN contacts c ON e.contact_id = c.id
    LEFT JOIN crm_users u ON e.assigned_to = u.id
    LEFT JOIN showrooms sh ON e.showroom_id = sh.id
    WHERE 1=1
  `
  const params = []
  if (status) { params.push(status); sql += ` AND e.status=$${params.length}` }
  if (assigned_to) { params.push(assigned_to); sql += ` AND e.assigned_to=$${params.length}` }
  if (showroom_id) { params.push(showroom_id); sql += ` AND e.showroom_id=$${params.length}` }
  sql += ' ORDER BY e.start_time ASC'
  res.json(await all(sql, params))
})

router.post('/', async (req, res) => {
  const { title, description, contact_id, assigned_to, showroom_id, start_time, end_time, reminder_minutes } = req.body
  if (!title) return res.status(400).json({ error: 'title required' })
  const r = await run(
    `INSERT INTO events (title,description,contact_id,assigned_to,showroom_id,start_time,end_time,reminder_minutes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [title, description||null, contact_id||null, assigned_to||null, showroom_id||null,
     start_time||null, end_time||null, reminder_minutes||30]
  )
  res.status(201).json({ id: r.rows[0].id })
})

router.put('/:id', async (req, res) => {
  const fields = ['title','description','contact_id','assigned_to','showroom_id','start_time','end_time','reminder_minutes','status']
  const updates = []; const params = []
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f}=$${params.length+1}`); params.push(req.body[f]) }
  }
  params.push(req.params.id)
  await run(`UPDATE events SET ${updates.join(',')} WHERE id=$${params.length}`, params)
  res.json({ ok: true })
})

router.delete('/:id', async (req, res) => {
  await run('DELETE FROM events WHERE id=$1', [req.params.id])
  res.json({ ok: true })
})

module.exports = router
