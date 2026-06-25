import React, { useEffect, useState } from 'react'
import api from '../api'

const fmtINR = n => '₹' + Number(n||0).toLocaleString('en-IN', { maximumFractionDigits: 0 })
const fmtNum = n => Number(n||0).toLocaleString()

const PRODUCT_ICON = { gold:'🥇', diamond:'💎', platinum:'⚪', silver:'🥈', advance:'📋', scheme:'🎫' }
const STAGE_COLOR = {
  new:'bg-blue-100 text-blue-700', contacted:'bg-yellow-100 text-yellow-700',
  proposal:'bg-purple-100 text-purple-700', closed_won:'bg-green-100 text-green-700',
  closed_lost:'bg-red-100 text-red-600', new_lead:'bg-slate-100 text-slate-600',
  proposal_shared:'bg-blue-100 text-blue-700', under_review:'bg-yellow-100 text-yellow-700',
}

const ALL_WIDGETS = [
  'total_leads','total_sales','pipeline_value','meta_leads','pending_tasks',
  'overdue_tasks','whatsapp_msgs','closed_won_sales',
  'leads_by_stage','leads_by_source','sales_by_product',
  'showroom_performance','user_performance','campaign_performance',
  'recent_contacts','recent_deals','upcoming_tasks',
]

const WIDGET_LABELS = {
  total_leads: 'Total Leads', total_sales: 'Total Sales (₹)', pipeline_value: 'Pipeline Value',
  meta_leads: 'Meta Leads', pending_tasks: 'Pending Tasks', overdue_tasks: 'Overdue Tasks',
  whatsapp_msgs: 'WhatsApp Messages', closed_won_sales: 'Closed Won Deals',
  leads_by_stage: 'Leads by Stage', leads_by_source: 'Leads by Source',
  sales_by_product: 'Sales by Product', showroom_performance: 'Showroom Performance',
  user_performance: 'User Performance', campaign_performance: 'Campaign Performance',
  recent_contacts: 'Recent Contacts', recent_deals: 'Recent Deals', upcoming_tasks: 'Upcoming Tasks',
}

