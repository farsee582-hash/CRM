const express = require('express')
const router = express.Router()
const { get, all } = require('../db')

router.get('/', async (req, res) => {
  const [
    { n: contacts_total },
    { n: contacts_new },
    { n: leads_meta },
    { n: leads_whatsapp },
    { n: deals_open },
    { n: deals_won },
    { v: pipeline_value },
    { v: won_value },
    { n: tasks_pending },
    { n: tasks_overdue },
    { v: meta_spend },
    { n: meta_leads_total },
    { n: whatsapp_total },
    recent_contacts,
    recent_deals,
    upcoming_tasks
  ] = await Promise.all([
    get("SELECT COUNT(*)::int as n FROM contacts"),
    get("SELECT COUNT(*)::int as n FROM contacts WHERE created_at >= NOW() - INTERVAL '30 days'"),
    get("SELECT COUNT(*)::int as n FROM contacts WHERE source='meta_lead'"),
    get("SELECT COUNT(*)::int as n FROM contacts WHERE source='whatsapp'"),
    get("SELECT COUNT(*)::int as n FROM deals WHERE stage NOT IN ('closed_won','closed_lost')"),
    get("SELECT COUNT(*)::int as n FROM deals WHERE stage='closed_won'"),
    get("SELECT COALESCE(SUM(value),0) as v FROM deals WHERE stage NOT IN ('closed_won','closed_lost')"),
    get("SELECT COALESCE(SUM(value),0) as v FROM deals WHERE stage='closed_won'"),
    get("SELECT COUNT(*)::int as n FROM tasks WHERE status='pending'"),
    get("SELECT COUNT(*)::int as n FROM tasks WHERE status='pending' AND due_date < NOW()"),
    get("SELECT COALESCE(SUM(spend),0) as v FROM meta_ads"),
    get("SELECT COUNT(*)::int as n FROM meta_leads"),
    get("SELECT COUNT(*)::int as n FROM whatsapp_messages"),
    all("SELECT * FROM contacts ORDER BY created_at DESC LIMIT 5"),
    all(`SELECT d.*, c.first_name || ' ' || COALESCE(c.last_name,'') as contact_name FROM deals d LEFT JOIN contacts c ON d.contact_id=c.id ORDER BY d.created_at DESC LIMIT 5`),
    all(`SELECT t.*, c.first_name || ' ' || COALESCE(c.last_name,'') as contact_name FROM tasks t LEFT JOIN contacts c ON t.contact_id=c.id WHERE t.status='pending' ORDER BY t.due_date ASC NULLS LAST LIMIT 5`),
  ])

  res.json({
    contacts: { total: contacts_total, new_30d: contacts_new, from_meta: leads_meta, from_whatsapp: leads_whatsapp },
    deals: { open: deals_open, won: deals_won, pipeline_value: Number(pipeline_value), won_value: Number(won_value) },
    tasks: { pending: tasks_pending, overdue: tasks_overdue },
    meta: { total_spend: Number(meta_spend), total_leads: meta_leads_total },
    whatsapp: { total_messages: whatsapp_total },
    recent_contacts,
    recent_deals,
    upcoming_tasks
  })
})

module.exports = router
