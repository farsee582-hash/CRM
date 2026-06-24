import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api'
import Modal from '../components/Modal'

const STAGE_COLORS = { new:'bg-blue-100 text-blue-700', contacted:'bg-yellow-100 text-yellow-700', proposal:'bg-purple-100 text-purple-700', closed_won:'bg-green-100 text-green-700', closed_lost:'bg-red-100 text-red-600' }
const SOURCE_COLORS = { manual:'bg-slate-100 text-slate-600', meta_lead:'bg-blue-100 text-blue-700', whatsapp:'bg-green-100 text-green-700', walk_in:'bg-orange-100 text-orange-700', referral:'bg-purple-100 text-purple-700', social_media:'bg-pink-100 text-pink-700', campaign:'bg-indigo-100 text-indigo-700' }
const SOURCES = ['manual','meta_lead','whatsapp','walk_in','referral','social_media','campaign']

export default function Contacts() {
  const [contacts, setContacts] = useState([])
  const [filters, setFilters] = useState({ search:'', lead_stage:'', source:'', showroom_id:'', assigned_to:'', campaign_id:'' })
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({})
  const [showrooms, setShowrooms] = useState([])
  const [users, setUsers] = useState([])
  const [campaigns, setCampaigns] = useState([])

  const load = useCallback(() => {
    const p = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([,v])=>v)))
    p.set('limit', 200)
    api.get(`/contacts?${p}`).then(r => setContacts(r.contacts||[])).catch(console.error)
  }, [filters])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    api.get('/showrooms').then(setShowrooms)
    api.get('/crm-users').then(setUsers)
    api.get('/campaigns').then(setCampaigns)
  }, [])

  const onFilter = e => setFilters(f => ({ ...f, [e.target.name]: e.target.value }))
  const onChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const save = async () => {
    try {
      if (form.id) await api.put(`/contacts/${form.id}`, form)
      else await api.post('/contacts', form)
      toast.success(form.id ? 'Updated' : 'Contact created')
      setModal(false); load()
    } catch(e) { toast.error(e.error||'Error') }
  }

  const del = async (id) => {
    if (!confirm('Delete this contact?')) return
    await api.delete(`/contacts/${id}`)
    toast.success('Deleted'); load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Leads & Contacts</h1>
        <button onClick={() => { setForm({ lead_stage:'new', source:'manual' }); setModal(true) }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">+ Add Lead</button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <input name="search" value={filters.search} onChange={onFilter} placeholder="Search name, email, phone…"
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-56 focus:outline-none focus:border-indigo-400" />
        <select name="lead_stage" value={filters.lead_stage} onChange={onFilter}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400 bg-white">
          <option value="">All Stages</option>
          {['new','contacted','proposal','closed_won','closed_lost'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
        <select name="source" value={filters.source} onChange={onFilter}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400 bg-white">
          <option value="">All Sources</option>
          {SOURCES.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
        </select>
        <select name="showroom_id" value={filters.showroom_id} onChange={onFilter}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400 bg-white">
          <option value="">All Showrooms</option>
          {showrooms.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select name="assigned_to" value={filters.assigned_to} onChange={onFilter}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400 bg-white">
          <option value="">All Users</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select name="campaign_id" value={filters.campaign_id} onChange={onFilter}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400 bg-white">
          <option value="">All Campaigns</option>
          {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              {['Name','Phone','Email','Stage','Source','Showroom','Assigned To','Campaign','Actions'].map(h => (
                <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 && <tr><td colSpan={9} className="text-center py-12 text-slate-400">No contacts found</td></tr>}
            {contacts.map(c => (
              <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-3 py-3">
                  <Link to={`/contacts/${c.id}`} className="font-semibold text-indigo-600 hover:underline whitespace-nowrap">{c.first_name} {c.last_name||''}</Link>
                </td>
                <td className="px-3 py-3 text-slate-500">{c.phone||'—'}</td>
                <td className="px-3 py-3 text-slate-500 text-xs">{c.email||'—'}</td>
                <td className="px-3 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize whitespace-nowrap ${STAGE_COLORS[c.lead_stage]||'bg-slate-100 text-slate-500'}`}>{c.lead_stage?.replace('_',' ')}</span>
                </td>
                <td className="px-3 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize whitespace-nowrap ${SOURCE_COLORS[c.source]||'bg-slate-100 text-slate-500'}`}>{c.source?.replace(/_/g,' ')}</span>
                </td>
                <td className="px-3 py-3 text-slate-400 text-xs">{c.showroom_name||'—'}</td>
                <td className="px-3 py-3 text-slate-400 text-xs">{c.assigned_name||'—'}</td>
                <td className="px-3 py-3 text-slate-400 text-xs">{c.campaign_name||'—'}</td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <button onClick={() => { setForm(c); setModal(true) }} className="text-xs text-slate-500 hover:text-indigo-600 font-medium mr-2">Edit</button>
                  <button onClick={() => del(c.id)} className="text-xs text-red-400 hover:text-red-600 font-medium">Del</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={form.id ? 'Edit Contact' : 'Add Lead'} wide>
        <div className="grid grid-cols-2 gap-4">
          {[['first_name','First Name *'],['last_name','Last Name'],['phone','Phone'],['email','Email'],['job_title','Job Title'],['company','Company']].map(([n,l]) => (
            <div key={n}>
              <label className="block text-xs font-medium text-slate-600 mb-1">{l}</label>
              <input name={n} value={form[n]||''} onChange={onChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Lead Stage</label>
            <select name="lead_stage" value={form.lead_stage||'new'} onChange={onChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400">
              {['new','contacted','proposal','closed_won','closed_lost'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Source</label>
            <select name="source" value={form.source||'manual'} onChange={onChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400">
              {SOURCES.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
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
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Assigned To</label>
            <select name="assigned_to" value={form.assigned_to||''} onChange={onChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400">
              <option value="">— None —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Campaign</label>
            <select name="campaign_id" value={form.campaign_id||''} onChange={onChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400">
              <option value="">— None —</option>
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">WhatsApp Number</label>
            <input name="whatsapp_id" value={form.whatsapp_id||''} onChange={onChange} placeholder="+91XXXXXXXXXX"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400" />
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
