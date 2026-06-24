import React from 'react'
import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Contacts from './pages/Contacts'
import ContactDetail from './pages/ContactDetail'
import Companies from './pages/Companies'
import Pipeline from './pages/Pipeline'
import Activities from './pages/Activities'
import WhatsApp from './pages/WhatsApp'
import MetaAds from './pages/MetaAds'
import SettingsPage from './pages/Settings'

const NAV = [
  { to: '/', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/contacts', label: 'Contacts', icon: '👥' },
  { to: '/companies', label: 'Companies', icon: '🏢' },
  { to: '/pipeline', label: 'Pipeline', icon: '📊' },
  { to: '/activities', label: 'Activities', icon: '✅' },
  { to: '/whatsapp', label: 'WhatsApp', icon: '💬' },
  { to: '/meta', label: 'Meta Ads', icon: '📣' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]

export default function App() {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-56 bg-indigo-950 flex flex-col flex-shrink-0">
        <div className="px-5 py-5 border-b border-indigo-900">
          <span className="text-white font-bold text-lg flex items-center gap-2">
            <span className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center text-xs font-bold">C</span>
            CRM
          </span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ to, icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-indigo-300 hover:bg-indigo-900 hover:text-white'
                }`
              }
            >
              <span>{icon}</span>{label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/contacts/:id" element={<ContactDetail />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/whatsapp" element={<WhatsApp />} />
          <Route path="/meta" element={<MetaAds />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  )
}
