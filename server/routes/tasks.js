const express = require('express')
const router = express.Router()
const { all, run } = require('../db')

router.get('/', async (req, res) => {
  const { status, contact_id, deal_id, priority } = req.query
  let sql = `
    SELECT t.*, c.first_name || ' ' || COALESCE(c.last_name,'') as contact_name, d.title as deal_title
    FROM tasks t
    LEFT JOIN contacts c ON t.contact_id=c.id
    LEFT JOIN deals d ON t.deal_id=d.id
    WHERE 1=1
  `
  const params = []
  if (status) { params.push(status); sql += ` AND t.status=$${params.length}` }
  if (contact_id) { params.push(contact_id); sql += ` AND t.contact_id=$${params.length}` }
  if (deal_id) { params.push(deal_id); sql += ` AND t.deal_id=$${params.length}` }
  if (priority) { params.push(priority); sql += ` AND t.priority=$${params.length}` }
  sql += ' ORDER BY t.due_date ASC NULLS LAST, t.priority DESC'
  res.json(await all(sql, params))
})

router.post('/', async (req, res) => {
  const { title, description, type, contact_id, deal_id, due_date, priority, status } = req.body
  if (!title) return res.status(400).json({ error: 'title required' })
  const r = await run(`
    INSERT INTO tasks (title,description,type,contact_id,deal_id,due_date,priority,status)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id
  `, [title,description,type||'task',contact_id||null,deal_id||null,due_date||null,priority||'medium',status||'pending'])
  res.status(201).json({ id: r.rows[0].id })
})

router.put('/:id', async (req, res) => {
  const fields = ['title','description','type','contact_id','deal_id','due_date','priority','status']
  const updates = []; const params = []
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f}=$${params.length+1}`); params.push(req.body[f]) }
  }
  if (!updates.length) return res.status(400).json({ error: 'nothing to update' })
  updates.push('updated_at=NOW()')
  params.push(req.params.id)
  await run(`UPDATE tasks SET ${updates.join(',')} WHERE id=$${params.length}`, params)
  res.json({ ok: true })
})

router.delete('/:id', async (req, res) => {
  await run('DELETE FROM tasks WHERE id=$1', [req.params.id])
  res.json({ ok: true })
})

module.exports = router
