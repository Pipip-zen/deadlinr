import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'

/**
 * Subscribes to Supabase Realtime for the `tasks` table filtered by class_id.
 * On any INSERT / UPDATE / DELETE → invalidates dashboard query cache → auto re-render.
 */
export function useRealtimeTasks() {
    const qc = useQueryClient()
    const profile = useAuthStore((s) => s.profile)
    const classId = profile?.classId ?? null

    useEffect(() => {
        if (!classId) return

        const channel = supabase
            .channel(`tasks:class:${classId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tasks',
                    filter: `class_id=eq.${classId}`,
                },
                () => {
                    qc.invalidateQueries({ queryKey: ['dashboard-tasks', classId] })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [classId, qc])
}
