import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'
import type { Session } from '@supabase/supabase-js'

/**
 * Subscribes to Supabase auth state changes and syncs the user
 * profile into Zustand store on login/logout.
 */
export function useAuthSession() {
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)
    const { setProfile, clearProfile } = useAppStore()

    useEffect(() => {
        // Initial session
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session)
            setLoading(false)
        })

        // Listen for changes
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            if (!session) clearProfile()
        })

        return () => listener.subscription.unsubscribe()
    }, [clearProfile])

    useEffect(() => {
        if (!session?.user) return

        supabase
            .from('profiles')
            .select('id, name, avatar_url, class_id, role, streak_count')
            .eq('id', session.user.id)
            .single()
            .then(({ data }) => {
                if (data) {
                    setProfile({
                        userId: data.id,
                        name: data.name,
                        avatarUrl: data.avatar_url,
                        classId: data.class_id,
                        role: data.role,
                        streakCount: data.streak_count,
                    })
                }
            })
    }, [session, setProfile])

    return { session, loading }
}
