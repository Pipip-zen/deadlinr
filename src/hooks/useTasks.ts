import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import type { TaskRow } from '@/types/database'

export type TaskStatus = 'pending' | 'done' | 'overdue'

export interface TaskWithStatus extends Omit<TaskRow, 'status'> {
    status: TaskStatus
}

export function useTasks() {
    const profile = useAuthStore((s) => s.profile)
    const userId = profile?.id ?? null

    // Personal tasks for this user
    const tasksQuery = useQuery({
        queryKey: ['tasks', userId],
        queryFn: async (): Promise<TaskWithStatus[]> => {
            if (!userId) return []
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('user_id', userId)
                .order('deadline', { ascending: true })
            if (error) throw error

            // Enforce type alignment with TypeScript status ENUM since supabase returns string
            return (data ?? []).map(t => ({
                ...t,
                status: t.status as TaskStatus
            }))
        },
        enabled: !!userId,
        staleTime: 1000 * 30,
    })

    const tasks = tasksQuery.data ?? []

    return {
        tasks,
        isLoading: tasksQuery.isLoading,
        error: tasksQuery.error,
    }
}
