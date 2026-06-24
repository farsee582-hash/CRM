const express = require('express')
const router = express.Router()
const { all, run, get } = require('../db')

router.get('/', async (req, res) => {
  const { showroom_id, campaign_id, assigned_to, product_category, date_from, date_to } = req.query
  let sql = `
    SELECT s.*,
      c.first_name || ' ' || COALESCE(c.last_name,'') as contact_name,
      sh.name as showroom_name,
      u.name as user_name,
      cp.name as campaign_name
    FROM sales s
    LEFT JOIN contacts c ON s.contact_id = c.id
    LEFT JOIN showrooms sh ON s.showroom_id = sh.id
    LEFT JOIN crm_users u ON s.assigned_to = u.id
    LEFT JOIN campaigns cp ON s.campaign_id = cp.id
    WHERE 1=1
  `
  const params = []
  if (showroom_id) { params.push(showroom_id); sql += ` AND s.showroom_id=$${params.length}` }
  if (campaign_id) { params.push(campaign_id); sql += ` AND s.campaign_id=$${params.length}` }
  if (assigned_to) { params.push(assigned_to); sql += ` AND s.assigned_to=$${params.length}` }
  if (product_category) { params.push(product_category); sql += ` AND s.product_category=$${params.length}` }
  if (date_from) { params.push(date_from); sql += ` AND s.sale_date >= $${params.length}` }
  if (date_to) { params.push(date_to); sql += ` AND s.sale_date <= $${params.length}` }
  sql += ' ORDER BY s.sale_date DESC, s.created_at DESC'

  const rows = await all(sql, params)
  res.json(rows)
})

router.post('/', async (req, res) => {
  const {
    contact_id, showroom_id, assigned_to, campaign_id,
    product_category, bill_no, order_no, scheme_no,
    amount, contact_person, weight_grams, diamond_carat,
    sale_date, notes
  } = req.body
  if (!product_category) return res.status(400).json({ error: 'product_category required' })
  if (!amount) return res.status(400).json({ error: 'amount required' })

  const r = await run(`
    INSERT INTO sales
      (contact_id, showroom_id, assigned_to, campaign_id,
       product_category, bill_no, order_no, scheme_no,
       amount, contact_person, weight_grams, diamond_carat,
       sale_date, notes)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    RETURNING id
  `, [
    contact_id||null, showroom_id||null, assigned_to||null, campaign_id||null,
    product_category, bill_no||null, order_no||null, scheme_no||null,
    amount, contact_person||null, weight_grams||null, diamond_carat||null,
    sale_date||null, notes||null
  ])
  res.status(201).json({ id: r.rows[0].id })
})

router.put('/:id', async (req, res) => {
  const fields = ['contact_id','showroom_id','assigned_to','campaign_id','product_category',
    'bill_no','order_no','scheme_no','amount','contact_person','weight_grams','diamond_carat','sale_date','notes']
  const updates = []; const params = []
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f}=$${params.length+1}`); params.push(req.body[f]) }
  }
  params.push(req.params.id)
  await run(`UPDATE sales SET ${updates.join(',')} WHERE id=$${params.length}`, params)
  res.json({ ok: true })
})

router.delete('/:id', async (req, res) => {
  await run('DELETE FROM sales WHERE id=$1', [req.params.id])
  res.json({ ok: true })
})

// Summary stats by product category
router.get('/summary', async (req, res) => {
  const { showroom_id, campaign_id, assigned_to, date_from, date_to } = req.query
  let where = 'WHERE 1=1'; const params = []
  if (showroom_id) { params.push(showroom_id); where += ` AND showroom_id=$${params.length}` }
  if (campaign_id) { params.push(campaign_id); where += ` AND campaign_id=$${params.length}` }
  if (assigned_to) { params.push(assigned_to); where += ` AND assigned_to=$${params.length}` }
  if (date_from) { params.push(date_from); where += ` AND sale_date>=$${params.length}` }
  if (date_to) { params.push(date_to); where += ` AND sale_date<=$${params.length}` }

  const byProduct = await all(
    `SELECT product_category, COUNT(*)::int as count, COALESCE(SUM(amount),0) as total_amount,
     COALESCE(SUM(weight_grams),0) as total_weight FROM sales ${where} GROUP BY product_category ORDER BY total_amount DESC`,
    params
  )
  const total = await get(`SELECT COUNT(*)::int as count, COALESCE(SUM(amount),0) as total FROM sales ${where}`, params)
  res.json({ byProduct, total })
})

module.exports = router
