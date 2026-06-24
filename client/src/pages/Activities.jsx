import React, { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import api from '../api'
import Modal from '../components/Modal'

const TYPE_ICON = { call:'📞', meeting:'🤝', task:'✅', email:'✉️', note:'📝' }
const fmt = d => d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'

export default function Activities() {
  const [tasks, setTasks] = useState([])
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({})
  const [contacts, setContacts] = useState([])

  const load = useCallback(() => {
    const p = new URLSearchParams({ status: filterStatus, priority: filterPriority })
    api.get(`/tasks?${p}`).then(setTasks).catch(console.error)
  }, [filterStatus, filterPriority])

  useEffect(() => { load() }, [load])
  useEffect(() => { api.get('/contacts?limit=200').then(r => setContacts(r.contacts || [])) }, [])

  const onChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const save = async () => {
    try {
      if (form.id) await api.put(`/tasks/${form.id}`, form)
      else await api.post('/tasks', form)
      toast.success('Saved'); setModal(false); load()
    } catch (e) { toast.error(e.error || 'Error') }
  }

  const complete = async (id) => {
    await api.put(`/tasks/${id}`, { status: 'completed' })
    toast.success('Marked complete'); load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Activities</h1>
        <button onClick={() => { setForm({ type: 'task', priority: 'medium', status: 'pending' }); setModal(true) }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">+ Add Activity</button>
      </div>

      <div className="flex gap-3">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option><option value="completed">Completed</option>
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400">
          <option value="">All Priorities</option>
          <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              {['Type','Title','Contact','Due Date','Priority','Status','Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-slate-400">No activities</td></tr>}
            {tasks.map(t => {
              const overdue = t.status === 'pending' && t.due_date && new Date(t.due_date) < new Date()
              return (
                <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 text-lg">{TYPE_ICON[t.type] || '📋'}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{t.title}</p>
                    {t.description && <p className="text-xs text-slate-400 truncate max-w-xs">{t.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{t.contact_name?.trim() || '—'}</td>
                  <td className={`px-4 py-3 text-sm ${overdue ? 'text-red-500 font-semibold' : 'text-slate-500'}`}>{fmt(t.due_date)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      t.priority==='high'?'bg-red-100 text-red-600':t.priority==='medium'?'bg-yellow-100 text-yellow-700':'bg-slate-100 text-slate-500'
                    }`}>{t.priority}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.status==='completed'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{t.status}</span>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    {t.status === 'pending' && <button onClick={() => complete(t.id)} className="text-xs text-green-600 hover:underline font-medium">Done</button>}
                    <button onClick={() => { setForm(t); setModal(true) }} className="text-xs text-slate-500 hover:text-indigo-600 font-medium">Edit</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={form.id ? 'Edit Activity' : 'Add Activity'}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
              <select name="type" value={form.type || 'task'} onChange={onChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400">
                {Object.keys(TYPE_ICON).map(t => <option key={t}>{t}</option>)}
              </select></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Priority</label>
              <select name="priority" value={form.priority || 'medium'} onChange={onChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400">
                {['high','medium','low'].map(p => <option key={p}>{p}</option>)}
              </select></div>
          </div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Title *</label>
            <input name="title" value={form.title || ''} onChange={onChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400" /></div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <textarea name="description" value={form.description || ''} onChange={onChange} rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Contact</label>
              <select name="contact_id" value={form.contact_id || ''} onChange={onChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400">
                <option value="">— None —</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name||''}</option>)}
              </select></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Due Date</label>
              <input name="due_date" type="datetime-local" value={form.due_date?.slice(0,16) || ''} onChange={onChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400" /></div>
          </div>
          {form.id && <div><label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
            <select name="status" value={form.status || 'pending'} onChange={onChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400">
              <option value="pending">Pending</option><option value="completed">Completed</option>
            </select></div>}
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={() => setModal(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm">Cancel</button>
          <button onClick={save} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Save</button>
        </div>
      </Modal>
    </div>
  )
}
