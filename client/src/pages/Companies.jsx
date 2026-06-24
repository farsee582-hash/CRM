import React, { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import api from '../api'
import Modal from '../components/Modal'

export default function Companies() {
  const [companies, setCompanies] = useState([])
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({})

  const load = useCallback(() => {
    api.get(`/companies?search=${search}`).then(r => setCompanies(r.companies || [])).catch(console.error)
  }, [search])

  useEffect(() => { load() }, [load])
  const onChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const save = async () => {
    try {
      if (form.id) await api.put(`/companies/${form.id}`, form)
      else await api.post('/companies', form)
      toast.success(form.id ? 'Updated' : 'Created'); setModal(false); load()
    } catch (e) { toast.error(e.error || 'Error') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Companies</h1>
        <button onClick={() => { setForm({}); setModal(true) }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">+ Add Company</button>
      </div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search companies…"
        className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-64 focus:outline-none focus:border-indigo-400" />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              {['Company','Industry','Website','Phone','Contacts','Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {companies.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-slate-400">No companies yet</td></tr>}
            {companies.map(c => (
              <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold">{c.name}</td>
                <td className="px-4 py-3 text-slate-500">{c.industry || '—'}</td>
                <td className="px-4 py-3 text-slate-500">{c.website ? <a href={c.website} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">{c.website}</a> : '—'}</td>
                <td className="px-4 py-3 text-slate-500">{c.phone || '—'}</td>
                <td className="px-4 py-3 text-slate-500">{c.contact_count || 0}</td>
                <td className="px-4 py-3">
                  <button onClick={() => { setForm(c); setModal(true) }} className="text-xs text-slate-500 hover:text-indigo-600 mr-3 font-medium">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={form.id ? 'Edit Company' : 'Add Company'}>
        <div className="grid grid-cols-2 gap-4">
          {[['name','Company Name *'],['industry','Industry'],['website','Website'],['phone','Phone'],['email','Email'],['address','Address'],['city','City'],['country','Country'],['employees','Employees'],['annual_revenue','Annual Revenue']].map(([n,l]) => (
            <div key={n}>
              <label className="block text-xs font-medium text-slate-600 mb-1">{l}</label>
              <input name={n} value={form[n] || ''} onChange={onChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400" />
            </div>
          ))}
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
            <textarea name="notes" value={form.notes || ''} onChange={onChange} rows={3}
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
