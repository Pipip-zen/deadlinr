import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTasks } from '@/hooks/useTasks'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import { formatDeadline, isOverdue } from '@/utils/date'
import { calcPoints } from '@/utils/points'

export default function TasksPage() {
    const { data: tasks, isLoading } = useTasks()
    const profile = useAuthStore((s) => s.profile)
    const userId = profile?.id ?? null
    const classId = profile?.classId ?? null
    const streak = profile?.streakCount ?? 0
    const qc = useQueryClient()
    const [completing, setCompleting] = useState<string | null>(null)

    const completeMutation = useMutation({
        mutationFn: async (taskId: string) => {
            const task = tasks?.find((t) => t.id === taskId)
            if (!task || !userId) return
            const pts = calcPoints(task.deadline, new Date(), streak)
            const { error } = await supabase.from('task_completions').insert({
                task_id: taskId,
                user_id: userId,
                points_earned: pts,
            })
            if (error) throw error
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', classId] }),
        onSettled: () => setCompleting(null),
    })

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold">My Tasks</h1>
            {isLoading && <p className="text-sm text-muted-foreground">Loading tasks…</p>}
            <ul className="space-y-3">
                {tasks?.map((task) => {
                    const overdue = isOverdue(task.deadline)
                    return (
                        <li
                            key={task.id}
                            className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
                        >
                            <div>
                                <p className="font-medium">{task.title}</p>
                                <p className="text-xs text-muted-foreground">
                                    {task.course_name} · Due{' '}
                                    <span className={overdue ? 'text-destructive' : ''}>
                                        {formatDeadline(task.deadline)}
                                    </span>
                                </p>
                                {task.description && (
                                    <p className="mt-1 text-xs text-muted-foreground">{task.description}</p>
                                )}
                            </div>
                            <button
                                id={`complete-${task.id}`}
                                onClick={() => { setCompleting(task.id); completeMutation.mutate(task.id) }}
                                disabled={completing === task.id}
                                className="ml-4 shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                            >
                                {completing === task.id ? '…' : '✓ Done'}
                            </button>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
