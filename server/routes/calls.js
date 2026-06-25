const express = require('express')
const router = express.Router()
const { all, run } = require('../db')

router.get('/', async (req, res) => {
  const { call_type, call_outcome, assigned_to } = req.query
  let sql = `
    SELECT cl.*,
      c.first_name || ' ' || COALESCE(c.last_name,'') as contact_name,
      u.name as assigned_name
    FROM calls cl
    LEFT JOIN contacts c ON cl.contact_id = c.id
    LEFT JOIN crm_users u ON cl.assigned_to = u.id
    WHERE 1=1
  `
  const params = []
  if (call_type) { params.push(call_type); sql += ` AND cl.call_type=$${params.length}` }
  if (call_outcome) { params.push(call_outcome); sql += ` AND cl.call_outcome=$${params.length}` }
  if (assigned_to) { params.push(assigned_to); sql += ` AND cl.assigned_to=$${params.length}` }
  sql += ' ORDER BY cl.start_time DESC'
  res.json(await all(sql, params))
})

router.post('/', async (req, res) => {
  const { contact_id, assigned_to, call_type, call_outcome, start_time, duration_minutes, notes } = req.body
  const r = await run(
    `INSERT INTO calls (contact_id,assigned_to,call_type,call_outcome,start_time,duration_minutes,notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [contact_id||null, assigned_to||null, call_type||'outbound', call_outcome||'connected',
     start_time||null, duration_minutes||0, notes||null]
  )
  res.status(201).json({ id: r.rows[0].id })
})

router.put('/:id', async (req, res) => {
  const fields = ['contact_id','assigned_to','call_type','call_outcome','start_time','duration_minutes','notes']
  const updates = []; const params = []
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f}=$${params.length+1}`); params.push(req.body[f]) }
  }
  params.push(req.params.id)
  await run(`UPDATE calls SET ${updates.join(',')} WHERE id=$${params.length}`, params)
  res.json({ ok: true })
})

router.delete('/:id', async (req, res) => {
  await run('DELETE FROM calls WHERE id=$1', [req.params.id])
  res.json({ ok: true })
})

module.exports = router
