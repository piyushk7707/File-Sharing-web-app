import React, { createContext, useContext, useState, useEffect } from 'react'
import { User } from 'firebase/auth'
import { authService } from '../utils/authService'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<any>
  register: (email: string, password: string, displayName: string) => Promise<any>
  signInWithGoogle: () => Promise<any>
  logout: () => Promise<any>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check if user is already logged in on mount
  useEffect(() => {
    console.log('[AuthContext] Initializing auth state listener...')
    const unsubscribe = authService.onAuthStateChange((currentUser) => {
      console.log('[AuthContext] Auth state changed:', {
        isUser: currentUser !== null,
        email: currentUser?.email,
        displayName: currentUser?.displayName,
      })
      setUser(currentUser)
      setIsLoading(false)
    })

    return () => {
      console.log('[AuthContext] Cleaning up auth state listener')
      unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string) => {
    return await authService.login(email, password)
  }

  const register = async (email: string, password: string, displayName: string) => {
    return await authService.register(email, password, displayName)
  }

  const signInWithGoogle = async () => {
    return await authService.signInWithGoogle()
  }

  const logout = async () => {
    return await authService.logout()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        login,
        register,
        signInWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
