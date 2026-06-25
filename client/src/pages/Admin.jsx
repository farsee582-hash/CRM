import React, { useEffect, useState } from 'react'
import api from '../api'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

const ROLES = ['super_admin', 'manager', 'sales_rep']
const MODULES = [
  { key: 'dashboard',   label: '🏠 Dashboard' },
  { key: 'contacts',    label: '👥 Leads & Contacts' },
  { key: 'pipeline',    label: '📊 Pipeline' },
  { key: 'sales',       label: '💎 Sales' },
  { key: 'activities',  label: '✅ Activities' },
  { key: 'campaigns',   label: '📣 Campaigns' },
  { key: 'showrooms',   label: '🏪 Showrooms' },
  { key: 'users',       label: '👤 Users' },
  { key: 'reports',     label: '📈 Reports' },
  { key: 'whatsapp',    label: '💬 WhatsApp' },
  { key: 'meta_ads',    label: '📲 Meta Ads' },
]
const ACTIONS = ['view','create','edit','delete']

export default function Admin() {
  const [role, setRole] = useState('manager')
  const [perms, setPerms] = useState({})
  const [saving, setSaving] = useState(false)
  const { currentUser } = useAuth()

  const load = async () => {
    const rows = await api.get(`/auth/permissions/${role}`)
    const map = {}
    rows.forEach(r => { map[r.module] = { view: r.can_view, create: r.can_create, edit: r.can_edit, delete: r.can_delete } })
    // fill defaults
    MODULES.forEach(m => { if (!map[m.key]) map[m.key] = { view: false, create: false, edit: false, delete: false } })
    setPerms(map)
  }

  useEffect(() => { load() }, [role])

  const toggle = (module, action) => {
    setPerms(p => ({
      ...p,
      [module]: { ...p[module], [action]: !p[module]?.[action] }
    }))
  }

  const saveAll = async () => {
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

  const roleColor = r => ({ super_admin: 'bg-red-100 text-red-700', manager: 'bg-blue-100 text-blue-700', sales_rep: 'bg-green-100 text-green-700' }[r])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Admin Panel</h1>
          <p className="text-sm text-slate-400">Configure role-based access permissions</p>
        </div>
      </div>

      {/* Role selector */}
      <div className="flex gap-3">
        {ROLES.map(r => (
          <button key={r} onClick={() => setRole(r)}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${role === r ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs mr-2 ${roleColor(r)}`}>
              {r === 'super_admin' ? '👑' : r === 'manager' ? '🏢' : '👤'}
            </span>
            {r.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      {role === 'super_admin' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm">
          👑 Super Admin has full access to all modules and cannot be restricted.
        </div>
      )}

      {/* Permissions table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-700">Module Permissions — <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${roleColor(role)}`}>{role.replace('_',' ')}</span></h2>
          {role !== 'super_admin' && (
            <button onClick={saveAll} disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          )}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-48">Module</th>
              {ACTIONS.map(a => (
                <th key={a} className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{a}</th>
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
                    <td key={a} className="text-center px-4 py-3">
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

      {/* Info cards */}
      <div className="grid grid-cols-3 gap-4">
        {ROLES.map(r => (
          <div key={r} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold mb-2 ${roleColor(r)}`}>{r.replace('_',' ')}</div>
            <p className="text-xs text-slate-500">
              {r === 'super_admin' && 'Full access to all modules. Can manage users, roles, showrooms, and system settings.'}
              {r === 'manager' && 'Can view and manage their showroom data. Can create/edit contacts, deals, and activities.'}
              {r === 'sales_rep' && 'Can manage assigned leads and log activities. Limited to their own records.'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
