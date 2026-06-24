import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../api'
import Modal from '../components/Modal'

const STAGES = [
  { key: 'prospecting', label: 'Prospecting', color: 'bg-slate-100' },
  { key: 'qualification', label: 'Qualification', color: 'bg-blue-50' },
  { key: 'proposal', label: 'Proposal', color: 'bg-yellow-50' },
  { key: 'negotiation', label: 'Negotiation', color: 'bg-orange-50' },
  { key: 'closed_won', label: 'Won ✓', color: 'bg-green-50' },
  { key: 'closed_lost', label: 'Lost ✗', color: 'bg-red-50' },
]

const fmt = n => `$${Number(n || 0).toLocaleString()}`

export default function Pipeline() {
  const [pipeline, setPipeline] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({})
  const [contacts, setContacts] = useState([])

  const load = () => api.get('/deals').then(r => setPipeline(r.pipeline || [])).catch(console.error)
  useEffect(() => { load() }, [])
  useEffect(() => { api.get('/contacts?limit=200').then(r => setContacts(r.contacts || [])) }, [])

  const onChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const save = async () => {
    try {
      if (form.id) await api.put(`/deals/${form.id}`, form)
      else await api.post('/deals', form)
      toast.success(form.id ? 'Deal updated' : 'Deal created'); setModal(false); load()
    } catch (e) { toast.error(e.error || 'Error') }
  }

  const moveStage = async (deal, stage) => {
    await api.put(`/deals/${deal.id}`, { stage })
    toast.success('Stage updated'); load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Deals Pipeline</h1>
        <button onClick={() => { setForm({ stage: 'prospecting' }); setModal(true) }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">+ Add Deal</button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {STAGES.map(stage => {
          const col = pipeline.find(p => p.stage === stage.key) || { deals: [], total: 0 }
          return (
            <div key={stage.key} className={`flex-shrink-0 w-52 ${stage.color} rounded-xl p-3`}>
              <div className="mb-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{stage.label}</p>
                <p className="text-xs text-slate-400">{col.deals.length} deals · {fmt(col.total)}</p>
              </div>
              <div className="space-y-2">
                {col.deals.map(deal => (
                  <div key={deal.id} onClick={() => { setForm(deal); setModal(true) }}
                    className="bg-white rounded-lg p-3 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-shadow">
                    <p className="font-semibold text-sm leading-tight">{deal.title}</p>
                    {deal.contact_name?.trim() && <p className="text-xs text-slate-400 mt-1">{deal.contact_name.trim()}</p>}
                    <p className="text-sm font-bold text-indigo-600 mt-2">{fmt(deal.value)}</p>
                    {deal.expected_close && <p className="text-xs text-slate-400 mt-1">Close: {new Date(deal.expected_close).toLocaleDateString()}</p>}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={form.id ? 'Edit Deal' : 'Add Deal'}>
        <div className="space-y-3">
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Title *</label>
            <input name="title" value={form.title || ''} onChange={onChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Contact</label>
              <select name="contact_id" value={form.contact_id || ''} onChange={onChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400">
                <option value="">— None —</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name||''}</option>)}
              </select></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Value ($)</label>
              <input name="value" type="number" value={form.value || ''} onChange={onChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Stage</label>
              <select name="stage" value={form.stage || 'prospecting'} onChange={onChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400">
                {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Probability (%)</label>
              <input name="probability" type="number" value={form.probability || ''} onChange={onChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Expected Close</label>
              <input name="expected_close" type="date" value={form.expected_close || ''} onChange={onChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400" /></div>
          </div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
            <textarea name="notes" value={form.notes || ''} onChange={onChange} rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400" /></div>
        </div>
        <div className="flex justify-between items-center mt-5">
          {form.id && <button onClick={async () => { if(!confirm('Delete?')) return; await api.delete(`/deals/${form.id}`); setModal(false); load() }}
            className="px-3 py-2 text-red-500 text-sm hover:bg-red-50 rounded-lg">Delete</button>}
          <div className="flex gap-3 ml-auto">
            <button onClick={() => setModal(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm">Cancel</button>
            <button onClick={save} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Save</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
