const express = require('express')
const router = express.Router()
const { get, all } = require('../db')

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email) return res.status(400).json({ error: 'email required' })
  const user = await get('SELECT * FROM crm_users WHERE email=$1 AND is_active=TRUE', [email])
  if (!user) return res.status(401).json({ error: 'User not found' })
  if (user.password && user.password !== password) return res.status(401).json({ error: 'Invalid password' })
  const perms = await all('SELECT module, can_view, can_create, can_edit, can_delete FROM role_permissions WHERE role=$1', [user.role])
  const permissions = {}
  perms.forEach(p => { permissions[p.module] = { view: p.can_view, create: p.can_create, edit: p.can_edit, delete: p.can_delete } })
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, showroom_id: user.showroom_id }, permissions })
})

router.get('/permissions/:role', async (req, res) => {
  const perms = await all('SELECT * FROM role_permissions WHERE role=$1 ORDER BY module', [req.params.role])
  res.json(perms)
})

router.put('/permissions/:role/:module', async (req, res) => {
  const { role, module } = req.params
  const { can_view, can_create, can_edit, can_delete } = req.body
  const { run } = require('../db')
  await run(`
    INSERT INTO role_permissions (role, module, can_view, can_create, can_edit, can_delete)
    VALUES ($1,$2,$3,$4,$5,$6)
    ON CONFLICT (role, module) DO UPDATE SET
      can_view=$3, can_create=$4, can_edit=$5, can_delete=$6
  `, [role, module, can_view, can_create, can_edit, can_delete])
  res.json({ ok: true })
})

module.exports = router
