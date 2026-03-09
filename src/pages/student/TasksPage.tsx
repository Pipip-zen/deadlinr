import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Clock, AlertTriangle, Plus, MoreVertical, Trash2, Edit2, Loader2 } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { useReactTable, getCoreRowModel, getFilteredRowModel, getSortedRowModel, type ColumnDef, type SortingState, type ColumnFiltersState } from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'

import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/useTasks'
import { useMarkTaskDone } from '@/hooks/useMarkTaskDone'
import type { TaskWithStatus } from '@/hooks/useTasks'
import { useAuthStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'

// ── Types & Config ─────────────────────────────────────────────
const STATUS_CONFIG = {
    pending: {
        badge: 'Pending',
        badgeCls: 'bg-muted text-muted-foreground',
        border: 'border-border',
        bg: 'bg-card',
        icon: Clock,
        iconCls: 'text-muted-foreground',
    },
    done: {
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

function deadlineLabel(task: TaskWithStatus): string {
    const now = new Date()
    const dl = new Date(task.deadline)
    if (task.status === 'overdue') {
        return `${formatDistanceToNow(dl, { addSuffix: false })} overdue`
    }
    const diff = Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 0) return 'Due today'
    return `${diff} day${diff !== 1 ? 's' : ''} left`
}

// ── Inline Form Schema ───────────────────────────────────────
const taskSchema = z.object({
    id: z.string().optional(),
    course_name: z.string().min(1, 'Course name is required'),
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    deadline: z.string().min(1, 'Deadline is required')
})
type TaskFormValues = z.infer<typeof taskSchema>


// ── Actions Dropdown Component ─────────────────────────────────────
function TaskActions({ task, onEdit, onDelete }: { task: TaskWithStatus, onEdit: (task: TaskWithStatus) => void, onDelete: (task: TaskWithStatus) => void }) {
    const [open, setOpen] = useState(false)
    const profile = useAuthStore((s) => s.profile)
    if (task.user_id !== profile?.id) return null

    return (
        <div className="relative">
            <Button variant="ghost" size="icon" onClick={() => setOpen(!open)} className="h-8 w-8">
                <MoreVertical size={16} />
            </Button>
            <AnimatePresence>
                {open && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute right-0 top-full z-50 mt-1 w-32 rounded-md border border-border bg-popover p-1 shadow-md"
                        >
                            <button onClick={() => { setOpen(false); onEdit(task); }} className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground">
                                <Edit2 size={14} /> Edit
                            </button>
                            <button onClick={() => { setOpen(false); onDelete(task); }} className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10">
                                <Trash2 size={14} /> Delete
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}

// ── Main tasks component ──────────────────────────────────
function TasksContent() {
    const { tasks, isLoading } = useTasks()
    const createTask = useCreateTask()
    const updateTask = useUpdateTask()
    const deleteTask = useDeleteTask()
    const markDone = useMarkTaskDone()

    const { data: courses, isLoading: isLoadingCourses } = useQuery({
        queryKey: ['courses'],
        queryFn: async () => {
            const { data, error } = await supabase.from('courses').select('id, name').order('name')
            if (error) throw error
            return data
        }
    })

    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingTask, setEditingTask] = useState<TaskWithStatus | null>(null)
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<TaskWithStatus | null>(null)

    const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<TaskFormValues>({
        resolver: zodResolver(taskSchema),
        defaultValues: { course_name: '', title: '', description: '', deadline: '' }
    })

    const openCreateDialog = () => {
        setEditingTask(null)
        reset({ course_name: '', title: '', description: '', deadline: '' })
        setDialogOpen(true)
    }

    const openEditDialog = (task: TaskWithStatus) => {
        setEditingTask(task)
        // Convert timestamp to datetime-local friendly format if needed
        const dt = new Date(task.deadline).toISOString().slice(0, 16)
        setValue('id', task.id)
        setValue('course_name', task.course_name)
        setValue('title', task.title)
        setValue('description', task.description || '')
        setValue('deadline', dt)
        setDialogOpen(true)
    }

    async function onFormSubmit(data: TaskFormValues) {
        try {
            if (editingTask && data.id) {
                await updateTask.mutateAsync({
                    id: data.id,
                    course_name: data.course_name,
                    title: data.title,
                    description: data.description,
                    deadline: new Date(data.deadline).toISOString()
                })
                toast.success('Task updated successfully')
            } else {
                await createTask.mutateAsync({
                    course_name: data.course_name,
                    title: data.title,
                    description: data.description,
                    deadline: new Date(data.deadline).toISOString()
                })
                toast.success('Task added successfully')
            }
            setDialogOpen(false)
        } catch {
            toast.error(editingTask ? 'Failed to update task' : 'Failed to add task')
        }
    }

    // TanStack Table setup
    const columns = useMemo<ColumnDef<TaskWithStatus>[]>(() => [
        {
            accessorKey: 'course_name',
            header: 'Course',
            filterFn: 'includesString'
        },
        {
            accessorKey: 'status',
            header: 'Status',
            filterFn: 'equals'
        },
        {
            accessorKey: 'deadline',
            header: 'Deadline'
        },
        {
            accessorKey: 'created_at',
            header: 'Created'
        }
    ], [])

    const table = useReactTable({
        data: tasks,
        columns,
        state: { sorting, columnFilters },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
    })

    // Status Filter utility
    const filters = [
        { label: 'All', value: 'all' },
        { label: 'Pending', value: 'pending' },
        { label: 'Done', value: 'done' },
        { label: 'Overdue', value: 'overdue' },
    ]
    const currentStatusFilter = (table.getColumn('status')?.getFilterValue() as string) ?? 'all'
    const setStatusFilter = (val: string) => {
        table.getColumn('status')?.setFilterValue(val === 'all' ? undefined : val)
    }

    return (
        <div className="mx-auto max-w-5xl space-y-8 pb-12 pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Your Tasks</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Manage everything across all your courses.</p>
                </div>
                <Button onClick={openCreateDialog} className="hidden sm:flex shrink-0 group">
                    <Plus size={16} className="mr-2 transition-transform group-hover:rotate-90" />
                    Add Task
                </Button>
            </div>

            {/* Mobile FAB */}
            <Button
                onClick={openCreateDialog}
                className="sm:hidden fixed bottom-20 right-6 z-40 h-14 w-14 rounded-full shadow-lg"
                size="icon"
            >
                <Plus size={24} />
            </Button>

            {/* Filter and Sort Controls */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
                    {filters.map(f => (
                        <button
                            key={f.value}
                            onClick={() => setStatusFilter(f.value)}
                            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${currentStatusFilter === f.value ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <Input
                        placeholder="Filter by course..."
                        value={(table.getColumn('course_name')?.getFilterValue() as string) ?? ''}
                        onChange={(e) => table.getColumn('course_name')?.setFilterValue(e.target.value)}
                        className="w-full sm:w-64"
                    />
                </div>
            </div>

            {/* TanStack Driven Card Layout */}
            {isLoading ? (
                <div className="flex h-40 items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-muted-foreground" />
                </div>
            ) : tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
                    <CheckCircle2 size={48} className="mb-4 text-muted-foreground/30" />
                    <h3 className="text-lg font-semibold">No tasks found!</h3>
                    <p className="text-sm text-muted-foreground mt-1">You're all caught up. Start by adding a task.</p>
                </div>
            ) : (
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <AnimatePresence mode="popLayout">
                        {table.getRowModel().rows.map(row => {
                            const task = row.original
                            const cfg = STATUS_CONFIG[task.status]
                            const Icon = cfg.icon
                            const isDone = task.status === 'done'

                            return (
                                <motion.li
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                                    key={task.id}
                                    className={`flex flex-col justify-between rounded-2xl border-l-4 border-t border-r border-b px-5 py-4 shadow-sm transition-colors duration-300 ${cfg.border} ${cfg.bg}`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`shrink-0 ${cfg.iconCls}`}>
                                                <Icon size={18} />
                                            </div>
                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cfg.badgeCls}`}>
                                                {cfg.badge}
                                            </span>
                                        </div>
                                        <TaskActions task={task} onEdit={openEditDialog} onDelete={setDeleteConfirmOpen} />
                                    </div>

                                    <div className="my-4 flex-1">
                                        <h4 className={`text-sm font-semibold text-muted-foreground uppercase tracking-wide`}>
                                            {task.course_name}
                                        </h4>
                                        <p className={`mt-1 font-semibold text-lg leading-tight ${isDone ? 'text-muted-foreground line-through' : ''}`}>
                                            {task.title}
                                        </p>
                                        {task.description && (
                                            <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                                                {task.description}
                                            </p>
                                        )}
                                    </div>

                                    <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4">
                                        <div className={`text-xs font-medium ${task.status === 'overdue' ? 'text-rose-500' : task.status === 'done' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                                            {isDone ? `Done on ${format(new Date(task.completed_at || new Date()), 'MMM d')}` : deadlineLabel(task)}
                                        </div>

                                        {!isDone && (
                                            <Button
                                                size="sm"
                                                variant={task.status === 'overdue' ? 'destructive' : 'outline'}
                                                className="h-8 rounded-full px-3 text-xs"
                                                onClick={() => markDone.mutateAsync(task.id)}
                                            >
                                                Mark as Done
                                            </Button>
                                        )}
                                    </div>
                                </motion.li>
                            )
                        })}
                    </AnimatePresence>
                </ul>
            )}

            {/* Add / Edit Task Dialog */}
            <Dialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                title={editingTask ? 'Edit Task' : 'Add New Task'}
                description="Enter task details below."
            >
                <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">Course Name</label>
                            <select
                                {...register('course_name')}
                                className="w-full rounded-md border border-input bg-transparent px-3 py-[9px] text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <option value="" disabled>Select a course</option>
                                {isLoadingCourses ? (
                                    <option disabled>Loading courses...</option>
                                ) : (
                                    courses?.map(c => (
                                        <option key={c.id} value={c.name}>{c.name}</option>
                                    ))
                                )}
                            </select>
                            {errors.course_name && <p className="mt-1 text-xs text-red-500">{errors.course_name.message}</p>}
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">Title</label>
                            <Input {...register('title')} placeholder="e.g. Read Chapter 4" />
                            {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Description (Optional)</label>
                        <textarea
                            {...register('description')}
                            className="min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            placeholder="Add notes or requirements..."
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Deadline</label>
                        <Input type="datetime-local" {...register('deadline')} />
                        {errors.deadline && <p className="mt-1 text-xs text-red-500">{errors.deadline.message}</p>}
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="button" variant="ghost" className="mr-2" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save Task'}
                        </Button>
                    </div>
                </form>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={!!deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(null)}
                title="Delete Task"
            >
                <div className="py-2 text-sm text-muted-foreground">
                    Are you sure you want to delete <span className="font-semibold text-foreground">"{deleteConfirmOpen?.title}"</span>? This action cannot be undone.
                </div>
                <div className="flex justify-end pt-4">
                    <Button type="button" variant="ghost" className="mr-2" onClick={() => setDeleteConfirmOpen(null)}>Cancel</Button>
                    <Button type="button" variant="destructive" onClick={async () => {
                        if (deleteConfirmOpen) {
                            try {
                                await deleteTask.mutateAsync(deleteConfirmOpen.id)
                                toast.success('Task deleted')
                            } catch {
                                toast.error('Failed to delete task')
                            }
                            setDeleteConfirmOpen(null)
                        }
                    }}>
                        Delete
                    </Button>
                </div>
            </Dialog>
        </div>
    )
}

export default function TasksPage() {
    return (
        <ErrorBoundary>
            <TasksContent />
        </ErrorBoundary>
    )
}
