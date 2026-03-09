import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import type { TaskWithStatus } from '@/hooks/useTasks'
import type { TaskStatus } from '@/types/database'

export function useDashboard() {
    const profile = useAuthStore((s) => s.profile)
    const userId = profile?.id ?? null

    // Personal tasks for this user
    const tasksQuery = useQuery({
        queryKey: ['tasks', userId],
        queryFn: async () => {
            if (!userId) return []
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('user_id', userId)
                .order('deadline', { ascending: true })
            if (error) throw error

            return (data ?? []).map(t => ({
                ...t,
                status: t.status as TaskStatus
            })) as TaskWithStatus[]
        },
        enabled: !!userId,
        staleTime: 1000 * 60 * 2, // 2 min
    })

    const tasks = tasksQuery.data ?? []

    const summary = {
        total: tasks.length,
        completed: tasks.filter((t) => t.status === 'done').length,
        inProgress: tasks.filter((t) => t.status === 'pending').length,
        overdue: tasks.filter((t) => t.status === 'overdue').length,
    }

    return {
        tasks,
        summary,
        isLoading: tasksQuery.isLoading,
        error: tasksQuery.error,
    }
}

export function useCompleteTask() {
    const qc = useQueryClient()
    const profile = useAuthStore((s) => s.profile)
    const userId = profile?.id ?? null

    return useMutation({
        mutationFn: async (taskId: string) => {
            if (!userId) throw new Error('Not authenticated')
            const { error } = await supabase
                .from('tasks')
                .update({ status: 'done' })
                .eq('id', taskId)
                .eq('user_id', userId)

            if (error) throw error
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['tasks', userId] })
        },
    })
}
