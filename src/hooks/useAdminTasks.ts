import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import type { TaskRow } from '@/types/database'

// ── Types ──────────────────────────────────────────────────────
export interface TaskWithCompletions extends TaskRow {
    completions_count: number
}

export interface TaskFormValues {
    course_name: string
    title: string
    description: string
    deadline: string
}

export const PAGE_SIZE = 10

// ── Fetch tasks + completion counts (paginated) ───────────────
export function useAdminTasks(page = 0) {
    const profile = useAuthStore((s) => s.profile)
    const classId = profile?.classId ?? null

    return useQuery({
        queryKey: ['admin-tasks', classId, page],
        queryFn: async (): Promise<{ tasks: TaskWithCompletions[]; total: number }> => {
            const from = page * PAGE_SIZE
            const to = from + PAGE_SIZE - 1

            const { data: tasks, error: taskErr, count } = await supabase
                .from('tasks')
                .select('*', { count: 'exact' })
                .eq('class_id', classId!)
                .order('deadline', { ascending: true })
                .range(from, to)

            if (taskErr) throw taskErr

            const taskIds = (tasks ?? []).map((t) => t.id)
            if (taskIds.length === 0) return { tasks: [], total: count ?? 0 }

            const { data: counts, error: countErr } = await supabase
                .from('task_completions')
                .select('task_id')
                .in('task_id', taskIds)

            if (countErr) throw countErr

            const countMap = (counts ?? []).reduce<Record<string, number>>((acc, row) => {
                acc[row.task_id] = (acc[row.task_id] ?? 0) + 1
                return acc
            }, {})

            return {
                tasks: (tasks ?? []).map((t) => ({
                    ...t,
                    completions_count: countMap[t.id] ?? 0,
                })),
                total: count ?? 0,
            }
        },
        enabled: !!classId,
        staleTime: 1000 * 30,
    })
}

// ── Create task ────────────────────────────────────────────────
export function useCreateTask() {
    const qc = useQueryClient()
    const profile = useAuthStore((s) => s.profile)

    return useMutation({
        mutationFn: async (values: TaskFormValues) => {
            const { error } = await supabase.from('tasks').insert({
                class_id: profile!.classId!,
                created_by: profile!.id,
                course_name: values.course_name,
                title: values.title,
                description: values.description || null,
                deadline: new Date(values.deadline).toISOString(),
            })
            if (error) throw error
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin-tasks', profile?.classId] })
            toast.success('Task created ✅')
        },
        onError: (e: Error) => toast.error(`Failed to create: ${e.message}`),
    })
}

// ── Update task ────────────────────────────────────────────────
export function useUpdateTask() {
    const qc = useQueryClient()
    const profile = useAuthStore((s) => s.profile)

    return useMutation({
        mutationFn: async ({ id, values }: { id: string; values: TaskFormValues }) => {
            const { error } = await supabase.from('tasks').update({
                course_name: values.course_name,
                title: values.title,
                description: values.description || null,
                deadline: new Date(values.deadline).toISOString(),
            }).eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin-tasks', profile?.classId] })
            toast.success('Task updated ✅')
        },
        onError: (e: Error) => toast.error(`Failed to update: ${e.message}`),
    })
}

// ── Delete task ────────────────────────────────────────────────
export function useDeleteTask() {
    const qc = useQueryClient()
    const profile = useAuthStore((s) => s.profile)

    return useMutation({
        mutationFn: async (taskId: string) => {
            const { error } = await supabase.from('tasks').delete().eq('id', taskId)
            if (error) throw error
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin-tasks', profile?.classId] })
            toast.success('Task deleted 🗑️')
        },
        onError: (e: Error) => toast.error(`Failed to delete: ${e.message}`),
    })
}

// ── Realtime: tasks INSERT/UPDATE/DELETE + completions INSERT ──
export function useRealtimeCompletions() {
    const qc = useQueryClient()
    const profile = useAuthStore((s) => s.profile)
    const classId = profile?.classId ?? null

    useEffect(() => {
        if (!classId) return

        const channel = supabase
            .channel(`admin-realtime:${classId}`)
            // Task changes (insert / update / delete)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tasks', filter: `class_id=eq.${classId}` },
                () => { qc.invalidateQueries({ queryKey: ['admin-tasks', classId] }) }
            )
            // Completion changes
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'task_completions' },
                () => { qc.invalidateQueries({ queryKey: ['admin-tasks', classId] }) }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [classId, qc])
}
