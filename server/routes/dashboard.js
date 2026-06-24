const express = require('express')
const router = express.Router()
const { get, all } = require('../db')

router.get('/', async (req, res) => {
  const { showroom_id } = req.query
  let sw = showroom_id ? `AND showroom_id=${parseInt(showroom_id)}` : ''
  let csw = showroom_id ? `WHERE showroom_id=${parseInt(showroom_id)}` : ''

  const [
    contacts_total, contacts_new, leads_meta, leads_whatsapp,
    deals_open, pipeline_value,
    tasks_pending, tasks_overdue,
    meta_spend, meta_leads_total, whatsapp_total,
    total_sales, leads_by_stage, leads_by_source,
    sales_by_product, user_performance,
    recent_contacts, recent_deals, upcoming_tasks
  ] = await Promise.all([
    get(`SELECT COUNT(*)::int as n FROM contacts ${csw}`),
    get(`SELECT COUNT(*)::int as n FROM contacts WHERE created_at >= NOW() - INTERVAL '30 days' ${sw}`),
    get(`SELECT COUNT(*)::int as n FROM contacts WHERE source='meta_lead' ${sw}`),
    get(`SELECT COUNT(*)::int as n FROM contacts WHERE source='whatsapp' ${sw}`),
    get(`SELECT COUNT(*)::int as n FROM deals WHERE stage NOT IN ('closed_won','closed_lost') ${sw}`),
    get(`SELECT COALESCE(SUM(value),0) as v FROM deals WHERE stage NOT IN ('closed_won','closed_lost') ${sw}`),
    get(`SELECT COUNT(*)::int as n FROM tasks WHERE status='pending'`),
    get(`SELECT COUNT(*)::int as n FROM tasks WHERE status='pending' AND due_date < NOW()`),
    get(`SELECT COALESCE(SUM(spend),0) as v FROM meta_ads`),
    get(`SELECT COUNT(*)::int as n FROM meta_leads`),
    get(`SELECT COUNT(*)::int as n FROM whatsapp_messages`),
    get(`SELECT COUNT(*)::int as count, COALESCE(SUM(amount),0) as total FROM sales ${csw}`),

    // Lead count by stage
    all(`SELECT lead_stage, COUNT(*)::int as count FROM contacts ${csw} GROUP BY lead_stage ORDER BY count DESC`),
    // Lead count by source
    all(`SELECT source, COUNT(*)::int as count FROM contacts ${csw} GROUP BY source ORDER BY count DESC`),
    // Sales by product category
    all(`SELECT product_category, COUNT(*)::int as count, COALESCE(SUM(amount),0) as total, COALESCE(SUM(weight_grams),0) as weight FROM sales ${csw} GROUP BY product_category ORDER BY total DESC`),
    // Top users by sales
    all(`
      SELECT u.name, u.role, s.name as showroom_name,
        COUNT(DISTINCT c.id)::int as lead_count,
        COALESCE(SUM(sl.amount),0) as total_sales
      FROM crm_users u
      LEFT JOIN showrooms s ON u.showroom_id = s.id
      LEFT JOIN contacts c ON c.assigned_to = u.id
      LEFT JOIN sales sl ON sl.assigned_to = u.id
      WHERE u.is_active = TRUE
      GROUP BY u.id, u.name, u.role, s.name
      ORDER BY total_sales DESC LIMIT 10
    `),

    all(`SELECT c.*, sh.name as showroom_name, u.name as assigned_name FROM contacts c LEFT JOIN showrooms sh ON c.showroom_id=sh.id LEFT JOIN crm_users u ON c.assigned_to=u.id ORDER BY c.created_at DESC LIMIT 5`),
    all(`SELECT d.*, c.first_name || ' ' || COALESCE(c.last_name,'') as contact_name FROM deals d LEFT JOIN contacts c ON d.contact_id=c.id ORDER BY d.created_at DESC LIMIT 5`),
    all(`SELECT t.*, c.first_name || ' ' || COALESCE(c.last_name,'') as contact_name FROM tasks t LEFT JOIN contacts c ON t.contact_id=c.id WHERE t.status='pending' ORDER BY t.due_date ASC NULLS LAST LIMIT 5`),
  ])

  res.json({
    contacts: {
      total: contacts_total.n,
      new_30d: contacts_new.n,
      from_meta: leads_meta.n,
      from_whatsapp: leads_whatsapp.n
    },
    deals: { open: deals_open.n, pipeline_value: Number(pipeline_value.v) },
    tasks: { pending: tasks_pending.n, overdue: tasks_overdue.n },
    meta: { total_spend: Number(meta_spend.v), total_leads: meta_leads_total.n },
    whatsapp: { total_messages: whatsapp_total.n },
    sales: { count: total_sales.count, total: Number(total_sales.total) },
    leads_by_stage,
    leads_by_source,
    sales_by_product,
    user_performance,
    recent_contacts,
    recent_deals,
    upcoming_tasks
  })
})

// Showroom comparison report
router.get('/showrooms', async (req, res) => {
  const rows = await all(`
    SELECT sh.id, sh.name, sh.city,
      COUNT(DISTINCT c.id)::int as lead_count,
      COUNT(DISTINCT CASE WHEN c.lead_stage='closed_won' THEN c.id END)::int as converted,
      COALESCE(SUM(sl.amount),0) as total_sales,
      COUNT(DISTINCT sl.id)::int as sale_count
    FROM showrooms sh
    LEFT JOIN contacts c ON c.showroom_id = sh.id
    LEFT JOIN sales sl ON sl.showroom_id = sh.id
    WHERE sh.is_active = TRUE
    GROUP BY sh.id, sh.name, sh.city
    ORDER BY total_sales DESC
  `)
  res.json(rows)
})

// Campaign performance report
router.get('/campaigns', async (req, res) => {
  const { showroom_id } = req.query
  let sw = showroom_id ? `AND c.showroom_id=${parseInt(showroom_id)}` : ''
  const rows = await all(`
    SELECT cp.id, cp.name, cp.source, sh.name as showroom_name,
      COUNT(DISTINCT c.id)::int as lead_count,
      COUNT(DISTINCT CASE WHEN c.lead_stage='new' THEN c.id END)::int as stage_new,
      COUNT(DISTINCT CASE WHEN c.lead_stage='contacted' THEN c.id END)::int as stage_contacted,
      COUNT(DISTINCT CASE WHEN c.lead_stage='proposal' THEN c.id END)::int as stage_proposal,
      COUNT(DISTINCT CASE WHEN c.lead_stage='closed_won' THEN c.id END)::int as stage_won,
      COALESCE(SUM(sl.amount),0) as total_sales
    FROM campaigns cp
    LEFT JOIN showrooms sh ON cp.showroom_id = sh.id
    LEFT JOIN contacts c ON c.campaign_id = cp.id ${sw}
    LEFT JOIN sales sl ON sl.campaign_id = cp.id
    GROUP BY cp.id, cp.name, cp.source, sh.name
    ORDER BY total_sales DESC
  `)
  res.json(rows)
})

module.exports = router
