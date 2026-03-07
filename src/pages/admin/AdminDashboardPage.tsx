import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import { formatDeadline } from '@/utils/date'

export default function AdminDashboardPage() {
    const classId = useAuthStore((s) => s.profile?.classId ?? null)

    const { data: tasks, isLoading } = useQuery({
        queryKey: ['admin-tasks', classId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('class_id', classId!)
                .order('created_at', { ascending: false })
            if (error) throw error
            return data
        },
        enabled: !!classId,
    })

    const { data: members } = useQuery({
        queryKey: ['class-members', classId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, name, streak_count')
                .eq('class_id', classId!)
                .eq('role', 'student')
            if (error) throw error
            return data
        },
        enabled: !!classId,
    })

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Total Tasks</p>
                    <p className="mt-1 text-3xl font-bold">{tasks?.length ?? '—'}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Students</p>
                    <p className="mt-1 text-3xl font-bold">{members?.length ?? '—'}</p>
                </div>
            </div>
            <section>
                <h2 className="mb-3 text-lg font-semibold">Tasks</h2>
                {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
                <ul className="space-y-2">
                    {tasks?.map((task) => (
                        <li key={task.id} className="rounded-lg border border-border bg-card px-4 py-3">
                            <p className="font-medium">{task.title}</p>
                            <p className="text-xs text-muted-foreground">
                                {task.course_name} · Due {formatDeadline(task.deadline)}
                            </p>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    )
}
