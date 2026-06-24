import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'

type AuthState = { user: User | null; ready: boolean; setUser: (user: User | null) => void; setReady: (ready: boolean) => void }
export const useAuthStore = create<AuthState>((set) => ({ user: null, ready: false, setUser: (user) => set({ user }), setReady: (ready) => set({ ready }) }))
