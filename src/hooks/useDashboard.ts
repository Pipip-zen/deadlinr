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
                // sort by created_at to show newest tasks, or sort by deadline? 
                // the user requested "latest 5 tasks", typically meaning created_at desc, but deadline asc is better for a dashboard. Let's get all and sort in memory or keep deadline asc.
                .order('deadline', { ascending: true })
            if (error) throw error

            return (data ?? []).map(t => {
                const isPending = t.status === 'pending'
                const isOverdue = isPending && new Date(t.deadline).getTime() < Date.now()

                return {
                    ...t,
                    status: (isOverdue ? 'overdue' : t.status) as TaskStatus
                }
            }) as TaskWithStatus[]
        },
        enabled: !!userId,
        staleTime: 1000 * 60 * 2, // 2 min
    })

    const tasks = tasksQuery.data ?? []

    const summary = {
        total: tasks.length,
        completed: tasks.filter((t) => t.status === 'done').length,
        pending: tasks.filter((t) => t.status === 'pending').length,
        overdue: tasks.filter((t) => t.status === 'overdue').length,
    }

    // Latest 5 tasks (by created_at or deadline - since we want "Recent task list", sort by created_at desc)
    const recentTasks = [...tasks].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5)

    return {
        tasks: recentTasks, // For the recent list
        allTasks: tasks, // For the donut and toasts
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

export function useCreateTask() {
    const qc = useQueryClient()
    const profile = useAuthStore((s) => s.profile)
    const userId = profile?.id ?? null

    return useMutation({
        mutationFn: async (newTask: { course_name: string; title: string; description?: string; deadline: string }) => {
            if (!userId) throw new Error('Not authenticated')
            const { error } = await supabase
                .from('tasks')
                .insert({
                    user_id: userId,
                    class_id: profile?.classId ?? '',
                    course_name: newTask.course_name,
                    title: newTask.title,
                    description: newTask.description || null,
                    deadline: newTask.deadline,
                    status: 'pending'
                })

            if (error) throw error
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['tasks', userId] })
        },
    })
}
