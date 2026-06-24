const express = require('express')
const router = express.Router()
const { all, get, run } = require('../db')

router.get('/', async (req, res) => {
  const { search = '', status = '', source = '', limit = 100, offset = 0 } = req.query
  let sql = `
    SELECT c.*, co.name as company_name
    FROM contacts c
    LEFT JOIN companies co ON c.company_id = co.id
    WHERE 1=1
  `
  const params = []
  if (search) { params.push(`%${search}%`); sql += ` AND (c.first_name ILIKE $${params.length} OR c.last_name ILIKE $${params.length} OR c.email ILIKE $${params.length} OR c.company ILIKE $${params.length})` }
  if (status) { params.push(status); sql += ` AND c.status = $${params.length}` }
  if (source) { params.push(source); sql += ` AND c.source = $${params.length}` }
  sql += ` ORDER BY c.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`
  params.push(Number(limit), Number(offset))

  const contacts = await all(sql, params)
  const { rows: [{ n }] } = await require('../db').pool.query('SELECT COUNT(*) as n FROM contacts')
  res.json({ contacts, total: Number(n) })
})

router.get('/:id', async (req, res) => {
  const contact = await get('SELECT c.*, co.name as company_name FROM contacts c LEFT JOIN companies co ON c.company_id=co.id WHERE c.id=$1', [req.params.id])
  if (!contact) return res.status(404).json({ error: 'Not found' })

  const [notes, tasks, deals, messages] = await Promise.all([
    all('SELECT * FROM notes WHERE contact_id=$1 ORDER BY created_at DESC', [contact.id]),
    all('SELECT * FROM tasks WHERE contact_id=$1 ORDER BY due_date ASC', [contact.id]),
    all('SELECT * FROM deals WHERE contact_id=$1 ORDER BY created_at DESC', [contact.id]),
    all('SELECT * FROM whatsapp_messages WHERE contact_id=$1 ORDER BY timestamp DESC LIMIT 50', [contact.id]),
  ])
  res.json({ ...contact, notes, tasks, deals, messages })
})

router.post('/', async (req, res) => {
  const { first_name, last_name, email, phone, company_id, company, job_title, status, source, tags, whatsapp_id } = req.body
  if (!first_name) return res.status(400).json({ error: 'first_name required' })
  const r = await run(`
    INSERT INTO contacts (first_name,last_name,email,phone,company_id,company,job_title,status,source,tags,whatsapp_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id
  `, [first_name,last_name,email,phone,company_id||null,company,job_title,status||'lead',source||'manual',JSON.stringify(tags||[]),whatsapp_id])
  res.status(201).json({ id: r.rows[0].id })
})

router.put('/:id', async (req, res) => {
  const fields = ['first_name','last_name','email','phone','company_id','company','job_title','status','source','tags','whatsapp_id']
  const updates = []; const params = []
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = $${params.length+1}`)
      params.push(f === 'tags' ? JSON.stringify(req.body[f]) : req.body[f])
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'nothing to update' })
  updates.push(`updated_at = NOW()`)
  params.push(req.params.id)
  await run(`UPDATE contacts SET ${updates.join(',')} WHERE id = $${params.length}`, params)
  res.json({ ok: true })
})

router.delete('/:id', async (req, res) => {
  await run('DELETE FROM contacts WHERE id=$1', [req.params.id])
  res.json({ ok: true })
})

module.exports = router
