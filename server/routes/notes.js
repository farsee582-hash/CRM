const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const { contact_id, deal_id, type } = req.query;
  let sql = 'SELECT * FROM notes WHERE 1=1';
  const params = [];
  if (contact_id) { sql += ' AND contact_id = ?'; params.push(contact_id); }
  if (deal_id) { sql += ' AND deal_id = ?'; params.push(deal_id); }
  if (type) { sql += ' AND type = ?'; params.push(type); }
  sql += ' ORDER BY created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

router.post('/', (req, res) => {
  const { contact_id, deal_id, type, body, direction } = req.body;
  if (!body) return res.status(400).json({ error: 'body required' });

  const result = db.prepare(`
    INSERT INTO notes (contact_id, deal_id, type, body, direction)
    VALUES (?, ?, ?, ?, ?)
  `).run(contact_id, deal_id, type || 'note', body, direction || 'outbound');

  res.status(201).json({ id: result.lastInsertRowid });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
