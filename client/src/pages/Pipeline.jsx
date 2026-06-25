import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../api'
import Modal from '../components/Modal'

const STAGES = [
  { key: 'new_lead',       label: 'New Lead',       color: 'bg-slate-50',   badge: 'bg-slate-200 text-slate-700' },
  { key: 'proposal_shared',label: 'Proposal Shared',color: 'bg-blue-50',    badge: 'bg-blue-100 text-blue-700' },
  { key: 'under_review',   label: 'Under Review',   color: 'bg-yellow-50',  badge: 'bg-yellow-100 text-yellow-700' },
  { key: 'closed_won',     label: 'Closed Won ✓',   color: 'bg-green-50',   badge: 'bg-green-100 text-green-700' },
  { key: 'closed_lost',    label: 'Closed Lost ✗',  color: 'bg-red-50',     badge: 'bg-red-100 text-red-600' },
]

const fmt = n => `₹${Number(n||0).toLocaleString('en-IN')}`
const inp = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400"

export default function Pipeline() {
  const [pipeline, setPipeline] = useState([])
  const [showrooms, setShowrooms] = useState([])
  const [contacts, setContacts] = useState([])
  const [users, setUsers] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({})

  // filters
  const [filterShowroom, setFilterShowroom] = useState('')
  const [filterCampaign, setFilterCampaign] = useState('')
  const [filterUser, setFilterUser] = useState('')

  const load = () => {
    const p = new URLSearchParams()
    if (filterShowroom) p.set('showroom_id', filterShowroom)
    if (filterCampaign) p.set('campaign_id', filterCampaign)
    if (filterUser) p.set('assigned_to', filterUser)
    api.get(`/deals?${p}`).then(r => setPipeline(r.pipeline || [])).catch(console.error)
  }

  useEffect(() => { load() }, [filterShowroom, filterCampaign, filterUser])
  useEffect(() => {
    api.get('/contacts?limit=300').then(r => setContacts(r.contacts || []))
    api.get('/showrooms').then(setShowrooms).catch(console.error)
    api.get('/crm-users').then(setUsers).catch(console.error)
    api.get('/campaigns').then(setCampaigns).catch(console.error)
  }, [])

  const onChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const save = async () => {
    try {
      if (form.id) await api.put(`/deals/${form.id}`, form)
      else await api.post('/deals', form)
      toast.success(form.id ? 'Deal updated' : 'Deal created')
      setModal(false); load()
    } catch (e) { toast.error(e.error || 'Error') }
  }

  const totalPipeline = pipeline.reduce((sum, col) => sum + Number(col.total || 0), 0)
  const totalDeals = pipeline.reduce((sum, col) => sum + (col.deals?.length || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Sales Pipeline</h1>
          <p className="text-sm text-slate-500">{totalDeals} deals · {fmt(totalPipeline)} total value</p>
        </div>
        <button onClick={() => { setForm({ stage: 'new_lead', value: '' }); setModal(true) }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">+ Add Deal</button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={filterShowroom} onChange={e => setFilterShowroom(e.target.value)} className={inp + " w-auto"}>
          <option value="">All Showrooms</option>
          {showrooms.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterCampaign} onChange={e => setFilterCampaign(e.target.value)} className={inp + " w-auto"}>
          <option value="">All Campaigns</option>
          {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className={inp + " w-auto"}>
          <option value="">All Users</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        {(filterShowroom||filterCampaign||filterUser) && (
          <button onClick={() => { setFilterShowroom(''); setFilterCampaign(''); setFilterUser('') }}
            className="px-3 py-2 text-sm text-slate-500 hover:text-red-600 border border-slate-200 rounded-lg">Clear</button>
        )}
      </div>

      {/* Kanban Board */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGES.map(stage => {
          const col = pipeline.find(p => p.stage === stage.key) || { deals: [], total: 0 }
          return (
            <div key={stage.key} className={`flex-shrink-0 w-56 ${stage.color} rounded-xl p-3 border border-slate-200`}>
              <div className="mb-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${stage.badge}`}>{stage.label}</span>
                <p className="text-xs text-slate-500 mt-1">{col.deals?.length || 0} deals · {fmt(col.total)}</p>
              </div>
              <div className="space-y-2">
                {(col.deals || []).map(deal => (
                  <div key={deal.id} onClick={() => { setForm(deal); setModal(true) }}
                    className="bg-white rounded-lg p-3 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-shadow">
                    <p className="font-semibold text-sm leading-tight">{deal.title}</p>
                    {deal.contact_name?.trim() && <p className="text-xs text-slate-400 mt-1">👤 {deal.contact_name.trim()}</p>}
                    {deal.showroom_name && <p className="text-xs text-slate-400">🏪 {deal.showroom_name}</p>}
                    <p className="text-sm font-bold text-indigo-600 mt-2">{fmt(deal.value)}</p>
                    {deal.expected_close && <p className="text-xs text-slate-400 mt-1">Close: {new Date(deal.expected_close).toLocaleDateString('en-IN')}</p>}
                    {deal.assigned_name && <p className="text-xs text-slate-400">Owner: {deal.assigned_name}</p>}
                  </div>
                ))}
                <button onClick={() => { setForm({ stage: stage.key, value: '' }); setModal(true) }}
                  className="w-full text-xs text-slate-400 hover:text-indigo-600 py-2 border border-dashed border-slate-200 rounded-lg hover:border-indigo-300">
                  + Add deal
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Deal Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={form.id ? 'Edit Deal' : 'Add Deal'}>
        <div className="space-y-3">
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Deal Name *</label>
            <input name="title" value={form.title||''} onChange={onChange} className={inp} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Stage</label>
              <select name="stage" value={form.stage||'new_lead'} onChange={onChange} className={inp}>
                {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Value (₹)</label>
              <input name="value" type="number" value={form.value||''} onChange={onChange} className={inp} /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Contact</label>
              <select name="contact_id" value={form.contact_id||''} onChange={onChange} className={inp}>
                <option value="">— None —</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name||''}</option>)}
              </select></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Deal Owner</label>
              <select name="assigned_to" value={form.assigned_to||''} onChange={onChange} className={inp}>
                <option value="">— None —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Showroom</label>
              <select name="showroom_id" value={form.showroom_id||''} onChange={onChange} className={inp}>
                <option value="">— None —</option>
                {showrooms.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Campaign</label>
              <select name="campaign_id" value={form.campaign_id||''} onChange={onChange} className={inp}>
                <option value="">— None —</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Expected Close</label>
              <input name="expected_close" type="date" value={form.expected_close||''} onChange={onChange} className={inp} /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Probability (%)</label>
              <input name="probability" type="number" value={form.probability||''} onChange={onChange} className={inp} /></div>
          </div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
            <textarea name="notes" value={form.notes||''} onChange={onChange} rows={2} className={inp} /></div>
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
