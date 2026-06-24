import React, { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import api from '../api'
import Modal from '../components/Modal'

const CATEGORIES = ['gold','diamond','platinum','silver','advance','scheme']
const ICON = { gold:'🥇', diamond:'💎', platinum:'⚪', silver:'🥈', advance:'📋', scheme:'🎫' }
const fmtINR = n => '₹' + Number(n||0).toLocaleString('en-IN')
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '—'

function SaleForm({ form, onChange, contacts, showrooms, users, campaigns }) {
  const cat = form.product_category || 'gold'
  const needsBill = ['gold','diamond','platinum','silver'].includes(cat)
  const needsCarat = ['diamond','platinum'].includes(cat)
  const needsOrder = cat === 'advance'
  const needsScheme = cat === 'scheme'

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Product Category *</label>
          <select name="product_category" value={cat} onChange={onChange}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400">
            {CATEGORIES.map(c => <option key={c} value={c}>{ICON[c]} {c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Amount (₹) *</label>
          <input name="amount" type="number" value={form.amount||''} onChange={onChange}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400" />
        </div>
        {needsBill && <>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Bill No *</label>
            <input name="bill_no" value={form.bill_no||''} onChange={onChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Weight (grams)</label>
            <input name="weight_grams" type="number" step="0.001" value={form.weight_grams||''} onChange={onChange}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400" />
          </div>
        </>}
        {needsCarat && <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Diamond ct (Carat)</label>
          <input name="diamond_carat" type="number" step="0.001" value={form.diamond_carat||''} onChange={onChange}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400" />
        </div>}
        {needsOrder && <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Order No *</label>
          <input name="order_no" value={form.order_no||''} onChange={onChange}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400" />
        </div>}
        {needsScheme && <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Scheme No *</label>
          <input name="scheme_no" value={form.scheme_no||''} onChange={onChange}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400" />
        </div>}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Contact Person</label>
          <input name="contact_person" value={form.contact_person||''} onChange={onChange}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Sale Date</label>
          <input name="sale_date" type="date" value={form.sale_date||''} onChange={onChange}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">CRM Contact</label>
          <select name="contact_id" value={form.contact_id||''} onChange={onChange}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400">
            <option value="">— None —</option>
            {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name||''} {c.phone?`(${c.phone})`:''}</option>)}
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
          <label className="block text-xs font-medium text-slate-600 mb-1">Sales Person</label>
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
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
        <textarea name="notes" value={form.notes||''} onChange={onChange} rows={2}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400" />
      </div>
    </div>
  )
}

export default function Sales() {
  const [sales, setSales] = useState([])
  const [summary, setSummary] = useState({ byProduct:[], total:{} })
  const [contacts, setContacts] = useState([])
  const [showrooms, setShowrooms] = useState([])
  const [users, setUsers] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ product_category:'gold' })
  const [filters, setFilters] = useState({ showroom_id:'', campaign_id:'', assigned_to:'', product_category:'' })

  const load = useCallback(() => {
    const p = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([,v])=>v)))
    api.get(`/sales?${p}`).then(setSales)
    api.get(`/sales/summary?${p}`).then(setSummary)
  }, [filters])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    api.get('/contacts?limit=500').then(r => setContacts(r.contacts||[]))
    api.get('/showrooms').then(setShowrooms)
    api.get('/crm-users').then(setUsers)
    api.get('/campaigns').then(setCampaigns)
  }, [])

  const onChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  const onFilter = e => setFilters(f => ({ ...f, [e.target.name]: e.target.value }))

  const save = async () => {
    try {
      if (form.id) await api.put(`/sales/${form.id}`, form)
      else await api.post('/sales', form)
      toast.success(form.id ? 'Sale updated' : 'Sale recorded')
      setModal(false); setForm({ product_category:'gold' }); load()
    } catch (e) { toast.error(e.error || 'Error') }
  }

  const del = async (id) => {
    if (!confirm('Delete this sale?')) return
    await api.delete(`/sales/${id}`)
    toast.success('Deleted'); load()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Sales</h1>
        <button onClick={() => { setForm({ product_category:'gold' }); setModal(true) }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">+ Record Sale</button>
      </div>

      {/* Summary by product */}
      <div className="grid grid-cols-6 gap-3">
        {['gold','diamond','platinum','silver','advance','scheme'].map(cat => {
          const p = summary.byProduct?.find(x => x.product_category === cat)
          return (
            <div key={cat} className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
              <div className="text-2xl mb-1">{ICON[cat]}</div>
              <p className="text-xs font-semibold text-slate-500 capitalize mb-1">{cat}</p>
              <p className="text-base font-bold text-indigo-600">{fmtINR(p?.total||0)}</p>
              <p className="text-xs text-slate-400">{p?.count||0} bills</p>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        {[
          ['product_category','All Products', CATEGORIES.map(c=>({v:c,l:ICON[c]+' '+c}))],
          ['showroom_id','All Showrooms', showrooms.map(s=>({v:s.id,l:s.name}))],
          ['assigned_to','All Users', users.map(u=>({v:u.id,l:u.name}))],
          ['campaign_id','All Campaigns', campaigns.map(c=>({v:c.id,l:c.name}))],
        ].map(([name, placeholder, opts]) => (
          <select key={name} name={name} value={filters[name]} onChange={onFilter}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400 bg-white">
            <option value="">{placeholder}</option>
            {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              {['Category','Bill/Order No','Contact Person','Amount','Weight','Diamond ct','Showroom','Sales Person','Campaign','Date','Actions'].map(h => (
                <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 && <tr><td colSpan={11} className="text-center py-12 text-slate-400">No sales recorded yet</td></tr>}
            {sales.map(s => (
              <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-3 py-3">
                  <span className="flex items-center gap-1">
                    {ICON[s.product_category]} <span className="capitalize font-medium">{s.product_category}</span>
                  </span>
                </td>
                <td className="px-3 py-3 font-mono text-xs">{s.bill_no||s.order_no||s.scheme_no||'—'}</td>
                <td className="px-3 py-3">{s.contact_person||s.contact_name||'—'}</td>
                <td className="px-3 py-3 font-bold text-green-600">{fmtINR(s.amount)}</td>
                <td className="px-3 py-3 text-slate-500">{s.weight_grams ? `${s.weight_grams}g` : '—'}</td>
                <td className="px-3 py-3 text-slate-500">{s.diamond_carat ? `${s.diamond_carat}ct` : '—'}</td>
                <td className="px-3 py-3 text-slate-400 text-xs">{s.showroom_name||'—'}</td>
                <td className="px-3 py-3 text-slate-400 text-xs">{s.user_name||'—'}</td>
                <td className="px-3 py-3 text-slate-400 text-xs">{s.campaign_name||'—'}</td>
                <td className="px-3 py-3 text-slate-400 text-xs whitespace-nowrap">{fmtDate(s.sale_date)}</td>
                <td className="px-3 py-3">
                  <button onClick={() => { setForm(s); setModal(true) }} className="text-xs text-slate-500 hover:text-indigo-600 font-medium mr-2">Edit</button>
                  <button onClick={() => del(s.id)} className="text-xs text-red-400 hover:text-red-600 font-medium">Del</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={form.id ? 'Edit Sale' : 'Record Sale'} wide>
        <SaleForm form={form} onChange={onChange} contacts={contacts} showrooms={showrooms} users={users} campaigns={campaigns} />
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={() => setModal(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm">Cancel</button>
          <button onClick={save} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Save</button>
        </div>
      </Modal>
    </div>
  )
}
