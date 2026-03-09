import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import type { TaskRow } from '@/types/database'

export type TaskStatus = 'pending' | 'done' | 'overdue'

import type { Course } from '@/hooks/useCourses'

export interface TaskWithStatus extends Omit<TaskRow, 'status'> {
    status: TaskStatus
    course?: Pick<Course, 'id' | 'name' | 'code' | 'color'> | null
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
                .select('*, course:courses(id, name, code, color)')
                .eq('user_id', userId)
                .order('deadline', { ascending: true })
            if (error) throw error

            // Enforce type alignment with TypeScript status ENUM since supabase returns string
            return (data ?? []).map((t: any) => ({
                ...t,
                status: t.status as TaskStatus,
                course: t.course
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

export function useCreateTask() {
    const qc = useQueryClient()
    const profile = useAuthStore((s) => s.profile)
    const userId = profile?.id ?? null

    return useMutation({
        mutationFn: async (newTask: { course_id: string; title: string; description?: string; deadline: string }) => {
            if (!userId) throw new Error('Not authenticated')
            const { error } = await supabase
                .from('tasks')
                .insert({
                    user_id: userId,
                    class_id: '', // Legacy
                    course_name: '', // Legacy
                    course_id: newTask.course_id,
                    title: newTask.title,
                    description: newTask.description || null,
                    deadline: newTask.deadline,
                    status: 'pending'
                })

            if (error) throw error
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['tasks', userId] })
            // Duplicate invalidate to Dashboard if needed
        },
    })
}

export function useUpdateTask() {
    const qc = useQueryClient()
    const profile = useAuthStore((s) => s.profile)
    const userId = profile?.id ?? null

    return useMutation({
        mutationFn: async ({ id, ...updates }: { id: string; course_id: string; title: string; description?: string; deadline: string }) => {
            if (!userId) throw new Error('Not authenticated')
            const { error } = await supabase
                .from('tasks')
                .update({ ...updates, description: updates.description || null })
                .eq('id', id)
                .eq('user_id', userId)

            if (error) throw error
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['tasks', userId] })
        },
    })
}

export function useDeleteTask() {
    const qc = useQueryClient()
    const profile = useAuthStore((s) => s.profile)
    const userId = profile?.id ?? null

    return useMutation({
        mutationFn: async (id: string) => {
            if (!userId) throw new Error('Not authenticated')
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', id)
                .eq('user_id', userId)

            if (error) throw error
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['tasks', userId] })
        },
    })
}

