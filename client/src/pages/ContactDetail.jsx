import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api'

const fmt = d => d ? new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—'

export default function ContactDetail() {
  const { id } = useParams()
  const [contact, setContact] = useState(null)
  const [note, setNote] = useState('')
  const [noteType, setNoteType] = useState('note')

  const load = () => api.get(`/contacts/${id}`).then(setContact).catch(console.error)
  useEffect(() => { load() }, [id])

  const addNote = async () => {
    if (!note.trim()) return
    await api.post('/notes', { contact_id: id, type: noteType, body: note })
    setNote(''); toast.success('Note added'); load()
  }

  if (!contact) return <div className="text-slate-400 text-center py-20">Loading…</div>

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link to="/contacts" className="hover:text-indigo-600">Contacts</Link>
        <span>›</span>
        <span className="text-slate-700 font-medium">{contact.first_name} {contact.last_name || ''}</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xl flex-shrink-0">
            {(contact.first_name || '?')[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{contact.first_name} {contact.last_name || ''}</h1>
            <p className="text-slate-500 text-sm">{contact.job_title || ''}{contact.job_title && contact.company ? ' · ' : ''}{contact.company || ''}</p>
            <div className="flex gap-2 mt-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 capitalize font-medium">{contact.status}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{contact.source?.replace(/_/g,' ')}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {[['Email', contact.email],['Phone', contact.phone],['WhatsApp', contact.whatsapp_id],['Created', fmt(contact.created_at)]].map(([l,v]) =>
              v ? <div key={l}><span className="text-slate-400 text-xs">{l}</span><p className="font-medium">{v}</p></div> : null
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Deals */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Deals ({contact.deals?.length || 0})</h2>
          {(contact.deals || []).map(d => (
            <div key={d.id} className="py-2 border-b border-slate-50 last:border-0">
              <p className="font-medium text-sm">{d.title}</p>
              <p className="text-xs text-slate-400 capitalize">{d.stage?.replace(/_/g,' ')} · {d.value ? `$${Number(d.value).toLocaleString()}` : '—'}</p>
            </div>
          ))}
          {!contact.deals?.length && <p className="text-xs text-slate-400">No deals</p>}
        </div>

        {/* Tasks */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Tasks ({contact.tasks?.length || 0})</h2>
          {(contact.tasks || []).map(t => (
            <div key={t.id} className="py-2 border-b border-slate-50 last:border-0 flex justify-between">
              <div>
                <p className="font-medium text-sm">{t.title}</p>
                <p className="text-xs text-slate-400">Due {fmt(t.due_date)}</p>
              </div>
              <span className={`text-xs px-1.5 py-0.5 rounded h-fit ${t.status==='completed'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{t.status}</span>
            </div>
          ))}
          {!contact.tasks?.length && <p className="text-xs text-slate-400">No tasks</p>}
        </div>

        {/* WhatsApp messages */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">WhatsApp ({contact.messages?.length || 0})</h2>
          {(contact.messages || []).slice(0,5).map(m => (
            <div key={m.id} className={`py-2 border-b border-slate-50 last:border-0`}>
              <p className="text-xs text-slate-400">{m.direction === 'inbound' ? '← In' : '→ Out'} · {fmt(m.timestamp)}</p>
              <p className="text-sm truncate">{m.body}</p>
            </div>
          ))}
          {!contact.messages?.length && <p className="text-xs text-slate-400">No messages</p>}
        </div>
      </div>

      {/* Activity log */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Activity Log</h2>
        <div className="flex gap-3 mb-5">
          <select value={noteType} onChange={e => setNoteType(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400">
            {['note','call','email','meeting'].map(t => <option key={t}>{t}</option>)}
          </select>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note, call log, or activity…"
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400"
            onKeyDown={e => e.key === 'Enter' && addNote()} />
          <button onClick={addNote} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Add</button>
        </div>
        <div className="space-y-3">
          {(contact.notes || []).map(n => (
            <div key={n.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm flex-shrink-0">
                {n.type === 'call' ? '📞' : n.type === 'email' ? '✉️' : n.type === 'meeting' ? '🤝' : n.type === 'whatsapp' ? '💬' : '📝'}
              </div>
              <div>
                <p className="text-xs text-slate-400 capitalize">{n.type} · {fmt(n.created_at)}</p>
                <p className="text-sm text-slate-700">{n.body}</p>
              </div>
            </div>
          ))}
          {!contact.notes?.length && <p className="text-sm text-slate-400">No activity yet</p>}
        </div>
      </div>
    </div>
  )
}
