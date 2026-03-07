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
 * On success: shows a Sonner toast and invalidates relevant query caches.
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

            if (error) throw new Error(error.message)
            if (!data) throw new Error('Empty response from edge function')
            return data
        },

        onSuccess: (result) => {
            const { pointsEarned, streakCount, streakBonus } = result

            // Optimistically update streak in auth store so the UI reflects it immediately
            if (profile) {
                setProfile({ ...profile, streakCount })
            }

            // Show toast
            const bonusText = streakBonus > 0 ? ` (+${streakBonus} streak bonus)` : ''
            toast.success(
                `✅ +${pointsEarned} pts${bonusText}! 🔥 ${streakCount}-day streak`,
                { duration: 4000 }
            )

            // Invalidate caches
            const classId = profile?.classId
            const userId = profile?.id
            qc.invalidateQueries({ queryKey: ['dashboard-tasks', classId] })
            qc.invalidateQueries({ queryKey: ['dashboard-completions', userId] })
            qc.invalidateQueries({ queryKey: ['tasks', classId] })
            qc.invalidateQueries({ queryKey: ['leaderboard', classId] })
            qc.invalidateQueries({ queryKey: ['student_points'] })
        },

        onError: (error: Error) => {
            toast.error(`Failed to complete task: ${error.message}`)
        },
    })
}
