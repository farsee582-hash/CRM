import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../api'
import Modal from '../components/Modal'

const fmtINR = n => '₹' + Number(n||0).toLocaleString('en-IN')

export default function Showrooms() {
  const [showrooms, setShowrooms] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({})

  const load = () => api.get('/showrooms').then(setShowrooms)
  useEffect(() => { load() }, [])
  const onChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const save = async () => {
    try {
      if (form.id) await api.put(`/showrooms/${form.id}`, form)
      else await api.post('/showrooms', form)
      toast.success(form.id ? 'Updated' : 'Showroom added')
      setModal(false); load()
    } catch(e) { toast.error(e.error||'Error') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Showrooms</h1>
        <button onClick={() => { setForm({}); setModal(true) }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">+ Add Showroom</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {showrooms.length === 0 && <div className="col-span-3 text-center py-12 text-slate-400">No showrooms yet</div>}
        {showrooms.map(s => (
          <div key={s.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-lg">🏪 {s.name}</p>
                <p className="text-sm text-slate-400">{s.city||'—'}</p>
              </div>
              <button onClick={() => { setForm(s); setModal(true) }} className="text-xs text-slate-400 hover:text-indigo-600">Edit</button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-indigo-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-indigo-600">{s.lead_count||0}</p>
                <p className="text-xs text-slate-400">Total Leads</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-sm font-bold text-green-600">{fmtINR(s.sale_count||0)}</p>
                <p className="text-xs text-slate-400">Sales</p>
              </div>
            </div>
            {s.manager_name && <p className="text-xs text-slate-400 mt-3">Manager: {s.manager_name}</p>}
            {s.phone && <p className="text-xs text-slate-400">📞 {s.phone}</p>}
          </div>
        ))}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={form.id ? 'Edit Showroom' : 'Add Showroom'}>
        <div className="grid grid-cols-2 gap-4">
          {[['name','Showroom Name *'],['city','City'],['address','Address'],['phone','Phone'],['manager_name','Manager Name']].map(([n,l]) => (
            <div key={n} className={n==='address'?'col-span-2':''}>
              <label className="block text-xs font-medium text-slate-600 mb-1">{l}</label>
              <input name={n} value={form[n]||''} onChange={onChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400" />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={() => setModal(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm">Cancel</button>
          <button onClick={save} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Save</button>
        </div>
      </Modal>
    </div>
  )
}
