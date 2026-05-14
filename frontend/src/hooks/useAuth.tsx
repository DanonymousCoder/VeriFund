/**
 * Auth context and hook for managing authentication state.
 * Provides a clean API for components to read/write auth data.
 */

import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { AuthSession } from '../types/storage'
import { storageService } from '../services/storage'

interface AuthContextType {
  session: AuthSession | null
  isLoading: boolean
  login: (session: AuthSession) => Promise<void>
  logout: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadSession = async () => {
      try {
        const savedSession = await storageService.auth.getSession()
        setSession(savedSession)
      } finally {
        setIsLoading(false)
      }
    }
    loadSession()
  }, [])

  const login = async (newSession: AuthSession) => {
    await storageService.auth.setSession(newSession)
    setSession(newSession)
  }

  const logout = async () => {
    await storageService.auth.setSession(null)
    await storageService.member.setProfile(null)
    await storageService.dashboard.setData(null)
    setSession(null)
  }

  const value: AuthContextType = {
    session,
    isLoading,
    login,
    logout,
    isAuthenticated: session !== null,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
