const express = require('express')
const router = express.Router()
const { all, run } = require('../db')

router.get('/', async (req, res) => {
  const { contact_id, deal_id, type } = req.query
  let sql = 'SELECT * FROM notes WHERE 1=1'
  const params = []
  if (contact_id) { params.push(contact_id); sql += ` AND contact_id=$${params.length}` }
  if (deal_id) { params.push(deal_id); sql += ` AND deal_id=$${params.length}` }
  if (type) { params.push(type); sql += ` AND type=$${params.length}` }
  sql += ' ORDER BY created_at DESC'
  res.json(await all(sql, params))
})

router.post('/', async (req, res) => {
  const { contact_id, deal_id, type, body, direction } = req.body
  if (!body) return res.status(400).json({ error: 'body required' })
  const r = await run(`
    INSERT INTO notes (contact_id,deal_id,type,body,direction) VALUES ($1,$2,$3,$4,$5) RETURNING id
  `, [contact_id||null,deal_id||null,type||'note',body,direction||'outbound'])
  res.status(201).json({ id: r.rows[0].id })
})

router.delete('/:id', async (req, res) => {
  await run('DELETE FROM notes WHERE id=$1', [req.params.id])
  res.json({ ok: true })
})

module.exports = router
