const { pool, init } = require('./server/db')

async function seed() {
  await init()

  // Showrooms
  await pool.query(`INSERT INTO showrooms (name, city, address, phone, manager_name) VALUES
    ('Jewel Palace - MG Road', 'Bangalore', 'No. 42, MG Road, Bangalore - 560001', '080-41234567', 'Ramesh Kumar'),
    ('Jewel Palace - Indiranagar', 'Bangalore', 'No. 15, 100ft Road, Indiranagar - 560038', '080-41234568', 'Suresh Sharma'),
    ('Jewel Palace - Whitefield', 'Bangalore', 'No. 8, Whitefield Main Road - 560066', '080-41234569', 'Priya Nair')
  `)

  // Super Admin
  await pool.query(`INSERT INTO crm_users (name, email, phone, role, password, is_active) VALUES
    ('Super Admin', 'farsee582@gmail.com', '9999999999', 'super_admin', '5821', true)
  ON CONFLICT (email) DO UPDATE SET password='5821', role='super_admin', is_active=true`)

  // CRM Users
  await pool.query(`INSERT INTO crm_users (name, email, phone, role, showroom_id) VALUES
    ('Ramesh Kumar', 'ramesh@jewelpalace.com', '9876543210', 'manager', 1),
    ('Suresh Sharma', 'suresh@jewelpalace.com', '9876543211', 'manager', 2),
    ('Priya Nair', 'priya@jewelpalace.com', '9876543212', 'manager', 3),
    ('Anjali Singh', 'anjali@jewelpalace.com', '9876543213', 'sales_rep', 1),
    ('Vikram Rao', 'vikram@jewelpalace.com', '9876543214', 'sales_rep', 1),
    ('Deepa Menon', 'deepa@jewelpalace.com', '9876543215', 'sales_rep', 2),
    ('Kiran Patel', 'kiran@jewelpalace.com', '9876543216', 'sales_rep', 3)
  `)

  // Campaigns
  await pool.query(`INSERT INTO campaigns (name, source, showroom_id, budget, start_date, end_date, status) VALUES
    ('Wedding Season Gold Offer', 'meta_lead', 1, 50000, '2026-05-01', '2026-06-30', 'active'),
    ('Diamond Collection Launch', 'meta_lead', 2, 75000, '2026-06-01', '2026-07-31', 'active'),
    ('Silver Anniversary Sale', 'social_media', 3, 25000, '2026-06-15', '2026-07-15', 'active'),
    ('Referral Rewards Program', 'referral', null, 30000, '2026-01-01', '2026-12-31', 'active')
  `)

  // Contacts
  await pool.query(`INSERT INTO contacts (first_name, last_name, email, phone, lead_stage, status, source, showroom_id, assigned_to, campaign_id) VALUES
    ('Arjun', 'Mehta', 'arjun.mehta@email.com', '9900112233', 'new', 'lead', 'meta_lead', 1, 4, 1),
    ('Kavya', 'Reddy', 'kavya.reddy@email.com', '9900112234', 'contacted', 'lead', 'meta_lead', 1, 5, 1),
    ('Sanjay', 'Gupta', 'sanjay.gupta@email.com', '9900112235', 'proposal', 'lead', 'meta_lead', 2, 6, 2),
    ('Meera', 'Joshi', 'meera.joshi@email.com', '9900112236', 'closed_won', 'customer', 'referral', 2, 6, 4),
    ('Rohit', 'Verma', 'rohit.verma@email.com', '9900112237', 'new', 'lead', 'walk_in', 3, 7, null),
    ('Ananya', 'Krishnan', 'ananya.k@email.com', '9900112238', 'contacted', 'lead', 'whatsapp', 1, 4, null),
    ('Sunil', 'Bhat', 'sunil.bhat@email.com', '9900112239', 'closed_won', 'customer', 'meta_lead', 2, 6, 2),
    ('Pooja', 'Iyer', 'pooja.iyer@email.com', '9900112240', 'new', 'lead', 'social_media', 3, 7, 3),
    ('Manoj', 'Tiwari', 'manoj.tiwari@email.com', '9900112241', 'proposal', 'lead', 'referral', 1, 5, 4),
    ('Lakshmi', 'Das', 'lakshmi.das@email.com', '9900112242', 'closed_won', 'customer', 'walk_in', 3, 7, null)
  `)

  // Sales
  await pool.query(`INSERT INTO sales (contact_id, showroom_id, assigned_to, campaign_id, product_category, bill_no, amount, contact_person, weight_grams, sale_date) VALUES
    (4, 2, 6, 4, 'gold', 'BILL-2026-001', 125000, 'Meera Joshi', 22.5, '2026-06-10'),
    (7, 2, 6, 2, 'diamond', 'BILL-2026-002', 285000, 'Sunil Bhat', 15.2, '2026-06-12'),
    (10, 3, 7, null, 'gold', 'BILL-2026-003', 89000, 'Lakshmi Das', 18.0, '2026-06-15'),
    (4, 2, 6, 4, 'silver', 'BILL-2026-004', 12000, 'Meera Joshi', 120.0, '2026-06-18'),
    (7, 2, 6, 2, 'platinum', 'BILL-2026-005', 195000, 'Sunil Bhat', 10.5, '2026-06-20'),
    (10, 3, 7, null, 'advance', null, 50000, 'Lakshmi Das', null, '2026-06-22')
  `, [])

  await pool.query(`INSERT INTO sales (contact_id, showroom_id, assigned_to, campaign_id, product_category, order_no, amount, contact_person, sale_date) VALUES
    (9, 1, 5, 4, 'advance', 'ORD-2026-001', 75000, 'Manoj Tiwari', '2026-06-20')
  `, [])

  await pool.query(`INSERT INTO sales (contact_id, showroom_id, assigned_to, campaign_id, product_category, scheme_no, amount, contact_person, sale_date) VALUES
    (6, 1, 4, null, 'scheme', 'SCH-2026-001', 5000, 'Ananya Krishnan', '2026-06-21')
  `, [])

  console.log('Seed complete!')
  process.exit(0)
}

seed().catch(e => { console.error(e); process.exit(1) })
