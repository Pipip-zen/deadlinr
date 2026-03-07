import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserRole } from '@/types/database'

// ---- Auth / Profile slice ----
interface ProfileState {
    userId: string | null
    name: string | null
    avatarUrl: string | null
    classId: string | null
    role: UserRole | null
    streakCount: number
    totalPoints: number
}

interface ProfileActions {
    setProfile: (profile: Partial<ProfileState>) => void
    clearProfile: () => void
}

// ---- UI slice ----
interface UIState {
    sidebarOpen: boolean
}

interface UIActions {
    toggleSidebar: () => void
    setSidebarOpen: (open: boolean) => void
}

// ---- Combined store ----
type AppStore = ProfileState & ProfileActions & UIState & UIActions

const initialProfile: ProfileState = {
    userId: null,
    name: null,
    avatarUrl: null,
    classId: null,
    role: null,
    streakCount: 0,
    totalPoints: 0,
}

export const useAppStore = create<AppStore>()(
    persist(
        (set) => ({
            // Profile
            ...initialProfile,
            setProfile: (profile) => set((state) => ({ ...state, ...profile })),
            clearProfile: () => set(initialProfile),

            // UI
            sidebarOpen: true,
            toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
            setSidebarOpen: (open) => set({ sidebarOpen: open }),
        }),
        {
            name: 'tasktrack-store',
            // Only persist profile & sidebar preference
            partialize: (state) => ({
                userId: state.userId,
                name: state.name,
                avatarUrl: state.avatarUrl,
                classId: state.classId,
                role: state.role,
                streakCount: state.streakCount,
                totalPoints: state.totalPoints,
                sidebarOpen: state.sidebarOpen,
            }),
        }
    )
)
