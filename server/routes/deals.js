const express = require('express');
const router = express.Router();
const db = require('../db');

const STAGES = ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];

router.get('/', (req, res) => {
  const { stage, contact_id } = req.query;
  let sql = `
    SELECT d.*, c.first_name || ' ' || COALESCE(c.last_name,'') as contact_name
    FROM deals d LEFT JOIN contacts c ON d.contact_id = c.id WHERE 1=1
  `;
  const params = [];
  if (stage) { sql += ' AND d.stage = ?'; params.push(stage); }
  if (contact_id) { sql += ' AND d.contact_id = ?'; params.push(contact_id); }
  sql += ' ORDER BY d.created_at DESC';

  const deals = db.prepare(sql).all(...params);

  const pipeline = STAGES.map(s => ({
    stage: s,
    deals: deals.filter(d => d.stage === s),
    total: deals.filter(d => d.stage === s).reduce((sum, d) => sum + d.value, 0)
  }));

  res.json({ deals, pipeline, stages: STAGES });
});

router.get('/:id', (req, res) => {
  const deal = db.prepare(`
    SELECT d.*, c.first_name || ' ' || COALESCE(c.last_name,'') as contact_name
    FROM deals d LEFT JOIN contacts c ON d.contact_id = c.id WHERE d.id = ?
  `).get(req.params.id);
  if (!deal) return res.status(404).json({ error: 'Not found' });

  const notes = db.prepare('SELECT * FROM notes WHERE deal_id = ? ORDER BY created_at DESC').all(deal.id);
  const tasks = db.prepare('SELECT * FROM tasks WHERE deal_id = ? ORDER BY due_date ASC').all(deal.id);
  res.json({ ...deal, notes, tasks });
});

router.post('/', (req, res) => {
  const { title, contact_id, value, currency, stage, probability, expected_close, notes } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });

  const result = db.prepare(`
    INSERT INTO deals (title, contact_id, value, currency, stage, probability, expected_close, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, contact_id, value || 0, currency || 'USD', stage || 'prospecting', probability || 0, expected_close, notes);

  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const fields = ['title', 'contact_id', 'value', 'currency', 'stage', 'probability', 'expected_close', 'notes'];
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
  db.prepare(`UPDATE deals SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM deals WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
