import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../api'
import Modal from '../components/Modal'

const fmtINR = n => '₹' + Number(n||0).toLocaleString('en-IN')
const ROLE_COLORS = { admin:'bg-purple-100 text-purple-700', manager:'bg-blue-100 text-blue-700', sales_rep:'bg-green-100 text-green-700' }

export default function CrmUsers() {
  const [users, setUsers] = useState([])
  const [showrooms, setShowrooms] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({})

  const load = () => api.get('/crm-users').then(setUsers)
  useEffect(() => { load(); api.get('/showrooms').then(setShowrooms) }, [])
  const onChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const save = async () => {
    try {
      if (form.id) await api.put(`/crm-users/${form.id}`, form)
      else await api.post('/crm-users', form)
      toast.success(form.id ? 'Updated' : 'User added')
      setModal(false); load()
    } catch(e) { toast.error(e.error||'Error') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Users</h1>
        <button onClick={() => { setForm({ role:'sales_rep' }); setModal(true) }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">+ Add User</button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              {['Name','Role','Showroom','Email','Leads','Total Sales','Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-slate-400">No users yet</td></tr>}
            {users.map(u => (
              <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                      {(u.name||'?')[0].toUpperCase()}
                    </div>
                    <span className="font-medium">{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${ROLE_COLORS[u.role]||'bg-slate-100 text-slate-500'}`}>{u.role?.replace('_',' ')}</span>
                </td>
                <td className="px-4 py-3 text-slate-500">{u.showroom_name||'—'}</td>
                <td className="px-4 py-3 text-slate-500">{u.email||'—'}</td>
                <td className="px-4 py-3 font-semibold text-indigo-600">{u.lead_count||0}</td>
                <td className="px-4 py-3 font-bold text-green-600">{fmtINR(u.total_sales||0)}</td>
                <td className="px-4 py-3">
                  <button onClick={() => { setForm(u); setModal(true) }} className="text-xs text-slate-500 hover:text-indigo-600 font-medium">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={form.id ? 'Edit User' : 'Add User'}>
        <div className="grid grid-cols-2 gap-4">
          {[['name','Full Name *'],['email','Email'],['phone','Phone']].map(([n,l]) => (
            <div key={n}>
              <label className="block text-xs font-medium text-slate-600 mb-1">{l}</label>
              <input name={n} value={form[n]||''} onChange={onChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
            <select name="role" value={form.role||'sales_rep'} onChange={onChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400">
              <option value="sales_rep">Sales Rep</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Showroom</label>
            <select name="showroom_id" value={form.showroom_id||''} onChange={onChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400">
              <option value="">— None —</option>
              {showrooms.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={() => setModal(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm">Cancel</button>
          <button onClick={save} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Save</button>
        </div>
      </Modal>
    </div>
  )
}
