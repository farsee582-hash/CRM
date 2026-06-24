import React, { useEffect, useState } from 'react'
import api from '../api'

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0)
const fmtNum = (n) => Number(n || 0).toLocaleString()

function StatCard({ label, value, sub, color = 'indigo' }) {
  const colors = { indigo: 'text-indigo-600', green: 'text-green-600', orange: 'text-orange-500', blue: 'text-blue-600' }
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${colors[color]}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)

  useEffect(() => { api.get('/dashboard').then(setData).catch(console.error) }, [])

  if (!data) return <div className="flex items-center justify-center h-64 text-slate-400">Loading…</div>

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Contacts" value={fmtNum(data.contacts.total)} sub={`+${data.contacts.new_30d} this month`} />
        <StatCard label="Pipeline Value" value={fmt(data.deals.pipeline_value)} sub={`${data.deals.open} open deals`} color="green" />
        <StatCard label="Meta Leads" value={fmtNum(data.contacts.from_meta)} sub={`${fmt(data.meta.total_spend)} spent`} color="blue" />
        <StatCard label="WhatsApp" value={fmtNum(data.whatsapp.total_messages)} sub="total messages" color="orange" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Recent Contacts</h2>
          <div className="space-y-3">
            {data.recent_contacts.length === 0 && <p className="text-slate-400 text-sm">No contacts yet</p>}
            {data.recent_contacts.map(c => (
              <div key={c.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {(c.first_name || '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{c.first_name} {c.last_name || ''}</p>
                  <p className="text-xs text-slate-400 truncate">{c.email || c.phone || '—'}</p>
                </div>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 capitalize">{c.source}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Recent Deals</h2>
          <div className="space-y-3">
            {data.recent_deals.length === 0 && <p className="text-slate-400 text-sm">No deals yet</p>}
            {data.recent_deals.map(d => (
              <div key={d.id} className="flex items-center justify-between">
                <div className="min-w-0 mr-2">
                  <p className="text-sm font-medium truncate">{d.title}</p>
                  <p className="text-xs text-slate-400 truncate">{d.contact_name?.trim() || '—'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-indigo-600">{fmt(d.value)}</p>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 capitalize">{d.stage?.replace(/_/g,' ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Upcoming Tasks
            {data.tasks.overdue > 0 && <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{data.tasks.overdue} overdue</span>}
          </h2>
          <div className="space-y-3">
            {data.upcoming_tasks.length === 0 && <p className="text-slate-400 text-sm">No tasks</p>}
            {data.upcoming_tasks.map(t => (
              <div key={t.id} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  <p className="text-xs text-slate-400">{t.contact_name?.trim() || '—'}</p>
                </div>
                <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                  t.priority === 'high' ? 'bg-red-100 text-red-600' :
                  t.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-slate-100 text-slate-500'
                }`}>{t.priority}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
