import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../api'
import Modal from '../components/Modal'

const fmtINR = n => '₹' + Number(n||0).toLocaleString('en-IN')
const STATUS_COLOR = { active:'bg-green-100 text-green-700', paused:'bg-yellow-100 text-yellow-700', ended:'bg-slate-100 text-slate-500' }
const SOURCES = ['Facebook','Instagram','WhatsApp','Google','Walk-in','Referral','Print','TV','Other']

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([])
  const [showrooms, setShowrooms] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({})
  const [filterShowroom, setFilterShowroom] = useState('')

  const load = () => {
    const p = filterShowroom ? `?showroom_id=${filterShowroom}` : ''
    api.get(`/campaigns${p}`).then(setCampaigns)
  }
  useEffect(() => { load() }, [filterShowroom])
  useEffect(() => { api.get('/showrooms').then(setShowrooms) }, [])
  const onChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const save = async () => {
    try {
      if (form.id) await api.put(`/campaigns/${form.id}`, form)
      else await api.post('/campaigns', form)
      toast.success(form.id ? 'Updated' : 'Campaign created')
      setModal(false); load()
    } catch(e) { toast.error(e.error||'Error') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Campaigns</h1>
        <button onClick={() => { setForm({ status:'active' }); setModal(true) }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">+ New Campaign</button>
      </div>

      <div className="flex gap-3">
        <select value={filterShowroom} onChange={e => setFilterShowroom(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400 bg-white">
          <option value="">All Showrooms</option>
          {showrooms.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              {['Campaign','Showroom','Source','Status','Leads','Sales','Budget','Dates','Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 && <tr><td colSpan={9} className="text-center py-12 text-slate-400">No campaigns yet</td></tr>}
            {campaigns.map(c => (
              <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold">{c.name}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{c.showroom_name||'—'}</td>
                <td className="px-4 py-3 text-slate-500">{c.source||'—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[c.status]||'bg-slate-100 text-slate-500'}`}>{c.status}</span>
                </td>
                <td className="px-4 py-3 font-semibold text-indigo-600">{c.lead_count||0}</td>
                <td className="px-4 py-3 font-bold text-green-600">{fmtINR(c.total_sales||0)}</td>
                <td className="px-4 py-3 text-slate-500">{c.budget ? fmtINR(c.budget) : '—'}</td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {c.start_date ? new Date(c.start_date).toLocaleDateString('en-IN') : '—'} –
                  {c.end_date ? new Date(c.end_date).toLocaleDateString('en-IN') : '—'}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => { setForm(c); setModal(true) }} className="text-xs text-slate-500 hover:text-indigo-600 font-medium">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={form.id ? 'Edit Campaign' : 'New Campaign'}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Campaign Name *</label>
            <input name="name" value={form.name||''} onChange={onChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Source / Channel</label>
            <select name="source" value={form.source||''} onChange={onChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400">
              <option value="">— Select —</option>
              {SOURCES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Showroom</label>
            <select name="showroom_id" value={form.showroom_id||''} onChange={onChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400">
              <option value="">— All Showrooms —</option>
              {showrooms.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Budget (₹)</label>
            <input name="budget" type="number" value={form.budget||''} onChange={onChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
            <select name="status" value={form.status||'active'} onChange={onChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400">
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="ended">Ended</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Start Date</label>
            <input name="start_date" type="date" value={form.start_date||''} onChange={onChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">End Date</label>
            <input name="end_date" type="date" value={form.end_date||''} onChange={onChange}
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
