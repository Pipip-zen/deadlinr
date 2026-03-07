import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { toast } from 'sonner'
import { CheckCircle, Clock, AlertTriangle, ListTodo } from 'lucide-react'

import { useDashboard } from '@/hooks/useDashboard'
import { useCompleteTaskEdge } from '@/hooks/useCompleteTaskEdge'
import { useRealtimeTasks } from '@/hooks/useRealtimeTasks'
import { useAuthStore } from '@/lib/store'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { Button } from '@/components/ui/button'
import { rankLabel } from '@/utils/points'
import { daysUntil, formatDeadline } from '@/utils/date'
import type { TaskWithStatus } from '@/hooks/useDashboard'

// ── Status theme ──────────────────────────────────────────────
const STATUS = {
    completed: { label: 'Completed', color: '#22c55e', bg: 'bg-green-500/10', text: 'text-green-500' },
    overdue: { label: 'Overdue', color: '#ef4444', bg: 'bg-red-500/10', text: 'text-red-500' },
    'due-soon': { label: 'Due Soon', color: '#f59e0b', bg: 'bg-amber-500/10', text: 'text-amber-500' },
    upcoming: { label: 'Upcoming', color: '#6366f1', bg: 'bg-indigo-500/10', text: 'text-indigo-500' },
}

// ── Summary card ──────────────────────────────────────────────
interface SummaryCardProps {
    label: string
    value: number
    icon: React.ElementType
    colorClass: string
    delay: number
}
function SummaryCard({ label, value, icon: Icon, colorClass, delay }: SummaryCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4, ease: 'easeOut' }}
            className="rounded-2xl border border-border bg-card p-5 shadow-sm"
        >
            <div className={`mb-3 inline-flex rounded-xl p-2.5 ${colorClass}`}>
                <Icon size={20} />
            </div>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
        </motion.div>
    )
}

