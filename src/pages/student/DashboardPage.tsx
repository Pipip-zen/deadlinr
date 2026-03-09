import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { toast } from 'sonner'
import { CheckCircle, Clock, AlertTriangle, Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { useDashboard, useCompleteTask, useCreateTask } from '@/hooks/useDashboard'
import { useRealtimeTasks } from '@/hooks/useRealtimeTasks'
import { useAuthStore } from '@/lib/store'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { Button } from '@/components/ui/button'
import { daysUntil, formatDeadline } from '@/utils/date'
import type { TaskWithStatus } from '@/hooks/useTasks'

// ── Status theme ──────────────────────────────────────────────
const STATUS = {
    done: { label: 'Completed', color: '#22c55e', bg: 'bg-green-500/10', text: 'text-green-500' },
    overdue: { label: 'Overdue', color: '#ef4444', bg: 'bg-red-500/10', text: 'text-red-500' },
    pending: { label: 'Pending', color: '#f59e0b', bg: 'bg-amber-500/10', text: 'text-amber-500' },
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
    const isDone = task.status === 'done'

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

// ── Inline Form Schema ───────────────────────────────────────
const taskSchema = z.object({
    course_name: z.string().min(1, 'Course name is required'),
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    deadline: z.string().min(1, 'Deadline is required')
})
type TaskFormValues = z.infer<typeof taskSchema>


// ── Main dashboard component ──────────────────────────────────
function DashboardContent() {
    const profile = useAuthStore((s) => s.profile)
    const { tasks: recentTasks, allTasks, summary, isLoading } = useDashboard()
    const completeTask = useCompleteTask()
    const createTask = useCreateTask()

    const [completing, setCompleting] = useState<string | null>(null)

    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TaskFormValues>({
        resolver: zodResolver(taskSchema),
        defaultValues: { course_name: '', title: '', description: '', deadline: '' }
    })

    // Realtime subscription
    useRealtimeTasks()

    // Deadline toasts — run once on mount when data is ready
    const [toasted, setToasted] = useState(false)
    useEffect(() => {
        if (toasted || allTasks.length === 0) return
        const soon = allTasks.filter(
            (t) => t.status === 'pending' || t.status === 'overdue'
        )
        if (soon.length === 0) return
        soon.forEach((t, i) => {
            const days = daysUntil(t.deadline)
            // Only warn if due within 3 days
            if (days > 3 && t.status !== 'overdue') return

            const msg =
                days < 0 ? `"${t.title}" is ${Math.abs(days)}d overdue!` :
                    days === 0 ? `"${t.title}" is due today!` :
                        `"${t.title}" due in ${days} day${days !== 1 ? 's' : ''}`
            setTimeout(() => {
                toast.warning(msg, { duration: 5000 })
            }, i * 600)
        })
        setToasted(true)
    }, [allTasks, toasted])

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

    async function onSubmit(data: TaskFormValues) {
        try {
            await createTask.mutateAsync(data)
            toast.success('Task added successfully')
            reset()
        } catch {
            toast.error('Failed to add task')
        }
    }

    // Donut data
    const chartData = [
        { name: 'Completed', value: summary.completed, color: STATUS.done.color },
        { name: 'Overdue', value: summary.overdue, color: STATUS.overdue.color },
        { name: 'Pending', value: summary.pending, color: STATUS.pending.color },
    ].filter((d) => d.value > 0)

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">
                    Hello, {profile?.name?.split(' ')[0] ?? 'there'} 👋
                </h1>
                <p className="text-sm text-muted-foreground">
                    Here's your personal task overview
                </p>
            </div>

            {/* Summary cards (Pending, Completed, Overdue) */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <SummaryCard label="Pending" value={summary.pending} icon={Clock} colorClass="bg-amber-500/10 text-amber-500" delay={0} />
                <SummaryCard label="Completed" value={summary.completed} icon={CheckCircle} colorClass="bg-green-500/10 text-green-500" delay={0.07} />
                <SummaryCard label="Overdue" value={summary.overdue} icon={AlertTriangle} colorClass="bg-red-500/10 text-red-500" delay={0.14} />
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">

                {/* Left Column: Donut Chart & Quick Add Form */}
                <div className="space-y-8">
                    {/* Donut Chart */}
                    {!isLoading && summary.total > 0 ? (
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-6"
                        >
                            <h2 className="text-lg font-semibold">Task Breakdown</h2>
                            <div className="flex flex-col md:flex-row md:items-center gap-6">
                                <div className="mx-auto h-64 w-full md:h-52 md:w-52 shrink-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={chartData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={70}
                                                outerRadius={100}
                                                dataKey="value"
                                                strokeWidth={0}
                                                labelLine={false}
                                            >
                                                {chartData.map((entry) => (
                                                    <Cell key={entry.name} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(v: any, n: any) => [`${v} tasks`, n]}
                                                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                                            />
                                            {/* Center total */}
                                            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                                                <tspan fontSize={32} fontWeight={700} fill="currentColor">{summary.total}</tspan>
                                                <tspan x="50%" dy={24} fontSize={12} fill="#888">tasks</tspan>
                                            </text>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Legend */}
                                <div className="flex flex-row md:flex-col flex-wrap justify-center gap-4 md:gap-3">
                                    {chartData.map((d) => (
                                        <div key={d.name} className="flex items-center gap-2 min-w-[100px] md:min-w-0">
                                            <span className="h-3 w-3 rounded-full shrink-0" style={{ background: d.color }} />
                                            <span className="text-sm font-medium">{d.name}</span>
                                            <span className="text-sm font-bold text-muted-foreground ml-auto">{d.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ) : null}

                    {/* Quick Add Form */}
                    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                        <div className="mb-4">
                            <h2 className="text-lg font-semibold">Quick Add Task</h2>
                            <p className="text-sm text-muted-foreground">Instantly add a new pending task</p>
                        </div>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <input
                                        {...register('course_name')}
                                        placeholder="Course Name"
                                        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    />
                                    {errors.course_name && <p className="mt-1 text-xs text-red-500">{errors.course_name.message}</p>}
                                </div>
                                <div>
                                    <input
                                        {...register('title')}
                                        placeholder="Task Title"
                                        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    />
                                    {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
                                </div>
                            </div>

                            <div>
                                <textarea
                                    {...register('description')}
                                    placeholder="Description (Optional)"
                                    className="min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                            </div>

                            <div>
                                <input
                                    type="datetime-local"
                                    {...register('deadline')}
                                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                                {errors.deadline && <p className="mt-1 text-xs text-red-500">{errors.deadline.message}</p>}
                            </div>

                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? 'Adding...' : <><Plus size={16} className="mr-2" /> Add Task</>}
                            </Button>
                        </form>
                    </div>
                </div>

                {/* Right Column: Recent Tasks */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Recent Tasks</h2>
                        <span className="text-xs text-muted-foreground">Latest 5 tasks</span>
                    </div>
                    {isLoading && (
                        <p className="text-sm text-muted-foreground">Loading tasks…</p>
                    )}
                    {!isLoading && summary.total === 0 && (
                        <p className="text-sm text-muted-foreground italic">No tasks created yet 🎉</p>
                    )}

                    {recentTasks.length > 0 && (
                        <ul className="space-y-3">
                            <AnimatePresence mode="popLayout">
                                {recentTasks.map((t) => (
                                    <TaskCard
                                        key={t.id}
                                        task={t}
                                        completing={completing === t.id}
                                        onComplete={() => handleComplete(t.id, t.deadline)}
                                    />
                                ))}
                            </AnimatePresence>
                        </ul>
                    )}
                </div>

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
