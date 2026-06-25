import React, { useEffect, useState } from 'react'
import api from '../api'
import toast from 'react-hot-toast'
import Modal from '../components/Modal'

const ROLES = ['super_admin', 'manager', 'sales_rep']
const MODULES = [
  { key: 'dashboard',  label: '🏠 Dashboard' },
  { key: 'contacts',   label: '👥 Leads & Contacts' },
  { key: 'pipeline',   label: '📊 Pipeline' },
  { key: 'sales',      label: '💎 Sales' },
  { key: 'activities', label: '✅ Activities' },
  { key: 'campaigns',  label: '📣 Campaigns' },
  { key: 'showrooms',  label: '🏪 Showrooms' },
  { key: 'users',      label: '👤 Users' },
  { key: 'reports',    label: '📈 Reports' },
  { key: 'whatsapp',   label: '💬 WhatsApp' },
  { key: 'meta_ads',   label: '📲 Meta Ads' },
]
const ACTIONS = ['view','create','edit','delete']
const ROLE_HIERARCHY = { super_admin: 3, manager: 2, sales_rep: 1 }
const inp = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400"

const roleColor = r => ({
  super_admin: 'bg-red-100 text-red-700',
  manager: 'bg-blue-100 text-blue-700',
  sales_rep: 'bg-green-100 text-green-700'
}[r] || 'bg-slate-100 text-slate-500')

const roleIcon = r => ({ super_admin: '👑', manager: '🏢', sales_rep: '👤' }[r] || '👤')

const TABS = [
  { key: 'permissions', label: '🔒 Role Permissions' },
  { key: 'showrooms',   label: '🏪 Showrooms' },
  { key: 'pipeline',    label: '📊 Pipeline Stages' },
  { key: 'users',       label: '👥 Users' },
]

const PIPELINE_STAGES = [
  { key: 'new_lead',        label: 'New Lead',        color: '#64748b' },
  { key: 'proposal_shared', label: 'Proposal Shared', color: '#3b82f6' },
  { key: 'under_review',    label: 'Under Review',    color: '#f59e0b' },
  { key: 'closed_won',      label: 'Closed Won',      color: '#22c55e' },
  { key: 'closed_lost',     label: 'Closed Lost',     color: '#ef4444' },
]

