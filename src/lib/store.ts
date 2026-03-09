import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Session } from '@supabase/supabase-js'

// ---- Auth store (session + profile + loading, NOT persisted) ----

export interface AuthProfile {
    id: string
    name: string | null
    avatarUrl: string | null
    classId: string | null
}

interface AuthState {
    session: Session | null
    profile: AuthProfile | null
    loading: boolean
}

interface AuthActions {
    setSession: (session: Session | null) => void
    setProfile: (profile: AuthProfile | null) => void
    setLoading: (loading: boolean) => void
    clearAuth: () => void
}

export const useAuthStore = create<AuthState & AuthActions>()((set) => ({
    session: null,
    profile: null,
    loading: true,
    setSession: (session) => set({ session }),
    setProfile: (profile) => set({ profile }),
    setLoading: (loading) => set({ loading }),
    clearAuth: () => set({ session: null, profile: null, loading: false }),
}))

// ---- App store (UI cache, persisted) ----

interface UIState {
    sidebarOpen: boolean
}

interface UIActions {
    toggleSidebar: () => void
    setSidebarOpen: (open: boolean) => void
}

export const useAppStore = create<UIState & UIActions>()(
    persist(
        (set) => ({
            sidebarOpen: true,
            toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
            setSidebarOpen: (open) => set({ sidebarOpen: open }),
        }),
        { name: 'tasktrack-ui' }
    )
)
