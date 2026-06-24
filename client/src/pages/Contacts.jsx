import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api'
import Modal from '../components/Modal'

const STATUS_COLORS = {
  lead: 'bg-indigo-100 text-indigo-700',
  prospect: 'bg-yellow-100 text-yellow-700',
  customer: 'bg-green-100 text-green-700',
  churned: 'bg-red-100 text-red-600',
}
const SOURCE_COLORS = {
  manual: 'bg-slate-100 text-slate-600',
  meta_lead: 'bg-blue-100 text-blue-700',
  whatsapp: 'bg-green-100 text-green-700',
}

export default function Contacts() {
  const [contacts, setContacts] = useState([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({})
  const [companies, setCompanies] = useState([])

  const load = useCallback(() => {
    const p = new URLSearchParams({ search, status: filterStatus, source: filterSource, limit: 200 })
    api.get(`/contacts?${p}`).then(r => setContacts(r.contacts || [])).catch(console.error)
  }, [search, filterStatus, filterSource])

  useEffect(() => { load() }, [load])
  useEffect(() => { api.get('/companies').then(r => setCompanies(r.companies || [])) }, [])

  const openAdd = () => { setForm({}); setModal(true) }
  const onChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const save = async () => {
    try {
      if (form.id) await api.put(`/contacts/${form.id}`, form)
      else await api.post('/contacts', form)
      toast.success(form.id ? 'Contact updated' : 'Contact created')
      setModal(false); load()
    } catch (e) { toast.error(e.error || 'Error') }
  }

  const del = async (id) => {
    if (!confirm('Delete this contact?')) return
    await api.delete(`/contacts/${id}`)
    toast.success('Deleted'); load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Contacts</h1>
        <button onClick={openAdd} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">+ Add Contact</button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, company…"
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-64 focus:outline-none focus:border-indigo-400" />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400">
          <option value="">All Statuses</option>
          {['lead','prospect','customer','churned'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400">
          <option value="">All Sources</option>
          {['manual','meta_lead','whatsapp'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              {['Name','Email','Phone','Company','Status','Source','Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-slate-400">No contacts found</td></tr>
            )}
            {contacts.map(c => (
              <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <Link to={`/contacts/${c.id}`} className="font-semibold text-indigo-600 hover:underline">
                    {c.first_name} {c.last_name || ''}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-500">{c.email || '—'}</td>
                <td className="px-4 py-3 text-slate-500">{c.phone || '—'}</td>
                <td className="px-4 py-3 text-slate-500">{c.company_name || c.company || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[c.status] || 'bg-slate-100 text-slate-500'}`}>{c.status}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SOURCE_COLORS[c.source] || 'bg-slate-100 text-slate-500'}`}>{c.source?.replace(/_/g,' ')}</span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => { setForm(c); setModal(true) }} className="text-xs text-slate-500 hover:text-indigo-600 mr-3 font-medium">Edit</button>
                  <button onClick={() => del(c.id)} className="text-xs text-red-400 hover:text-red-600 font-medium">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={form.id ? 'Edit Contact' : 'Add Contact'}>
        <div className="grid grid-cols-2 gap-4">
          {[['first_name','First Name *'],['last_name','Last Name'],['email','Email'],['phone','Phone'],['job_title','Job Title']].map(([n,l]) => (
            <div key={n}>
              <label className="block text-xs font-medium text-slate-600 mb-1">{l}</label>
              <input name={n} value={form[n] || ''} onChange={onChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Company</label>
            <select name="company_id" value={form.company_id || ''} onChange={onChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400">
              <option value="">— None —</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
            <select name="status" value={form.status || 'lead'} onChange={onChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400">
              {['lead','prospect','customer','churned'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">WhatsApp</label>
            <input name="whatsapp_id" value={form.whatsapp_id || ''} onChange={onChange} placeholder="+1234567890"
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
