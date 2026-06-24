const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const { search, status, source, limit = 50, offset = 0 } = req.query;
  let sql = 'SELECT * FROM contacts WHERE 1=1';
  const params = [];

  if (search) {
    sql += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR company LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (source) { sql += ' AND source = ?'; params.push(source); }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const contacts = db.prepare(sql).all(...params);
  const total = db.prepare('SELECT COUNT(*) as n FROM contacts').get().n;
  res.json({ contacts, total });
});

router.get('/:id', (req, res) => {
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
  if (!contact) return res.status(404).json({ error: 'Not found' });

  const notes = db.prepare('SELECT * FROM notes WHERE contact_id = ? ORDER BY created_at DESC').all(contact.id);
  const tasks = db.prepare('SELECT * FROM tasks WHERE contact_id = ? ORDER BY due_date ASC').all(contact.id);
  const deals = db.prepare('SELECT * FROM deals WHERE contact_id = ? ORDER BY created_at DESC').all(contact.id);
  const messages = db.prepare('SELECT * FROM whatsapp_messages WHERE contact_id = ? ORDER BY timestamp DESC LIMIT 50').all(contact.id);

  res.json({ ...contact, notes, tasks, deals, messages });
});

router.post('/', (req, res) => {
  const { first_name, last_name, email, phone, company, job_title, status, source, tags } = req.body;
  if (!first_name) return res.status(400).json({ error: 'first_name required' });

  const result = db.prepare(`
    INSERT INTO contacts (first_name, last_name, email, phone, company, job_title, status, source, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(first_name, last_name, email, phone, company, job_title, status || 'lead', source || 'manual', JSON.stringify(tags || []));

  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const fields = ['first_name', 'last_name', 'email', 'phone', 'company', 'job_title', 'status', 'source', 'tags', 'whatsapp_id'];
  const updates = [];
  const params = [];

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(f === 'tags' ? JSON.stringify(req.body[f]) : req.body[f]);
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'No fields to update' });

  updates.push("updated_at = datetime('now')");
  params.push(req.params.id);

  db.prepare(`UPDATE contacts SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
