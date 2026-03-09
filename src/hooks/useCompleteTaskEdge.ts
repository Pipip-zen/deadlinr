import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'

interface CompleteTaskResult {
    pointsEarned: number
    streakBonus: number
    newTotal: number
    streakCount: number
}

/**
 * Calls the `complete-task` Supabase Edge Function.
 * Uses native fetch over supabase.functions.invoke so real error messages
 * from the function body are surfaced instead of generic "non-2xx" errors.
 */
export function useCompleteTaskEdge() {
    const qc = useQueryClient()
    const profile = useAuthStore((s) => s.profile)
    const setProfile = useAuthStore((s) => s.setProfile)

    return useMutation({
        mutationFn: async (taskId: string): Promise<CompleteTaskResult> => {
            const userId = profile?.id
            if (!userId) throw new Error('Not authenticated')

            // Get auth token
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error('No active session')

            const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/complete-task`
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                },
                body: JSON.stringify({ taskId, userId }),
            })

            const text = await res.text()
            let data: CompleteTaskResult & { error?: string }
            try {
                data = JSON.parse(text)
            } catch {
                throw new Error(`Edge function error: ${text}`)
            }

            if (!res.ok) {
                throw new Error(data.error ?? `HTTP ${res.status}`)
            }

            return data as CompleteTaskResult
        },

        onSuccess: (result) => {
            const { pointsEarned, streakCount, streakBonus } = result

            if (profile) {
                setProfile({ ...profile, streakCount })
            }

            const bonusText = streakBonus > 0 ? ` (+${streakBonus} streak bonus)` : ''
            toast.success(
                `✅ +${pointsEarned} pts${bonusText}! 🔥 ${streakCount}-day streak`,
                { duration: 4000 }
            )

            const classId = profile?.classId
            const userId = profile?.id
            qc.invalidateQueries({ queryKey: ['dashboard-tasks', classId] })
            qc.invalidateQueries({ queryKey: ['dashboard-completions', userId] })
            qc.invalidateQueries({ queryKey: ['tasks', classId] })
            qc.invalidateQueries({ queryKey: ['leaderboard', classId] })
            qc.invalidateQueries({ queryKey: ['student_points'] })
        },

        onError: (error: Error) => {
            toast.error(`Gagal mengerjakan tugas: ${error.message}`)
        },
    })
}