// ── Status badge ──────────────────────────────────────────────
function StatusBadge({ status }: { status: TaskWithStatus['status'] }) {
    const s = STATUS[status]
    return (
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.bg} ${s.text}`}>
            {s.label}
        </span>
    )
}

// ── Task card ────────────────────────────────────────────────
interface TaskCardProps {
    task: TaskWithStatus
    onComplete: () => void
    completing: boolean
}
function TaskCard({ task, onComplete, completing }: TaskCardProps) {
    const days = daysUntil(task.deadline)
    const isDone = task.status === 'completed'

    return (
        <motion.li
            layout
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, x: 60, transition: { duration: 0.25 } }}
            className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card px-4 py-4"
        >
            <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">{task.course_name}</span>
                    <StatusBadge status={task.status} />
                </div>
                <p className="truncate font-semibold">{task.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                    {isDone
                        ? `Completed`
                        : days < 0
                            ? `${Math.abs(days)}d overdue`
                            : days === 0
                                ? 'Due today'
                                : `${days}d left`}
                    {' · '}
                    {formatDeadline(task.deadline)}
                </p>
            </div>

            {!isDone && (
                <Button
                    size="sm"
                    variant="outline"
                    loading={completing}
                    onClick={onComplete}
                    className="shrink-0"
                >
                    ✓ Done
                </Button>
            )}
        </motion.li>
    )
}

// ── Task group ────────────────────────────────────────────────
function TaskGroup({
    title,
    tasks,
    onComplete,
    completing,
}: {
    title: string
    tasks: TaskWithStatus[]
    onComplete: (id: string, deadline: string) => void
    completing: string | null
}) {
    if (!tasks.length) return null
    return (
        <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {title} ({tasks.length})
            </h3>
            <ul className="space-y-2">
                <AnimatePresence mode="popLayout">
                    {tasks.map((t) => (
                        <TaskCard
                            key={t.id}
                            task={t}
                            completing={completing === t.id}
                            onComplete={() => onComplete(t.id, t.deadline)}
                        />
                    ))}
                </AnimatePresence>
            </ul>
        </section>
    )
}


// ── Main dashboard component ──────────────────────────────────
function DashboardContent() {
    const profile = useAuthStore((s) => s.profile)
    const totalPts = useAuthStore((s) => s.profile?.streakCount ?? 0) // placeholder
    const { tasks, summary, isLoading } = useDashboard()
    const completeTask = useCompleteTaskEdge()
    const [completing, setCompleting] = useState<string | null>(null)

    // Realtime subscription
    useRealtimeTasks()

    // Deadline toasts — run once on mount when data is ready
    const [toasted, setToasted] = useState(false)
    useEffect(() => {
        if (toasted || tasks.length === 0) return
        const soon = tasks.filter(
            (t) => t.status === 'due-soon' || t.status === 'overdue'
        )
        if (soon.length === 0) return
        soon.forEach((t, i) => {
            const days = daysUntil(t.deadline)
            const msg =
                days < 0 ? `"${t.title}" is ${Math.abs(days)}d overdue!` :
                    days === 0 ? `"${t.title}" is due today!` :
                        `"${t.title}" due in ${days} day${days !== 1 ? 's' : ''}`
            setTimeout(() => {
                toast.warning(msg, { duration: 5000 })
            }, i * 600)
        })
        setToasted(true)
    }, [tasks, toasted])

    async function handleComplete(taskId: string, _deadline: string) {
        setCompleting(taskId)
        try {
            await completeTask.mutateAsync(taskId)
        } catch {
            // error toast handled inside the hook
        } finally {
            setCompleting(null)
        }
    }

    // Grouped tasks (exclude completed from list)
    const overdue = tasks.filter((t) => t.status === 'overdue')
    const dueSoon = tasks.filter((t) => t.status === 'due-soon')
    const upcoming = tasks.filter((t) => t.status === 'upcoming')

    // Donut data
    const chartData = [
        { name: 'Completed', value: summary.completed, color: STATUS.completed.color },
        { name: 'Overdue', value: summary.overdue, color: STATUS.overdue.color },
        { name: 'In Progress', value: summary.inProgress, color: STATUS['due-soon'].color },
    ].filter((d) => d.value > 0)

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">
                    Hello, {profile?.name?.split(' ')[0] ?? 'there'} 👋
                </h1>
                <p className="text-sm text-muted-foreground">
                    {rankLabel(totalPts)} · Here's your class overview
                </p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <SummaryCard label="Total Tasks" value={summary.total} icon={ListTodo} colorClass="bg-indigo-500/10 text-indigo-500" delay={0} />
                <SummaryCard label="Completed" value={summary.completed} icon={CheckCircle} colorClass="bg-green-500/10  text-green-500" delay={0.07} />
                <SummaryCard label="In Progress" value={summary.inProgress} icon={Clock} colorClass="bg-amber-500/10  text-amber-500" delay={0.14} />
                <SummaryCard label="Overdue" value={summary.overdue} icon={AlertTriangle} colorClass="bg-red-500/10    text-red-500" delay={0.21} />
            </div>

            {/* Donut + legend */}
            {!isLoading && summary.total > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center"
                >
                    <div className="mx-auto h-52 w-52 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    dataKey="value"
                                    strokeWidth={0}
                                    labelLine={false}
                                >
                                    {chartData.map((entry) => (
                                        <Cell key={entry.name} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(v, n) => [`${v} tasks`, n]}
                                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                                />
                                {/* Center total */}
                                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                                    <tspan fontSize={28} fontWeight={700} fill="currentColor">{summary.total}</tspan>
                                    <tspan x="50%" dy={22} fontSize={11} fill="#888">tasks</tspan>
                                </text>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-4">
                        {chartData.map((d) => (
                            <div key={d.name} className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full" style={{ background: d.color }} />
                                <span className="text-sm text-muted-foreground">{d.name}</span>
                                <span className="text-sm font-semibold">{d.value}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Task list */}
            <div className="space-y-6">
                <h2 className="text-lg font-semibold">Tasks</h2>
                {isLoading && (
                    <p className="text-sm text-muted-foreground">Loading tasks…</p>
                )}
                {!isLoading && summary.total === 0 && (
                    <p className="text-sm text-muted-foreground">No tasks yet for your class 🎉</p>
                )}
                <TaskGroup title="Overdue" tasks={overdue} onComplete={handleComplete} completing={completing} />
                <TaskGroup title="Due Soon" tasks={dueSoon} onComplete={handleComplete} completing={completing} />
                <TaskGroup title="Upcoming" tasks={upcoming} onComplete={handleComplete} completing={completing} />
            </div>
        </div>
    )
}

export default function DashboardPage() {
    return (
        <ErrorBoundary>
            <DashboardContent />
        </ErrorBoundary>
    )
}
