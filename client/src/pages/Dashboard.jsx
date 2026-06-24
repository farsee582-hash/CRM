import React, { useEffect, useState } from 'react'
import api from '../api'

const fmtINR = n => '₹' + Number(n||0).toLocaleString('en-IN', { maximumFractionDigits: 0 })
const fmtNum = n => Number(n||0).toLocaleString()

const STAGE_COLORS = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  proposal: 'bg-purple-100 text-purple-700',
  closed_won: 'bg-green-100 text-green-700',
  closed_lost: 'bg-red-100 text-red-600',
}
const PRODUCT_ICON = { gold:'🥇', diamond:'💎', platinum:'⚪', silver:'🥈', advance:'📋', scheme:'🎫' }

function StatCard({ label, value, sub, color='indigo' }) {
  const c = { indigo:'text-indigo-600', green:'text-green-600', orange:'text-orange-500', blue:'text-blue-600', purple:'text-purple-600' }
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${c[color]}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [showrooms, setShowrooms] = useState([])
  const [filterShowroom, setFilterShowroom] = useState('')
  const [campaignStats, setCampaignStats] = useState([])
  const [showroomStats, setShowroomStats] = useState([])

  const load = () => {
    const p = filterShowroom ? `?showroom_id=${filterShowroom}` : ''
    api.get(`/dashboard${p}`).then(setData).catch(console.error)
    api.get(`/dashboard/campaigns${p}`).then(setCampaignStats).catch(console.error)
    api.get('/dashboard/showrooms').then(setShowroomStats).catch(console.error)
  }

  useEffect(() => { api.get('/showrooms').then(setShowrooms) }, [])
  useEffect(() => { load() }, [filterShowroom])

  if (!data) return <div className="flex items-center justify-center h-64 text-slate-400">Loading…</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <select value={filterShowroom} onChange={e => setFilterShowroom(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400 bg-white">
          <option value="">All Showrooms</option>
          {showrooms.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard label="Total Leads" value={fmtNum(data.contacts.total)} sub={`+${data.contacts.new_30d} this month`} />
        <StatCard label="Total Sales" value={fmtINR(data.sales.total)} sub={`${data.sales.count} transactions`} color="green" />
        <StatCard label="Pipeline" value={fmtINR(data.deals.pipeline_value)} sub={`${data.deals.open} open deals`} color="purple" />
        <StatCard label="Meta Leads" value={fmtNum(data.contacts.from_meta)} sub="from ads" color="blue" />
        <StatCard label="Pending Tasks" value={fmtNum(data.tasks.pending)} sub={`${data.tasks.overdue} overdue`} color="orange" />
      </div>

      {/* Lead Stage + Source breakdown */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Leads by Stage</h2>
          <div className="space-y-2">
            {data.leads_by_stage.length === 0 && <p className="text-slate-400 text-sm">No data</p>}
            {data.leads_by_stage.map(row => (
              <div key={row.lead_stage} className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-28 text-center ${STAGE_COLORS[row.lead_stage] || 'bg-slate-100 text-slate-500'}`}>
                  {row.lead_stage?.replace('_',' ')}
                </span>
                <div className="flex-1 bg-slate-100 rounded-full h-2">
                  <div className="bg-indigo-500 h-2 rounded-full" style={{width: `${Math.min(100,(row.count/(data.contacts.total||1))*100)}%`}} />
                </div>
                <span className="text-sm font-bold text-slate-700 w-8 text-right">{row.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Leads by Source</h2>
          <div className="space-y-2">
            {data.leads_by_source.length === 0 && <p className="text-slate-400 text-sm">No data</p>}
            {data.leads_by_source.map(row => (
              <div key={row.source} className="flex items-center gap-3">
                <span className="text-xs text-slate-600 w-28 capitalize">{row.source?.replace(/_/g,' ')}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{width: `${Math.min(100,(row.count/(data.contacts.total||1))*100)}%`}} />
                </div>
                <span className="text-sm font-bold text-slate-700 w-8 text-right">{row.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sales by Product */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Sales by Product Category</h2>
        {data.sales_by_product.length === 0 
          ? <p className="text-slate-400 text-sm">No sales recorded yet</p>
          : <div className="grid grid-cols-3 gap-4">
              {data.sales_by_product.map(p => (
                <div key={p.product_category} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <span className="text-2xl">{PRODUCT_ICON[p.product_category] || '🔷'}</span>
                  <div>
                    <p className="font-semibold capitalize">{p.product_category}</p>
                    <p className="text-lg font-bold text-indigo-600">{fmtINR(p.total)}</p>
                    <p className="text-xs text-slate-400">{p.count} bills · {Number(p.weight||0).toFixed(2)}g</p>
                  </div>
                </div>
              ))}
            </div>
        }
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Showroom performance */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Showroom Performance</h2>
          <div className="space-y-2">
            {showroomStats.length === 0 && <p className="text-slate-400 text-sm">No showrooms yet</p>}
            {showroomStats.map(s => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="font-semibold text-sm">{s.name}</p>
                  <p className="text-xs text-slate-400">{s.city} · {s.lead_count} leads</p>
                </div>
                <p className="font-bold text-green-600">{fmtINR(s.total_sales)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* User performance */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">User Performance</h2>
          <div className="space-y-2">
            {data.user_performance.length === 0 && <p className="text-slate-400 text-sm">No users yet</p>}
            {data.user_performance.map((u,i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                    {(u.name||'?')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{u.name}</p>
                    <p className="text-xs text-slate-400 capitalize">{u.role?.replace('_',' ')} · {u.lead_count} leads</p>
                  </div>
                </div>
                <p className="font-bold text-green-600">{fmtINR(u.total_sales)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Campaign performance */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm overflow-hidden">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Campaign Performance</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Campaign','Showroom','Source','Total Leads','New','Contacted','Proposal','Won','Sales'].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaignStats.length === 0 && <tr><td colSpan={9} className="text-center py-8 text-slate-400">No campaigns yet</td></tr>}
              {campaignStats.map(c => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium">{c.name}</td>
                  <td className="px-3 py-2 text-slate-400 text-xs">{c.showroom_name||'—'}</td>
                  <td className="px-3 py-2 text-slate-400 text-xs">{c.source||'—'}</td>
                  <td className="px-3 py-2 font-semibold">{c.lead_count}</td>
                  <td className="px-3 py-2 text-blue-600">{c.stage_new}</td>
                  <td className="px-3 py-2 text-yellow-600">{c.stage_contacted}</td>
                  <td className="px-3 py-2 text-purple-600">{c.stage_proposal}</td>
                  <td className="px-3 py-2 text-green-600 font-semibold">{c.stage_won}</td>
                  <td className="px-3 py-2 font-bold text-green-600">{fmtINR(c.total_sales)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
