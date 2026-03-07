import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'

export interface LeaderboardEntry {
    user_id: string
    total_points: number
    name: string | null
    avatar_url: string | null
    streak_count: number
    rank: number
}

export function useLeaderboard() {
    const profile = useAuthStore((s) => s.profile)
    const classId = profile?.classId ?? null

    return useQuery({
        queryKey: ['leaderboard', classId],
        queryFn: async (): Promise<LeaderboardEntry[]> => {
            // Join student_points → profiles scoped to current class, top 50
            const { data, error } = await supabase
                .from('student_points')
                .select(`
          user_id,
          total_points,
          profiles!inner (
            name,
            avatar_url,
            class_id,
            streak_count
          )
        `)
                .eq('profiles.class_id', classId!)
                .order('total_points', { ascending: false })
                .limit(50)

            if (error) throw error

            return (data ?? []).map((row: any, idx) => ({
                user_id: row.user_id,
                total_points: row.total_points,
                name: row.profiles?.name ?? null,
                avatar_url: row.profiles?.avatar_url ?? null,
                streak_count: row.profiles?.streak_count ?? 0,
                rank: idx + 1,
            }))
        },
        enabled: !!classId,
        staleTime: 1000 * 60,
    })
}

/** Realtime subscription: student_points changes → invalidate leaderboard query */
export function useRealtimeLeaderboard() {
    const qc = useQueryClient()
    const profile = useAuthStore((s) => s.profile)
    const classId = profile?.classId ?? null

    useEffect(() => {
        if (!classId) return

        const channel = supabase
            .channel(`student_points:class:${classId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'student_points' },
                () => {
                    qc.invalidateQueries({ queryKey: ['leaderboard', classId] })
                }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [classId, qc])
}
