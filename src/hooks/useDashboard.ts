import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import type { TaskRow, TaskCompletionRow } from '@/types/database'

export interface TaskWithStatus extends TaskRow {
    status: 'completed' | 'overdue' | 'due-soon' | 'upcoming'
    completedAt: string | null
}

function getStatus(task: TaskRow, completions: TaskCompletionRow[]): TaskWithStatus['status'] {
    const done = completions.some((c) => c.task_id === task.id)
    if (done) return 'completed'
    const diff = (new Date(task.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    if (diff < 0) return 'overdue'
    if (diff <= 3) return 'due-soon'
    return 'upcoming'
}

export function useDashboard() {
    const profile = useAuthStore((s) => s.profile)
    const classId = profile?.classId ?? null
    const userId = profile?.id ?? null

    // All tasks for this class
    const tasksQuery = useQuery({
        queryKey: ['dashboard-tasks', classId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('class_id', classId!)
                .order('deadline', { ascending: true })
            if (error) throw error
            return data as TaskRow[]
        },
        enabled: !!classId,
        staleTime: 1000 * 60 * 2, // 2 min
    })

    // Completions for this user
    const completionsQuery = useQuery({
        queryKey: ['dashboard-completions', userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('task_completions')
                .select('*')
                .eq('user_id', userId!)
            if (error) throw error
            return data as TaskCompletionRow[]
        },
        enabled: !!userId,
        staleTime: 1000 * 60 * 2,
    })

    const tasks = tasksQuery.data ?? []
    const completions = completionsQuery.data ?? []

    const enriched: TaskWithStatus[] = tasks.map((t) => ({
        ...t,
        status: getStatus(t, completions),
        completedAt: completions.find((c) => c.task_id === t.id)?.completed_at ?? null,
    }))

    const summary = {
        total: enriched.length,
        completed: enriched.filter((t) => t.status === 'completed').length,
        inProgress: enriched.filter((t) => t.status === 'due-soon' || t.status === 'upcoming').length,
        overdue: enriched.filter((t) => t.status === 'overdue').length,
    }

    return {
        tasks: enriched,
        summary,
        isLoading: tasksQuery.isLoading || completionsQuery.isLoading,
        error: tasksQuery.error ?? completionsQuery.error,
    }
}

// ---- Complete a task mutation ----
export function useCompleteTask() {
    const qc = useQueryClient()
    const profile = useAuthStore((s) => s.profile)
    const userId = profile?.id ?? null
    const classId = profile?.classId ?? null

    return useMutation({
        mutationFn: async ({ taskId, deadline }: { taskId: string; deadline: string }) => {
            // Calculate points based on time until deadline
            const daysLeft = (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            let pts = 10
            if (daysLeft >= 2) pts += 5       // early bird
            else if (daysLeft <= 0) pts -= 2  // late
            pts = Math.max(0, pts)

            const { error } = await supabase.from('task_completions').insert({
                task_id: taskId,
                user_id: userId!,
                points_earned: pts,
            })
            if (error) throw error
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['dashboard-tasks', classId] })
            qc.invalidateQueries({ queryKey: ['dashboard-completions', userId] })
        },
    })
}
