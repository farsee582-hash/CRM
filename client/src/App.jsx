import React from 'react'
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import toast from 'react-hot-toast'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Contacts from './pages/Contacts'
import ContactDetail from './pages/ContactDetail'
import Companies from './pages/Companies'
import Pipeline from './pages/Pipeline'
import Activities from './pages/Activities'
import Sales from './pages/Sales'
import Showrooms from './pages/Showrooms'
import CrmUsers from './pages/CrmUsers'
import Campaigns from './pages/Campaigns'
import WhatsApp from './pages/WhatsApp'
import MetaAds from './pages/MetaAds'
import Admin from './pages/Admin'
import SettingsPage from './pages/Settings'

const ALL_NAV = [
  { to: '/',          label: 'Dashboard',       icon: '🏠', module: 'dashboard', end: true },
  { to: '/contacts',  label: 'Leads & Contacts',icon: '👥', module: 'contacts' },
  { to: '/pipeline',  label: 'Pipeline',         icon: '📊', module: 'pipeline' },
  { to: '/sales',     label: 'Sales',            icon: '💎', module: 'sales' },
  { to: '/activities',label: 'Activities',       icon: '✅', module: 'activities' },
  { to: '/campaigns', label: 'Campaigns',        icon: '📣', module: 'campaigns' },
  { to: '/showrooms', label: 'Showrooms',        icon: '🏪', module: 'showrooms' },
  { to: '/users',     label: 'Users',            icon: '👤', module: 'users' },
  { to: '/whatsapp',  label: 'WhatsApp',         icon: '💬', module: 'whatsapp' },
  { to: '/meta',      label: 'Meta Ads',         icon: '📲', module: 'meta_ads' },
]

function ProtectedLayout() {
  const { currentUser, can, logout } = useAuth()
  const navigate = useNavigate()

  if (!currentUser) return <Navigate to="/login" replace />

  const visibleNav = ALL_NAV.filter(n => can(n.module))

  const handleLogout = () => {
    logout()
    toast.success('Logged out')
    navigate('/login')
  }

  const roleColor = r => ({ super_admin: 'bg-red-500', manager: 'bg-blue-500', sales_rep: 'bg-green-500' }[r] || 'bg-slate-500')

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-56 bg-indigo-950 flex flex-col flex-shrink-0 overflow-y-auto">
        <div className="px-5 py-4 border-b border-indigo-900 sticky top-0 bg-indigo-950 z-10">
          <span className="text-white font-bold text-lg flex items-center gap-2">
            <span className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center text-xs font-bold">💍</span>
            Jewel CRM
          </span>
        </div>

        <nav className="px-3 py-4 space-y-0.5 flex-1">
          {visibleNav.map(({ to, icon, label, end }) => (
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

          {currentUser.role === 'super_admin' && (
            <>
              <div className="border-t border-indigo-900 my-2" />
              <NavLink to="/admin"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-red-600 text-white' : 'text-red-300 hover:bg-indigo-900 hover:text-white'
                  }`
                }
              >
                <span>👑</span>Admin Panel
              </NavLink>
            </>
          )}
        </nav>

        {/* User badge at bottom */}
        <div className="p-3 border-t border-indigo-900">
          <div className="flex items-center gap-2 px-2 py-2">
            <div className={`w-7 h-7 rounded-full ${roleColor(currentUser.role)} flex items-center justify-center text-white text-xs font-bold`}>
              {currentUser.name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{currentUser.name}</p>
              <p className="text-indigo-400 text-xs capitalize">{currentUser.role?.replace('_',' ')}</p>
            </div>
            <button onClick={handleLogout} title="Logout" className="text-indigo-400 hover:text-white text-xs">⏻</button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/contacts/:id" element={<ContactDetail />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/showrooms" element={<Showrooms />} />
          <Route path="/users" element={<CrmUsers />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/whatsapp" element={<WhatsApp />} />
          <Route path="/meta" element={<MetaAds />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginGuard />} />
        <Route path="/*" element={<ProtectedLayout />} />
      </Routes>
    </AuthProvider>
  )
}

function LoginGuard() {
  const { currentUser } = useAuth()
  if (currentUser) return <Navigate to="/" replace />
  return <Login />
}
