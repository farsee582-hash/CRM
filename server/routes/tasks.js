const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const { status, contact_id, deal_id, priority } = req.query;
  let sql = `
    SELECT t.*, c.first_name || ' ' || COALESCE(c.last_name,'') as contact_name, d.title as deal_title
    FROM tasks t
    LEFT JOIN contacts c ON t.contact_id = c.id
    LEFT JOIN deals d ON t.deal_id = d.id
    WHERE 1=1
  `;
  const params = [];
  if (status) { sql += ' AND t.status = ?'; params.push(status); }
  if (contact_id) { sql += ' AND t.contact_id = ?'; params.push(contact_id); }
  if (deal_id) { sql += ' AND t.deal_id = ?'; params.push(deal_id); }
  if (priority) { sql += ' AND t.priority = ?'; params.push(priority); }
  sql += ' ORDER BY t.due_date ASC, t.priority DESC';

  res.json(db.prepare(sql).all(...params));
});

router.post('/', (req, res) => {
  const { title, description, contact_id, deal_id, due_date, priority, status } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });

  const result = db.prepare(`
    INSERT INTO tasks (title, description, contact_id, deal_id, due_date, priority, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title, description, contact_id, deal_id, due_date, priority || 'medium', status || 'pending');

  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const fields = ['title', 'description', 'contact_id', 'deal_id', 'due_date', 'priority', 'status'];
  const updates = [];
  const params = [];

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(req.body[f]);
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
  updates.push("updated_at = datetime('now')");
  params.push(req.params.id);
  db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
