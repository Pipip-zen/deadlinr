import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import type { TaskRow, TaskCompletionRow } from '@/types/database'

export type TaskStatus = 'pending' | 'completed' | 'overdue'

export interface TaskWithStatus extends TaskRow {
    status: TaskStatus
    completedAt: string | null
    pointsEarned: number | null
}

function deriveStatus(task: TaskRow, completionMap: Map<string, TaskCompletionRow>): TaskStatus {
    if (completionMap.has(task.id)) return 'completed'
    if (new Date(task.deadline) < new Date()) return 'overdue'
    return 'pending'
}

export function useTasks() {
    const profile = useAuthStore((s) => s.profile)
    const classId = profile?.classId ?? null
    const userId = profile?.id ?? null

    // Tasks for this class
    const tasksQuery = useQuery({
        queryKey: ['tasks', classId],
        queryFn: async (): Promise<TaskRow[]> => {
            if (!classId) return []
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('class_id', classId)
                .order('deadline', { ascending: true })
            if (error) throw error
            return data ?? []
        },
        enabled: !!classId,
        staleTime: 1000 * 30,
    })

    // Completions for this user
    const completionsQuery = useQuery({
        queryKey: ['task-completions', userId],
        queryFn: async (): Promise<TaskCompletionRow[]> => {
            if (!userId) return []
            const { data, error } = await supabase
                .from('task_completions')
                .select('*')
                .eq('user_id', userId)
            if (error) throw error
            return data ?? []
        },
        enabled: !!userId,
        staleTime: 1000 * 30,
    })

    const tasks = tasksQuery.data ?? []
    const completions = completionsQuery.data ?? []

    const completionMap = new Map(completions.map((c) => [c.task_id, c]))

    const enriched: TaskWithStatus[] = tasks.map((t) => {
        const comp = completionMap.get(t.id) ?? null
        return {
            ...t,
            status: deriveStatus(t, completionMap),
            completedAt: comp?.completed_at ?? null,
            pointsEarned: comp?.points_earned ?? null,
        }
    })

    return {
        tasks: enriched,
        isLoading: tasksQuery.isLoading || completionsQuery.isLoading,
        error: tasksQuery.error ?? completionsQuery.error,
    }
}
