import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'

export function useMarkTaskDone() {
    const qc = useQueryClient()
    const profile = useAuthStore((s) => s.profile)
    const userId = profile?.id ?? null

    return useMutation({
        mutationFn: async (taskId: string) => {
            if (!userId) throw new Error('Not authenticated')
            const { error } = await supabase
                .from('tasks')
                .update({
                    status: 'done',
                    completed_at: new Date().toISOString()
                })
                .eq('id', taskId)
                .eq('user_id', userId)

            if (error) throw error
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['tasks'] })
            toast.success('Task marked as done!')
        },
        onError: () => {
            toast.error('Failed to update task')
        }
    })
}