function KPICard({ label, value, sub, color='indigo', icon }) {
  const colors = { indigo:'text-indigo-600 bg-indigo-50', green:'text-green-600 bg-green-50', orange:'text-orange-500 bg-orange-50', blue:'text-blue-600 bg-blue-50', purple:'text-purple-600 bg-purple-50', red:'text-red-500 bg-red-50' }
  const [txt, bg] = (colors[color]||colors.indigo).split(' ')
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-start gap-4">
      {icon && <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center text-xl`}>{icon}</div>}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{label}</p>
        <p className={`text-2xl font-bold ${txt}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

const DEFAULT_VISIBLE = ['total_leads','total_sales','pipeline_value','meta_leads','pending_tasks','overdue_tasks','leads_by_stage','leads_by_source','sales_by_product','showroom_performance','user_performance','campaign_performance']

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [showrooms, setShowrooms] = useState([])
  const [filterShowroom, setFilterShowroom] = useState('')
  const [campaignStats, setCampaignStats] = useState([])
  const [showroomStats, setShowroomStats] = useState([])
  const [customize, setCustomize] = useState(false)
  const [visible, setVisible] = useState(() => {
    const saved = localStorage.getItem('crm_dashboard_widgets')
    return saved ? JSON.parse(saved) : DEFAULT_VISIBLE
  })

  const toggleWidget = (w) => {
    setVisible(v => {
      const next = v.includes(w) ? v.filter(x => x !== w) : [...v, w]
      localStorage.setItem('crm_dashboard_widgets', JSON.stringify(next))
      return next
    })
  }

  const show = (w) => visible.includes(w)

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-3">
          <select value={filterShowroom} onChange={e => setFilterShowroom(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none bg-white">
            <option value="">All Showrooms</option>
            {showrooms.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button onClick={() => setCustomize(c => !c)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${customize ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'}`}>
            ⚙️ Customize
          </button>
        </div>
      </div>

      {/* Customize panel */}
      {customize && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-indigo-800 mb-3">Toggle Dashboard Widgets</p>
          <div className="flex flex-wrap gap-2">
            {ALL_WIDGETS.map(w => (
              <button key={w} onClick={() => toggleWidget(w)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${visible.includes(w) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'}`}>
                {visible.includes(w) ? '✓ ' : '+ '}{WIDGET_LABELS[w]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {show('total_leads') && <KPICard label="Total Leads" value={fmtNum(data.contacts.total)} sub={`+${data.contacts.new_30d} this month`} icon="👥" />}
        {show('total_sales') && <KPICard label="Total Sales" value={fmtINR(data.sales.total)} sub={`${data.sales.count} transactions`} color="green" icon="💰" />}
        {show('pipeline_value') && <KPICard label="Pipeline Value" value={fmtINR(data.deals.pipeline_value)} sub={`${data.deals.open} open deals`} color="purple" icon="📊" />}
        {show('meta_leads') && <KPICard label="Meta Leads" value={fmtNum(data.contacts.from_meta)} sub="from ads" color="blue" icon="📲" />}
        {show('pending_tasks') && <KPICard label="Pending Tasks" value={fmtNum(data.tasks.pending)} sub={`${data.tasks.overdue} overdue`} color="orange" icon="✅" />}
        {show('overdue_tasks') && <KPICard label="Overdue Tasks" value={fmtNum(data.tasks.overdue)} sub="need attention" color="red" icon="⚠️" />}
        {show('whatsapp_msgs') && <KPICard label="WhatsApp Messages" value={fmtNum(data.whatsapp.total_messages)} sub="total messages" color="green" icon="💬" />}
        {show('closed_won_sales') && <KPICard label="Closed Won" value={fmtNum(data.contacts.from_meta)} sub="from pipeline" color="indigo" icon="🏆" />}
      </div>

      {/* Lead Stage + Source */}
      {(show('leads_by_stage') || show('leads_by_source')) && (
        <div className="grid grid-cols-2 gap-4">
          {show('leads_by_stage') && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Leads by Stage</h2>
              <div className="space-y-3">
                {data.leads_by_stage.length === 0 && <p className="text-slate-400 text-sm">No data</p>}
                {data.leads_by_stage.map(row => (
                  <div key={row.lead_stage} className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-32 text-center ${STAGE_COLOR[row.lead_stage]||'bg-slate-100 text-slate-500'}`}>
                      {row.lead_stage?.replace(/_/g,' ')}
                    </span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2">
                      <div className="bg-indigo-500 h-2 rounded-full" style={{width:`${Math.min(100,(row.count/(data.contacts.total||1))*100)}%`}} />
                    </div>
                    <span className="text-sm font-bold text-slate-700 w-8 text-right">{row.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {show('leads_by_source') && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Leads by Source</h2>
              <div className="space-y-3">
                {data.leads_by_source.length === 0 && <p className="text-slate-400 text-sm">No data</p>}
                {data.leads_by_source.map(row => (
                  <div key={row.source} className="flex items-center gap-3">
                    <span className="text-xs text-slate-600 w-32 capitalize">{row.source?.replace(/_/g,' ')}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{width:`${Math.min(100,(row.count/(data.contacts.total||1))*100)}%`}} />
                    </div>
                    <span className="text-sm font-bold text-slate-700 w-8 text-right">{row.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sales by Product */}
      {show('sales_by_product') && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Sales by Product Category</h2>
          {data.sales_by_product.length === 0
            ? <p className="text-slate-400 text-sm">No sales recorded yet</p>
            : <div className="grid grid-cols-3 gap-4">
                {data.sales_by_product.map(p => (
                  <div key={p.product_category} className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-3xl">{PRODUCT_ICON[p.product_category]||'🔷'}</span>
                    <div>
                      <p className="font-semibold capitalize text-slate-700">{p.product_category}</p>
                      <p className="text-lg font-bold text-indigo-600">{fmtINR(p.total)}</p>
                      <p className="text-xs text-slate-400">{p.count} bills · {Number(p.weight||0).toFixed(2)}g</p>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      {/* Showroom + User Performance */}
      {(show('showroom_performance') || show('user_performance')) && (
        <div className="grid grid-cols-2 gap-4">
          {show('showroom_performance') && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Showroom Performance</h2>
              <div className="space-y-3">
                {showroomStats.length === 0 && <p className="text-slate-400 text-sm">No showrooms yet</p>}
                {showroomStats.map(s => (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div>
                      <p className="font-semibold text-sm">{s.name}</p>
                      <p className="text-xs text-slate-400">{s.city} · {s.lead_count} leads · {s.sale_count} sales</p>
                    </div>
                    <p className="font-bold text-green-600">{fmtINR(s.total_sales)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {show('user_performance') && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">User Performance</h2>
              <div className="space-y-3">
                {data.user_performance.length === 0 && <p className="text-slate-400 text-sm">No users yet</p>}
                {data.user_performance.map((u,i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                        {i+1}
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
          )}
        </div>
      )}

      {/* Campaign Performance */}
      {show('campaign_performance') && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm overflow-hidden">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Campaign Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100">
                {['Campaign','Showroom','Source','Total Leads','New','Contacted','Proposal','Won','Revenue'].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {campaignStats.length === 0 && <tr><td colSpan={9} className="text-center py-8 text-slate-400">No campaigns yet</td></tr>}
                {campaignStats.map(c => (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium">{c.name}</td>
                    <td className="px-3 py-2 text-slate-400 text-xs">{c.showroom_name||'—'}</td>
                    <td className="px-3 py-2 text-slate-400 text-xs capitalize">{c.source||'—'}</td>
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
      )}

      {/* Recent Contacts */}
      {show('recent_contacts') && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Recent Contacts</h2>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100">
              {['Name','Phone','Stage','Source','Showroom'].map(h => (
                <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {(data.recent_contacts||[]).map(c => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium">{c.first_name} {c.last_name||''}</td>
                  <td className="px-3 py-2 text-slate-500">{c.phone||'—'}</td>
                  <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STAGE_COLOR[c.lead_stage]||'bg-slate-100 text-slate-500'}`}>{c.lead_stage?.replace(/_/g,' ')}</span></td>
                  <td className="px-3 py-2 text-slate-400 capitalize text-xs">{c.source?.replace(/_/g,' ')}</td>
                  <td className="px-3 py-2 text-slate-400 text-xs">{c.showroom_name||'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upcoming Tasks */}
      {show('upcoming_tasks') && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Upcoming Tasks</h2>
          <div className="space-y-2">
            {(data.upcoming_tasks||[]).length === 0 && <p className="text-slate-400 text-sm">No pending tasks</p>}
            {(data.upcoming_tasks||[]).map(t => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="font-medium text-sm">{t.title}</p>
                  <p className="text-xs text-slate-400">{t.contact_name?.trim()||'No contact'}</p>
                </div>
                <p className="text-xs text-slate-400">{t.due_date ? new Date(t.due_date).toLocaleDateString('en-IN') : '—'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
