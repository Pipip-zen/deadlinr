import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'

export function useMarkTaskDone() {
    const qc = useQueryClient()
    const profile = useAuthStore((s) => s.profile)
    const userId = profile?.id ?? null

    return useMutation({
        mutationFn: async (taskId: string | string[]) => {
            if (!userId) throw new Error('Not authenticated')
            const ids = Array.isArray(taskId) ? taskId : [taskId]

            const { error } = await supabase
                .from('tasks')
                .update({
                    status: 'done',
                    completed_at: new Date().toISOString()
                })
                .in('id', ids)
                .eq('user_id', userId)

            if (error) throw error
            return ids.length
        },
        onSuccess: (count) => {
            qc.invalidateQueries({ queryKey: ['tasks'] })
            toast.success(count > 1 ? `${count} tasks marked as done!` : 'Task marked as done!')
        },
        onError: () => {
            toast.error('Failed to update task')
        }
    })
}
