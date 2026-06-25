import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../api'
import Modal from '../components/Modal'

const STAGES = [
  { key: 'new_lead',        label: 'New Lead',        color: 'bg-slate-50',   header: 'bg-slate-200 text-slate-700' },
  { key: 'proposal_shared', label: 'Proposal Shared', color: 'bg-blue-50',    header: 'bg-blue-100 text-blue-700' },
  { key: 'under_review',    label: 'Under Review',    color: 'bg-yellow-50',  header: 'bg-yellow-100 text-yellow-700' },
  { key: 'closed_won',      label: 'Closed Won ✓',    color: 'bg-green-50',   header: 'bg-green-100 text-green-700' },
  { key: 'closed_lost',     label: 'Closed Lost ✗',   color: 'bg-red-50',     header: 'bg-red-100 text-red-600' },
]

const fmt = n => '₹' + Number(n||0).toLocaleString('en-IN')
const inp = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400"

export default function Pipeline() {
  const [pipeline, setPipeline] = useState([])
  const [showrooms, setShowrooms] = useState([])
  const [contacts, setContacts] = useState([])
  const [users, setUsers] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({})
  const [activeShowroom, setActiveShowroom] = useState('all')
  const [filterCampaign, setFilterCampaign] = useState('')
  const [filterUser, setFilterUser] = useState('')

  const load = () => {
    const p = new URLSearchParams()
    if (activeShowroom !== 'all') p.set('showroom_id', activeShowroom)
    if (filterCampaign) p.set('campaign_id', filterCampaign)
    if (filterUser) p.set('assigned_to', filterUser)
    api.get(`/deals?${p}`).then(r => setPipeline(r.pipeline || [])).catch(console.error)
  }

  useEffect(() => { load() }, [activeShowroom, filterCampaign, filterUser])
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

  const totalValue = pipeline.reduce((s, col) => s + Number(col.total||0), 0)
  const totalDeals = pipeline.reduce((s, col) => s + (col.deals?.length||0), 0)

  const activeShowroomName = activeShowroom === 'all' ? 'All Showrooms' : showrooms.find(s => s.id == activeShowroom)?.name || ''

  return (
    <div className="flex flex-col h-full" style={{height: 'calc(100vh - 48px)'}}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">Sales Pipeline</h1>
          <p className="text-sm text-slate-500">{activeShowroomName} · {totalDeals} deals · {fmt(totalValue)}</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={filterCampaign} onChange={e => setFilterCampaign(e.target.value)} className={inp + " w-auto"}>
            <option value="">All Campaigns</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className={inp + " w-auto"}>
            <option value="">All Users</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <button onClick={() => { setForm({ stage: 'new_lead', value: '', showroom_id: activeShowroom !== 'all' ? activeShowroom : '' }); setModal(true) }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 whitespace-nowrap">+ Add Deal</button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-3 overflow-x-auto flex-1 pb-2">
        {STAGES.map(stage => {
          const col = pipeline.find(p => p.stage === stage.key) || { deals: [], total: 0 }
          return (
            <div key={stage.key} className={`flex-shrink-0 w-56 ${stage.color} rounded-xl border border-slate-200 flex flex-col`}>
              <div className="p-3 border-b border-slate-200">
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${stage.header}`}>{stage.label}</span>
                <p className="text-xs text-slate-500 mt-1">{col.deals?.length||0} deals · {fmt(col.total)}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {(col.deals||[]).map(deal => (
                  <div key={deal.id} onClick={() => { setForm(deal); setModal(true) }}
                    className="bg-white rounded-lg p-3 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-shadow">
                    <p className="font-semibold text-sm leading-tight">{deal.title}</p>
                    {deal.contact_name?.trim() && <p className="text-xs text-slate-400 mt-1">👤 {deal.contact_name.trim()}</p>}
                    {deal.assigned_name && <p className="text-xs text-slate-400">🧑 {deal.assigned_name}</p>}
                    {deal.campaign_name && <p className="text-xs text-slate-400">📣 {deal.campaign_name}</p>}
                    <p className="text-sm font-bold text-indigo-600 mt-2">{fmt(deal.value)}</p>
                    {deal.expected_close && <p className="text-xs text-slate-400 mt-1">📅 {new Date(deal.expected_close).toLocaleDateString('en-IN')}</p>}
                  </div>
                ))}
                <button onClick={() => { setForm({ stage: stage.key, value: '', showroom_id: activeShowroom !== 'all' ? activeShowroom : '' }); setModal(true) }}
                  className="w-full text-xs text-slate-400 hover:text-indigo-600 py-2 border border-dashed border-slate-200 rounded-lg hover:border-indigo-300">
                  + Add
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom showroom tabs (Zoho-style) */}
      <div className="border-t border-slate-200 bg-white flex items-center gap-1 px-2 py-1 overflow-x-auto mt-2 rounded-xl shadow-sm">
        <button
          onClick={() => setActiveShowroom('all')}
          className={`flex-shrink-0 px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${activeShowroom === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
          📊 All Pipelines
        </button>
        {showrooms.map(s => (
          <button key={s.id}
            onClick={() => setActiveShowroom(String(s.id))}
            className={`flex-shrink-0 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${activeShowroom === String(s.id) ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
            🏪 {s.name}
          </button>
        ))}
        <div className="ml-auto flex-shrink-0 text-xs text-slate-400 px-2">Switch Pipeline ▲</div>
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
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Showroom / Pipeline</label>
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
