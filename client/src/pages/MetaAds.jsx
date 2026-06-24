import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../api'

const fmt = n => `$${Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`
const fmtDate = d => d ? new Date(d).toLocaleDateString() : '—'

export default function MetaAds() {
  const [ads, setAds] = useState([])
  const [leads, setLeads] = useState([])
  const [summary, setSummary] = useState({})
  const [syncing, setSyncing] = useState(false)
  const [tab, setTab] = useState('ads')

  const load = () => {
    api.get('/meta/ads').then(r => { setAds(r.ads||[]); setSummary(r.summary||{}) })
    api.get('/meta/leads').then(setLeads)
  }
  useEffect(() => { load() }, [])

  const syncAds = async () => {
    setSyncing(true)
    try { const r = await api.post('/meta/sync-ads', { date_preset: 'last_30d' }); toast.success(`Synced ${r.synced} ads`); load() }
    catch (e) { toast.error('Sync failed — check META_ACCESS_TOKEN in .env') }
    setSyncing(false)
  }

  const syncForms = async () => {
    try {
      const forms = await api.get('/meta/forms')
      if (!forms.length) return toast.error('No lead forms found')
      const id = prompt(`Lead form IDs:\n${forms.map(f=>`${f.id}: ${f.name} (${f.leads_count} leads)`).join('\n')}\n\nEnter form ID to import:`)
      if (!id) return
      const r = await api.post('/meta/sync-leads', { form_id: id.trim() })
      toast.success(`Imported ${r.imported} leads`); load()
    } catch (e) { toast.error('Could not fetch forms — check META_AD_ACCOUNT_ID') }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Meta Ads & Leads</h1>
        <div className="flex gap-2">
          <button onClick={syncForms} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50">Sync Lead Forms</button>
          <button onClick={syncAds} disabled={syncing} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {syncing ? 'Syncing…' : '↻ Sync Ads'}
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          ['Total Spend', fmt(summary.total_spend)],
          ['Impressions', Number(summary.total_impressions||0).toLocaleString()],
          ['Clicks', Number(summary.total_clicks||0).toLocaleString()],
          ['Leads', Number(summary.total_leads||leads.length).toLocaleString()],
        ].map(([l,v]) => (
          <div key={l} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm text-center">
            <p className="text-2xl font-bold text-indigo-600">{v}</p>
            <p className="text-xs text-slate-400 mt-1">{l}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {[['ads','Ad Performance'],['leads','Leads']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab===k?'bg-white shadow-sm text-indigo-600':'text-slate-500 hover:text-slate-700'}`}>{l}</button>
        ))}
      </div>

      {tab === 'ads' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Ad Name','Campaign','Spend','Impressions','Clicks','CTR','CPL'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ads.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-slate-400">No ads synced. Click "Sync Ads" to import from your Meta account.</td></tr>}
              {ads.map(a => (
                <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{a.ad_name||'—'}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{a.campaign_name||'—'}</td>
                  <td className="px-4 py-3 font-semibold text-indigo-600">{fmt(a.spend)}</td>
                  <td className="px-4 py-3 text-slate-500">{Number(a.impressions||0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-500">{Number(a.clicks||0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-500">{Number(a.ctr||0).toFixed(2)}%</td>
                  <td className="px-4 py-3 text-slate-500">{a.cost_per_lead ? fmt(a.cost_per_lead) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'leads' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Name','Email','Phone','Campaign','Form','Date'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-slate-400">No leads yet. Set up the Meta webhook or use "Sync Lead Forms".</td></tr>}
              {leads.map(l => (
                <tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{l.first_name||'—'} {l.last_name||''}</td>
                  <td className="px-4 py-3 text-slate-500">{l.email||'—'}</td>
                  <td className="px-4 py-3 text-slate-500">{l.phone||'—'}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{l.campaign_name||'—'}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{l.form_name||l.form_id||'—'}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{fmtDate(l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
