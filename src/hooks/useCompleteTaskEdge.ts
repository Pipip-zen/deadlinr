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
 * Uses supabase.functions.invoke (auto-attaches session token),
 * and parses the real error body from FunctionsHttpError context.
 */
export function useCompleteTaskEdge() {
    const qc = useQueryClient()
    const profile = useAuthStore((s) => s.profile)
    const setProfile = useAuthStore((s) => s.setProfile)

    return useMutation({
        mutationFn: async (taskId: string): Promise<CompleteTaskResult> => {
            const userId = profile?.id
            if (!userId) throw new Error('Not authenticated')

            const { data, error } = await supabase.functions.invoke<CompleteTaskResult>(
                'complete-task',
                { body: { taskId, userId } }
            )

            if (error) {
                // Parse real error message from function response body
                let message = error.message
                try {
                    // FunctionsHttpError has a .context Response object
                    const ctx = (error as unknown as { context?: Response }).context
                    if (ctx instanceof Response) {
                        const body = await ctx.json()
                        message = body.error ?? body.message ?? message
                    }
                } catch { /* keep original message */ }
                throw new Error(message)
            }

            if (!data) throw new Error('Empty response from edge function')
            return data

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
            // Invalidate all relevant caches so both dashboard and tasks page update immediately
            qc.invalidateQueries({ queryKey: ['dashboard-tasks', classId] })
            qc.invalidateQueries({ queryKey: ['dashboard-completions', userId] })
            qc.invalidateQueries({ queryKey: ['tasks', classId] })
            qc.invalidateQueries({ queryKey: ['task-completions', userId] })
            qc.invalidateQueries({ queryKey: ['leaderboard', classId] })
            qc.invalidateQueries({ queryKey: ['student_points'] })
        },

        onError: (error: Error) => {
            const msg = error.message.includes('duplicate') || error.message.includes('unique')
                ? 'Tugas ini sudah kamu kerjakan sebelumnya!'
                : `Gagal mengerjakan tugas: ${error.message}`
            toast.error(msg)
        },
    })
}
