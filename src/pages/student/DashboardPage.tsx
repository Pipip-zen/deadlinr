import { useTasks } from '@/hooks/useTasks'
import { useAppStore } from '@/lib/store'
import { rankLabel } from '@/utils/points'
import { formatDeadline, isOverdue } from '@/utils/date'

export default function DashboardPage() {
    const { name, streakCount, totalPoints } = useAppStore()
    const { data: tasks, isLoading } = useTasks()

    const upcoming = tasks?.filter((t) => !isOverdue(t.deadline)).slice(0, 5)

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-2xl font-bold">Hello, {name?.split(' ')[0]} 👋</h1>
                <p className="text-muted-foreground text-sm">
                    {rankLabel(totalPoints)} · {streakCount}-day streak 🔥
                </p>
            </header>

            {/* Stats cards */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Points', value: totalPoints },
                    { label: 'Streak', value: `${streakCount} days` },
                    { label: 'Rank', value: rankLabel(totalPoints) },
                ].map(({ label, value }) => (
                    <div key={label} className="rounded-xl border border-border bg-card p-4">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="mt-1 text-xl font-bold">{value}</p>
                    </div>
                ))}
            </div>

            {/* Upcoming tasks */}
            <section>
                <h2 className="mb-3 text-lg font-semibold">Upcoming Deadlines</h2>
                {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
                {!isLoading && !upcoming?.length && (
                    <p className="text-sm text-muted-foreground">No upcoming tasks 🎉</p>
                )}
                <ul className="space-y-2">
                    {upcoming?.map((task) => (
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
