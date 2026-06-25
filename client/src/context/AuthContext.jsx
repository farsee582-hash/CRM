import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

const MODULES = ['dashboard','contacts','pipeline','sales','activities','campaigns','showrooms','users','reports','whatsapp','meta_ads']

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [permissions, setPermissions] = useState({})

  useEffect(() => {
    const saved = localStorage.getItem('crm_user')
    const savedPerms = localStorage.getItem('crm_permissions')
    if (saved) { setCurrentUser(JSON.parse(saved)); setPermissions(JSON.parse(savedPerms || '{}')) }
  }, [])

  const login = (user, perms) => {
    setCurrentUser(user); setPermissions(perms)
    localStorage.setItem('crm_user', JSON.stringify(user))
    localStorage.setItem('crm_permissions', JSON.stringify(perms))
  }

  const logout = () => {
    setCurrentUser(null); setPermissions({})
    localStorage.removeItem('crm_user'); localStorage.removeItem('crm_permissions')
  }

  const can = (module, action = 'view') => {
    if (!currentUser) return false
    if (currentUser.role === 'super_admin') return true
    return permissions[module]?.[action] === true
  }

  return (
    <AuthContext.Provider value={{ currentUser, permissions, login, logout, can, MODULES }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
