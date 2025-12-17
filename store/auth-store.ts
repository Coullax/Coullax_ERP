import { create } from 'zustand'
import { User } from '@supabase/supabase-js'

type UserRole = 'employee' | 'supervisor' | 'admin' | 'super_admin'

interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url?: string
  phone?: string
}

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  isAdmin: () => boolean
  isSuperAdmin: () => boolean
  hasRole: (role: UserRole) => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  isAdmin: () => {
    const { profile } = get()
    return profile?.role === 'admin' || profile?.role === 'super_admin'
  },
  isSuperAdmin: () => {
    const { profile } = get()
    return profile?.role === 'super_admin'
  },
  hasRole: (role) => {
    const { profile } = get()
    if (role === 'super_admin') return profile?.role === 'super_admin'
    if (role === 'admin') return profile?.role === 'admin' || profile?.role === 'super_admin'
    return profile?.role === role
  },
}))