export default function Admin() {
  const [tab, setTab] = useState('permissions')
  const [role, setRole] = useState('manager')
  const [perms, setPerms] = useState({})
  const [saving, setSaving] = useState(false)

  // Showrooms state
  const [showrooms, setShowrooms] = useState([])
  const [showroomModal, setShowroomModal] = useState(false)
  const [showroomForm, setShowroomForm] = useState({})

  // Users state
  const [users, setUsers] = useState([])
  const [userModal, setUserModal] = useState(false)
  const [userForm, setUserForm] = useState({})

  // Load permissions
  const loadPerms = async () => {
    const rows = await api.get(`/auth/permissions/${role}`)
    const map = {}
    rows.forEach(r => { map[r.module] = { view: r.can_view, create: r.can_create, edit: r.can_edit, delete: r.can_delete } })
    MODULES.forEach(m => { if (!map[m.key]) map[m.key] = { view: false, create: false, edit: false, delete: false } })
    setPerms(map)
  }

  const loadShowrooms = () => api.get('/showrooms').then(setShowrooms).catch(console.error)
  const loadUsers = () => api.get('/crm-users').then(setUsers).catch(console.error)

  useEffect(() => { loadPerms() }, [role])
  useEffect(() => { loadShowrooms(); loadUsers() }, [])

  const toggle = (module, action) => {
    setPerms(p => ({ ...p, [module]: { ...p[module], [action]: !p[module]?.[action] } }))
  }

  const savePerms = async () => {
    setSaving(true)
    try {
      await Promise.all(MODULES.map(m =>
        api.put(`/auth/permissions/${role}/${m.key}`, {
          can_view: perms[m.key]?.view || false,
          can_create: perms[m.key]?.create || false,
          can_edit: perms[m.key]?.edit || false,
          can_delete: perms[m.key]?.delete || false,
        })
      ))
      toast.success('Permissions saved')
    } catch { toast.error('Save failed') }
    setSaving(false)
  }

  // Showroom CRUD
  const saveShowroom = async () => {
    try {
      if (showroomForm.id) await api.put(`/showrooms/${showroomForm.id}`, showroomForm)
      else await api.post('/showrooms', showroomForm)
      toast.success('Saved'); setShowroomModal(false); loadShowrooms()
    } catch { toast.error('Error') }
  }

  const deleteShowroom = async (id) => {
    if (!confirm('Delete this showroom?')) return
    await api.delete(`/showrooms/${id}`)
    toast.success('Deleted'); loadShowrooms()
  }

  // User CRUD
  const saveUser = async () => {
    try {
      if (userForm.id) await api.put(`/crm-users/${userForm.id}`, userForm)
      else await api.post('/crm-users', userForm)
      toast.success('Saved'); setUserModal(false); loadUsers()
    } catch { toast.error('Error') }
  }

  const deleteUser = async (id) => {
    if (!confirm('Deactivate this user?')) return
    await api.delete(`/crm-users/${id}`)
    toast.success('User deactivated'); loadUsers()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">👑 Admin Panel</h1>
        <p className="text-sm text-slate-400">Manage roles, permissions, showrooms and users</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PERMISSIONS TAB ── */}
      {tab === 'permissions' && (
        <div className="space-y-4">
          {/* Role hierarchy visual */}
          <div className="grid grid-cols-3 gap-4">
            {ROLES.map(r => (
              <div key={r} className={`bg-white rounded-xl border-2 p-4 cursor-pointer transition-all ${role === r ? 'border-indigo-500 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}
                onClick={() => setRole(r)}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{roleIcon(r)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${roleColor(r)}`}>{r.replace('_',' ')}</span>
                </div>
                <p className="text-xs text-slate-500">
                  {r === 'super_admin' && 'Level 3 · Full system access · Cannot be restricted'}
                  {r === 'manager'     && 'Level 2 · Showroom-level access · Configurable'}
                  {r === 'sales_rep'   && 'Level 1 · Own records only · Configurable'}
                </p>
                <div className="flex gap-1 mt-2">
                  {[1,2,3].map(l => (
                    <div key={l} className={`h-1.5 flex-1 rounded-full ${l <= ROLE_HIERARCHY[r] ? 'bg-indigo-500' : 'bg-slate-200'}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {role === 'super_admin' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm">
              👑 Super Admin has full access to all modules and cannot be restricted.
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-700">
                Module Access —
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${roleColor(role)}`}>
                  {roleIcon(role)} {role.replace('_',' ')}
                </span>
              </h2>
              {role !== 'super_admin' && (
                <button onClick={savePerms} disabled={saving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              )}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Module</th>
                  {ACTIONS.map(a => (
                    <th key={a} className="text-center px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{a}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULES.map(m => (
                  <tr key={m.key} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-700">{m.label}</td>
                    {ACTIONS.map(a => {
                      const checked = role === 'super_admin' ? true : perms[m.key]?.[a] || false
                      return (
                        <td key={a} className="text-center px-6 py-3">
                          <input type="checkbox" checked={checked}
                            disabled={role === 'super_admin'}
                            onChange={() => toggle(m.key, a)}
                            className="w-4 h-4 accent-indigo-600 cursor-pointer disabled:cursor-not-allowed" />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SHOWROOMS TAB ── */}
      {tab === 'showrooms' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setShowroomForm({}); setShowroomModal(true) }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
              + Add Showroom
            </button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 bg-slate-50">
                {['Name','City','Phone','Manager','Status','Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {showrooms.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-slate-400">No showrooms</td></tr>}
                {showrooms.map(s => (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-5 py-3 font-semibold">🏪 {s.name}</td>
                    <td className="px-5 py-3 text-slate-500">{s.city||'—'}</td>
                    <td className="px-5 py-3 text-slate-500">{s.phone||'—'}</td>
                    <td className="px-5 py-3 text-slate-500">{s.manager_name||'—'}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3 flex gap-3">
                      <button onClick={() => { setShowroomForm(s); setShowroomModal(true) }}
                        className="text-xs text-indigo-600 hover:underline font-medium">Edit</button>
                      <button onClick={() => deleteShowroom(s.id)}
                        className="text-xs text-red-500 hover:underline font-medium">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Modal open={showroomModal} onClose={() => setShowroomModal(false)} title={showroomForm.id ? 'Edit Showroom' : 'Add Showroom'}>
            <div className="space-y-3">
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Showroom Name *</label>
                <input name="name" value={showroomForm.name||''} onChange={e => setShowroomForm(f=>({...f,name:e.target.value}))} className={inp} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-slate-600 mb-1">City</label>
                  <input value={showroomForm.city||''} onChange={e => setShowroomForm(f=>({...f,city:e.target.value}))} className={inp} /></div>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                  <input value={showroomForm.phone||''} onChange={e => setShowroomForm(f=>({...f,phone:e.target.value}))} className={inp} /></div>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Manager Name</label>
                  <input value={showroomForm.manager_name||''} onChange={e => setShowroomForm(f=>({...f,manager_name:e.target.value}))} className={inp} /></div>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                  <select value={showroomForm.is_active===false?'false':'true'} onChange={e => setShowroomForm(f=>({...f,is_active:e.target.value==='true'}))} className={inp}>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select></div>
              </div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Address</label>
                <textarea value={showroomForm.address||''} onChange={e => setShowroomForm(f=>({...f,address:e.target.value}))} rows={2} className={inp} /></div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowroomModal(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm">Cancel</button>
              <button onClick={saveShowroom} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">Save</button>
            </div>
          </Modal>
        </div>
      )}

      {/* ── PIPELINE STAGES TAB ── */}
      {tab === 'pipeline' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-700">Pipeline Stages</h2>
              <p className="text-xs text-slate-400 mt-0.5">These are the stages used across all showroom pipelines</p>
            </div>
            <div className="divide-y divide-slate-50">
              {PIPELINE_STAGES.map((stage, i) => (
                <div key={stage.key} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: stage.color }}>{i + 1}</div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-700">{stage.label}</p>
                    <p className="text-xs text-slate-400 font-mono">{stage.key}</p>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full font-medium text-white" style={{ backgroundColor: stage.color }}>
                    Stage {i + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-800 text-sm">
            ℹ️ Pipeline stages are shared across all showrooms. Each showroom's pipeline tab shows the same stages filtered by showroom.
          </div>
        </div>
      )}

      {/* ── USERS TAB ── */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setUserForm({ role: 'sales_rep', password: '1234' }); setUserModal(true) }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
              + Add User
            </button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 bg-slate-50">
                {['Name','Email','Role','Showroom','Status','Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {users.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-slate-400">No users</td></tr>}
                {users.map(u => (
                  <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-5 py-3 font-semibold flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${u.role==='super_admin'?'bg-red-500':u.role==='manager'?'bg-blue-500':'bg-green-500'}`}>
                        {u.name[0]}
                      </div>
                      {u.name}
                    </td>
                    <td className="px-5 py-3 text-slate-500">{u.email||'—'}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor(u.role)}`}>
                        {roleIcon(u.role)} {u.role?.replace('_',' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{u.showroom_name||'—'}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3 flex gap-3">
                      <button onClick={() => { setUserForm(u); setUserModal(true) }}
                        className="text-xs text-indigo-600 hover:underline font-medium">Edit</button>
                      <button onClick={() => deleteUser(u.id)}
                        className="text-xs text-red-500 hover:underline font-medium">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Modal open={userModal} onClose={() => setUserModal(false)} title={userForm.id ? 'Edit User' : 'Add User'}>
            <div className="space-y-3">
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Full Name *</label>
                <input value={userForm.name||''} onChange={e => setUserForm(f=>({...f,name:e.target.value}))} className={inp} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                  <input type="email" value={userForm.email||''} onChange={e => setUserForm(f=>({...f,email:e.target.value}))} className={inp} /></div>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                  <input value={userForm.phone||''} onChange={e => setUserForm(f=>({...f,phone:e.target.value}))} className={inp} /></div>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
                  <select value={userForm.role||'sales_rep'} onChange={e => setUserForm(f=>({...f,role:e.target.value}))} className={inp}>
                    {ROLES.map(r => <option key={r} value={r}>{roleIcon(r)} {r.replace('_',' ')}</option>)}
                  </select></div>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
                  <input value={userForm.password||''} onChange={e => setUserForm(f=>({...f,password:e.target.value}))} className={inp} /></div>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Showroom</label>
                  <select value={userForm.showroom_id||''} onChange={e => setUserForm(f=>({...f,showroom_id:e.target.value}))} className={inp}>
                    <option value="">— None —</option>
                    {showrooms.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select></div>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                  <select value={userForm.is_active===false?'false':'true'} onChange={e => setUserForm(f=>({...f,is_active:e.target.value==='true'}))} className={inp}>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select></div>
              </div>
            </div>
            <div className="flex justify-between items-center mt-5">
              {userForm.id && <button onClick={() => deleteUser(userForm.id)} className="px-3 py-2 text-red-500 text-sm hover:bg-red-50 rounded-lg">Remove User</button>}
              <div className="flex gap-3 ml-auto">
                <button onClick={() => setUserModal(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm">Cancel</button>
                <button onClick={saveUser} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">Save</button>
              </div>
            </div>
          </Modal>
        </div>
      )}
    </div>
  )
}
