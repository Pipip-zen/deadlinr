import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import type { AuthProfile } from '@/lib/store'

async function fetchAndSetProfile(userId: string) {
    const { data } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, class_id, role, streak_count')
        .eq('id', userId)
        .single()

    if (data) {
        const profile: AuthProfile = {
            id: data.id,
            name: data.name,
            avatarUrl: data.avatar_url,
            classId: data.class_id,
            role: data.role,
            streakCount: data.streak_count,
        }
        useAuthStore.getState().setProfile(profile)
    }
}

/**
 * Call once at the app root. Bootstraps auth state from Supabase
 * and keeps it in sync via onAuthStateChange.
 */
export function useAuthSession() {
    const { setSession, setLoading, clearAuth } = useAuthStore()

    useEffect(() => {
        // 1. Hydrate from existing session
        supabase.auth.getSession().then(({ data }) => {
            const session = data.session
            setSession(session)
            if (session?.user) {
                fetchAndSetProfile(session.user.id).finally(() => setLoading(false))
            } else {
                setLoading(false)
            }
        })

        // 2. Subscribe to future changes
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            if (session?.user) {
                fetchAndSetProfile(session.user.id)
            } else {
                clearAuth()
            }
        })

        return () => listener.subscription.unsubscribe()
    }, [setSession, setLoading, clearAuth])
}
