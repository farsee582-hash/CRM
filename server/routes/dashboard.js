const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const contacts_total = db.prepare('SELECT COUNT(*) as n FROM contacts').get().n;
  const contacts_new = db.prepare("SELECT COUNT(*) as n FROM contacts WHERE created_at >= datetime('now','-30 days')").get().n;
  const leads_meta = db.prepare("SELECT COUNT(*) as n FROM contacts WHERE source='meta_lead'").get().n;
  const leads_whatsapp = db.prepare("SELECT COUNT(*) as n FROM contacts WHERE source='whatsapp'").get().n;

  const deals_open = db.prepare("SELECT COUNT(*) as n FROM deals WHERE stage NOT IN ('closed_won','closed_lost')").get().n;
  const deals_won = db.prepare("SELECT COUNT(*) as n FROM deals WHERE stage='closed_won'").get().n;
  const pipeline_value = db.prepare("SELECT SUM(value) as v FROM deals WHERE stage NOT IN ('closed_won','closed_lost')").get().v || 0;
  const won_value = db.prepare("SELECT SUM(value) as v FROM deals WHERE stage='closed_won'").get().v || 0;

  const tasks_pending = db.prepare("SELECT COUNT(*) as n FROM tasks WHERE status='pending'").get().n;
  const tasks_overdue = db.prepare("SELECT COUNT(*) as n FROM tasks WHERE status='pending' AND due_date < date('now')").get().n;

  const meta_spend = db.prepare('SELECT SUM(spend) as v FROM meta_ads').get().v || 0;
  const meta_leads_total = db.prepare('SELECT COUNT(*) as n FROM meta_leads').get().n;
  const whatsapp_total = db.prepare('SELECT COUNT(*) as n FROM whatsapp_messages').get().n;

  const recent_contacts = db.prepare('SELECT * FROM contacts ORDER BY created_at DESC LIMIT 5').all();
  const recent_deals = db.prepare(`
    SELECT d.*, c.first_name || ' ' || COALESCE(c.last_name,'') as contact_name
    FROM deals d LEFT JOIN contacts c ON d.contact_id=c.id
    ORDER BY d.created_at DESC LIMIT 5
  `).all();
  const upcoming_tasks = db.prepare(`
    SELECT t.*, c.first_name || ' ' || COALESCE(c.last_name,'') as contact_name
    FROM tasks t LEFT JOIN contacts c ON t.contact_id=c.id
    WHERE t.status='pending' ORDER BY t.due_date ASC LIMIT 5
  `).all();

  res.json({
    contacts: { total: contacts_total, new_30d: contacts_new, from_meta: leads_meta, from_whatsapp: leads_whatsapp },
    deals: { open: deals_open, won: deals_won, pipeline_value, won_value },
    tasks: { pending: tasks_pending, overdue: tasks_overdue },
    meta: { total_spend: meta_spend, total_leads: meta_leads_total },
    whatsapp: { total_messages: whatsapp_total },
    recent_contacts,
    recent_deals,
    upcoming_tasks
  });
});

module.exports = router;
