import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Clock, AlertTriangle, Loader2 } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

import { useTasks, type TaskWithStatus } from '@/hooks/useTasks'
import { useCompleteTaskEdge } from '@/hooks/useCompleteTaskEdge'
import { Button } from '@/components/ui/button'

// ── Status config ─────────────────────────────────────────────
const STATUS_CONFIG = {
    pending: {
        badge: 'Pending',
        badgeCls: 'bg-muted text-muted-foreground',
        border: 'border-border',
        bg: 'bg-card',
        icon: Clock,
        iconCls: 'text-muted-foreground',
    },
    completed: {
        badge: 'Completed',
        badgeCls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
        border: 'border-emerald-400/60',
        bg: 'bg-emerald-50/40 dark:bg-emerald-950/20',
        icon: CheckCircle2,
        iconCls: 'text-emerald-500',
    },
    overdue: {
        badge: 'Overdue',
        badgeCls: 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400',
        border: 'border-rose-400/60',
        bg: 'bg-rose-50/40 dark:bg-rose-950/20',
        icon: AlertTriangle,
        iconCls: 'text-rose-500',
    },
}

// ── Helper ────────────────────────────────────────────────────
function deadlineLabel(task: TaskWithStatus): string {
    const now = new Date()
    const dl = new Date(task.deadline)
    if (task.status === 'completed' && task.completedAt) {
        return `Done on ${format(new Date(task.completedAt), 'MMM d, HH:mm')}`
    }
    if (task.status === 'overdue') {
        return `${formatDistanceToNow(dl, { addSuffix: false })} overdue`
    }
    const diff = Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 0) return 'Due today'
    return `${diff} day${diff !== 1 ? 's' : ''} left`
}

// ── Task card ─────────────────────────────────────────────────
function TaskCard({ task, onDone, loading }: { task: TaskWithStatus; onDone: () => void; loading: boolean }) {
    const cfg = STATUS_CONFIG[task.status]
    const Icon = cfg.icon

    return (
        <motion.li
            layout
            key={task.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className={`flex items-start gap-4 rounded-2xl border-l-4 border px-5 py-4 shadow-sm transition-colors duration-300 ${cfg.border} ${cfg.bg}`}
        >
            {/* Status icon */}
            <div className={`mt-0.5 shrink-0 ${cfg.iconCls}`}>
                <Icon size={20} />
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">{task.course_name}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cfg.badgeCls}`}>
                        {cfg.badge}
                    </span>
                    {task.status === 'completed' && task.pointsEarned != null && (
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                            +{task.pointsEarned} pts
                        </span>
                    )}
                </div>

                <p className={`font-semibold ${task.status === 'completed' ? 'text-muted-foreground line-through' : ''}`}>
                    {task.title}
                </p>

                {task.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                )}

                <p className={`mt-1 text-xs font-medium ${task.status === 'overdue' ? 'text-rose-500' :
                        task.status === 'completed' ? 'text-emerald-600 dark:text-emerald-400' :
                            'text-muted-foreground'
                    }`}>
                    {deadlineLabel(task)}
                    <span className="ml-1 font-normal text-muted-foreground">
                        · {format(new Date(task.deadline), 'MMM d, yyyy')}
                    </span>
                </p>
            </div>

            {/* Action */}
            <div className="shrink-0">
                {task.status === 'completed' ? (
                    <div className="flex items-center gap-1.5 rounded-xl bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                        <CheckCircle2 size={13} />
                        Completed
                    </div>
                ) : (
                    <Button
                        size="sm"
                        variant={task.status === 'overdue' ? 'destructive' : 'default'}
                        loading={loading}
                        onClick={onDone}
                        id={`complete-${task.id}`}
                        className="text-xs"
                    >
                        ✓ Done
                    </Button>
                )}
            </div>
        </motion.li>
    )
}

// ── Main page ─────────────────────────────────────────────────
export default function TasksPage() {
    const { tasks, isLoading, error } = useTasks()
    const completeTask = useCompleteTaskEdge()

    async function handleDone(taskId: string) {
        try {
            await completeTask.mutateAsync(taskId)
        } catch {
            // error toast handled in hook
        }
    }

    const pending = tasks.filter((t) => t.status === 'pending')
    const overdue = tasks.filter((t) => t.status === 'overdue')
    const completed = tasks.filter((t) => t.status === 'completed')

    if (error) {
        toast.error('Gagal memuat tasks')
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold">My Tasks</h1>
                <p className="text-sm text-muted-foreground">
                    {completed.length}/{tasks.length} selesai
                </p>
            </div>

            {isLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
                    <Loader2 size={16} className="animate-spin" />
                    Memuat tasks…
                </div>
            )}

            {!isLoading && tasks.length === 0 && (
                <p className="text-sm text-muted-foreground py-8 text-center">Belum ada tugas untuk kelasmu 🎉</p>
            )}

            {/* Overdue */}
            {overdue.length > 0 && (
                <section className="space-y-3">
                    <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-rose-500">
                        <AlertTriangle size={14} />
                        Overdue ({overdue.length})
                    </h2>
                    <AnimatePresence mode="popLayout">
                        <ul className="space-y-3">
                            {overdue.map((t) => (
                                <TaskCard
                                    key={t.id}
                                    task={t}
                                    loading={completeTask.isPending && completeTask.variables === t.id}
                                    onDone={() => handleDone(t.id)}
                                />
                            ))}
                        </ul>
                    </AnimatePresence>
                </section>
            )}

            {/* Pending */}
            {pending.length > 0 && (
                <section className="space-y-3">
                    <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                        <Clock size={14} />
                        Pending ({pending.length})
                    </h2>
                    <AnimatePresence mode="popLayout">
                        <ul className="space-y-3">
                            {pending.map((t) => (
                                <TaskCard
                                    key={t.id}
                                    task={t}
                                    loading={completeTask.isPending && completeTask.variables === t.id}
                                    onDone={() => handleDone(t.id)}
                                />
                            ))}
                        </ul>
                    </AnimatePresence>
                </section>
            )}

            {/* Completed */}
            {completed.length > 0 && (
                <section className="space-y-3">
                    <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-emerald-600">
                        <CheckCircle2 size={14} />
                        Completed ({completed.length})
                    </h2>
                    <ul className="space-y-3">
                        {completed.map((t) => (
                            <TaskCard
                                key={t.id}
                                task={t}
                                loading={false}
                                onDone={() => { }}
                            />
                        ))}
                    </ul>
                </section>
            )}
        </div>
    )
}
