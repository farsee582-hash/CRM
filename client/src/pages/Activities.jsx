import React, { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import api from '../api'
import Modal from '../components/Modal'

const fmtDT = d => d ? new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'

const TASK_STATUS = ['not_started','in_progress','completed','cancelled']
const TASK_PRIORITY = ['low','normal','high','urgent']
const CALL_TYPES = ['outbound','inbound']
const CALL_OUTCOMES = ['connected','not_connected','follow_up','interested','not_interested']
const EVENT_STATUS = ['upcoming','completed','cancelled']

const statusColor = s => ({
  not_started:'bg-slate-100 text-slate-600', in_progress:'bg-blue-100 text-blue-700',
  completed:'bg-green-100 text-green-700', cancelled:'bg-red-100 text-red-600',
  upcoming:'bg-yellow-100 text-yellow-700'
}[s] || 'bg-slate-100 text-slate-500')

const priorityColor = p => ({
  low:'bg-slate-100 text-slate-500', normal:'bg-blue-100 text-blue-600',
  high:'bg-orange-100 text-orange-600', urgent:'bg-red-100 text-red-600'
}[p] || 'bg-slate-100 text-slate-500')

const outcomeColor = o => ({
  connected:'bg-green-100 text-green-700', not_connected:'bg-red-100 text-red-600',
  follow_up:'bg-yellow-100 text-yellow-700', interested:'bg-blue-100 text-blue-600',
  not_interested:'bg-slate-100 text-slate-500'
}[o] || 'bg-slate-100 text-slate-500')

function Field({ label, children }) {
  return <div><label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>{children}</div>
}
const inp = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400"

export default function Activities() {
  const [tab, setTab] = useState('tasks')
  const [tasks, setTasks] = useState([])
  const [events, setEvents] = useState([])
  const [calls, setCalls] = useState([])
  const [contacts, setContacts] = useState([])
  const [users, setUsers] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({})

  // filters
  const [taskStatus, setTaskStatus] = useState('')
  const [taskPriority, setTaskPriority] = useState('')
  const [callType, setCallType] = useState('')
  const [callOutcome, setCallOutcome] = useState('')
  const [eventStatus, setEventStatus] = useState('')

  const loadTasks = useCallback(() => {
    const p = new URLSearchParams({ status: taskStatus, priority: taskPriority })
    api.get(`/tasks?${p}`).then(setTasks).catch(console.error)
  }, [taskStatus, taskPriority])

  const loadEvents = useCallback(() => {
    const p = new URLSearchParams({ status: eventStatus })
    api.get(`/events?${p}`).then(setEvents).catch(console.error)
  }, [eventStatus])

  const loadCalls = useCallback(() => {
    const p = new URLSearchParams({ call_type: callType, call_outcome: callOutcome })
    api.get(`/calls?${p}`).then(setCalls).catch(console.error)
  }, [callType, callOutcome])

  useEffect(() => { loadTasks() }, [loadTasks])
  useEffect(() => { loadEvents() }, [loadEvents])
  useEffect(() => { loadCalls() }, [loadCalls])
  useEffect(() => {
    api.get('/contacts?limit=300').then(r => setContacts(r.contacts || []))
    api.get('/crm-users').then(setUsers).catch(console.error)
  }, [])

  const onChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const openNew = () => {
    if (tab === 'tasks') setForm({ status: 'not_started', priority: 'normal' })
    else if (tab === 'events') setForm({ status: 'upcoming', reminder_minutes: 30 })
    else setForm({ call_type: 'outbound', call_outcome: 'connected', duration_minutes: 0 })
    setModal(true)
  }

  const save = async () => {
    try {
      if (tab === 'tasks') {
        if (form.id) await api.put(`/tasks/${form.id}`, form)
        else await api.post('/tasks', form)
        loadTasks()
      } else if (tab === 'events') {
        if (form.id) await api.put(`/events/${form.id}`, form)
        else await api.post('/events', form)
        loadEvents()
      } else {
        if (form.id) await api.put(`/calls/${form.id}`, form)
        else await api.post('/calls', form)
        loadCalls()
      }
      toast.success('Saved'); setModal(false)
    } catch (e) { toast.error(e.error || 'Error') }
  }

  const del = async () => {
    if (!confirm('Delete?')) return
    if (tab === 'tasks') { await api.delete(`/tasks/${form.id}`); loadTasks() }
    else if (tab === 'events') { await api.delete(`/events/${form.id}`); loadEvents() }
    else { await api.delete(`/calls/${form.id}`); loadCalls() }
    setModal(false)
  }

  const TABS = [
    { key: 'tasks', label: '✅ Tasks' },
    { key: 'events', label: '📅 Events' },
    { key: 'calls', label: '📞 Calls' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Activities</h1>
        <button onClick={openNew}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          + Add {tab === 'tasks' ? 'Task' : tab === 'events' ? 'Event' : 'Call'}
        </button>
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

      {/* Tasks Tab */}
      {tab === 'tasks' && (
        <>
          <div className="flex gap-3">
            <select value={taskStatus} onChange={e => setTaskStatus(e.target.value)} className={inp + " w-auto"}>
              <option value="">All Statuses</option>
              {TASK_STATUS.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </select>
            <select value={taskPriority} onChange={e => setTaskPriority(e.target.value)} className={inp + " w-auto"}>
              <option value="">All Priorities</option>
              {TASK_PRIORITY.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100">
                {['Task Name','Contact','Due Date','Priority','Status','Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {tasks.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-slate-400">No tasks</td></tr>}
                {tasks.map(t => {
                  const overdue = !['completed','cancelled'].includes(t.status) && t.due_date && new Date(t.due_date) < new Date()
                  return (
                    <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{t.title}</p>
                        {t.description && <p className="text-xs text-slate-400 truncate max-w-xs">{t.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{t.contact_name?.trim() || '—'}</td>
                      <td className={`px-4 py-3 text-sm ${overdue ? 'text-red-500 font-semibold' : 'text-slate-500'}`}>{fmtDate(t.due_date)}{overdue && ' ⚠️'}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor(t.priority)}`}>{t.priority}</span></td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(t.status)}`}>{t.status?.replace('_',' ')}</span></td>
                      <td className="px-4 py-3">
                        <button onClick={() => { setForm(t); setModal(true) }} className="text-xs text-indigo-600 hover:underline font-medium">Edit</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Events Tab */}
      {tab === 'events' && (
        <>
          <div className="flex gap-3">
            <select value={eventStatus} onChange={e => setEventStatus(e.target.value)} className={inp + " w-auto"}>
              <option value="">All Statuses</option>
              {EVENT_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100">
                {['Event','Contact','Start Time','End Time','Status','Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {events.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-slate-400">No events</td></tr>}
                {events.map(e => (
                  <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">📅 {e.title}</p>
                      {e.description && <p className="text-xs text-slate-400 truncate max-w-xs">{e.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{e.contact_name?.trim() || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{fmtDT(e.start_time)}</td>
                    <td className="px-4 py-3 text-slate-500">{fmtDT(e.end_time)}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(e.status)}`}>{e.status}</span></td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setForm(e); setModal(true) }} className="text-xs text-indigo-600 hover:underline font-medium">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Calls Tab */}
      {tab === 'calls' && (
        <>
          <div className="flex gap-3">
            <select value={callType} onChange={e => setCallType(e.target.value)} className={inp + " w-auto"}>
              <option value="">All Types</option>
              {CALL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={callOutcome} onChange={e => setCallOutcome(e.target.value)} className={inp + " w-auto"}>
              <option value="">All Outcomes</option>
              {CALL_OUTCOMES.map(o => <option key={o} value={o}>{o.replace('_',' ')}</option>)}
            </select>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100">
                {['Contact','Type','Outcome','Date & Time','Duration','Owner','Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {calls.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-slate-400">No calls logged</td></tr>}
                {calls.map(c => (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{c.contact_name?.trim() || '—'}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.call_type==='inbound'?'bg-purple-100 text-purple-700':'bg-blue-100 text-blue-700'}`}>{c.call_type}</span></td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${outcomeColor(c.call_outcome)}`}>{c.call_outcome?.replace('_',' ')}</span></td>
                    <td className="px-4 py-3 text-slate-500">{fmtDT(c.start_time)}</td>
                    <td className="px-4 py-3 text-slate-500">{c.duration_minutes ? `${c.duration_minutes} min` : '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{c.assigned_name || '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setForm(c); setModal(true) }} className="text-xs text-indigo-600 hover:underline font-medium">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={form.id ? `Edit ${tab.slice(0,-1)}` : `Add ${tab.slice(0,-1)}`}>
        {tab === 'tasks' && (
          <div className="space-y-3">
            <Field label="Task Name *"><input name="title" value={form.title||''} onChange={onChange} className={inp} /></Field>
            <Field label="Description"><textarea name="description" value={form.description||''} onChange={onChange} rows={2} className={inp} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Status">
                <select name="status" value={form.status||'not_started'} onChange={onChange} className={inp}>
                  {TASK_STATUS.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                </select>
              </Field>
              <Field label="Priority">
                <select name="priority" value={form.priority||'normal'} onChange={onChange} className={inp}>
                  {TASK_PRIORITY.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Related Contact">
                <select name="contact_id" value={form.contact_id||''} onChange={onChange} className={inp}>
                  <option value="">— None —</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name||''}</option>)}
                </select>
              </Field>
              <Field label="Task Owner">
                <select name="assigned_to" value={form.assigned_to||''} onChange={onChange} className={inp}>
                  <option value="">— None —</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </Field>
              <Field label="Due Date"><input name="due_date" type="datetime-local" value={form.due_date?.slice(0,16)||''} onChange={onChange} className={inp} /></Field>
            </div>
          </div>
        )}

        {tab === 'events' && (
          <div className="space-y-3">
            <Field label="Event Title *"><input name="title" value={form.title||''} onChange={onChange} className={inp} /></Field>
            <Field label="Description"><textarea name="description" value={form.description||''} onChange={onChange} rows={2} className={inp} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start Date & Time"><input name="start_time" type="datetime-local" value={form.start_time?.slice(0,16)||''} onChange={onChange} className={inp} /></Field>
              <Field label="End Date & Time"><input name="end_time" type="datetime-local" value={form.end_time?.slice(0,16)||''} onChange={onChange} className={inp} /></Field>
              <Field label="Related Contact">
                <select name="contact_id" value={form.contact_id||''} onChange={onChange} className={inp}>
                  <option value="">— None —</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name||''}</option>)}
                </select>
              </Field>
              <Field label="Host / User">
                <select name="assigned_to" value={form.assigned_to||''} onChange={onChange} className={inp}>
                  <option value="">— None —</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </Field>
              <Field label="Reminder (minutes before)">
                <input name="reminder_minutes" type="number" value={form.reminder_minutes||30} onChange={onChange} className={inp} />
              </Field>
              <Field label="Status">
                <select name="status" value={form.status||'upcoming'} onChange={onChange} className={inp}>
                  {EVENT_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
          </div>
        )}

        {tab === 'calls' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Contact">
                <select name="contact_id" value={form.contact_id||''} onChange={onChange} className={inp}>
                  <option value="">— None —</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name||''}</option>)}
                </select>
              </Field>
              <Field label="Call Owner">
                <select name="assigned_to" value={form.assigned_to||''} onChange={onChange} className={inp}>
                  <option value="">— None —</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </Field>
              <Field label="Call Type">
                <select name="call_type" value={form.call_type||'outbound'} onChange={onChange} className={inp}>
                  {CALL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Call Outcome">
                <select name="call_outcome" value={form.call_outcome||'connected'} onChange={onChange} className={inp}>
                  {CALL_OUTCOMES.map(o => <option key={o} value={o}>{o.replace('_',' ')}</option>)}
                </select>
              </Field>
              <Field label="Call Start Time"><input name="start_time" type="datetime-local" value={form.start_time?.slice(0,16)||''} onChange={onChange} className={inp} /></Field>
              <Field label="Duration (minutes)"><input name="duration_minutes" type="number" value={form.duration_minutes||0} onChange={onChange} className={inp} /></Field>
            </div>
            <Field label="Notes"><textarea name="notes" value={form.notes||''} onChange={onChange} rows={2} className={inp} /></Field>
          </div>
        )}

        <div className="flex justify-between items-center mt-5">
          {form.id && <button onClick={del} className="px-3 py-2 text-red-500 text-sm hover:bg-red-50 rounded-lg">Delete</button>}
          <div className="flex gap-3 ml-auto">
            <button onClick={() => setModal(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm">Cancel</button>
            <button onClick={save} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Save</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
