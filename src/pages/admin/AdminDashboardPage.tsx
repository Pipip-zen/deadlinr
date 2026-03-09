import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    flexRender,
    createColumnHelper,
    type SortingState,
} from '@tanstack/react-table'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, Users } from 'lucide-react'
import { format } from 'date-fns'

import {
    useAdminTasks,
    useUpdateTask,
    useDeleteTask,
    useRealtimeCompletions,
    type TaskWithCompletions,
    type TaskFormValues,
} from '@/hooks/useAdminTasks'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'

// ── Zod schema ────────────────────────────────────────────────
const taskSchema = z.object({
    course_name: z.string().min(1, 'Course name is required'),
    title: z.string().min(1, 'Title is required'),
    description: z.string(),
    deadline: z.string().min(1, 'Deadline is required'),
})

// ── Sort icon ─────────────────────────────────────────────────
function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
    if (!sorted) return <ChevronsUpDown size={13} className="text-muted-foreground" />
    return sorted === 'asc'
        ? <ChevronUp size={13} className="text-primary" />
        : <ChevronDown size={13} className="text-primary" />
}

// ── Task form (create + edit) ─────────────────────────────────
function TaskForm({
    defaultValues,
    onSubmit,
    isLoading,
}: {
    defaultValues?: Partial<TaskFormValues>
    onSubmit: (v: TaskFormValues) => void
    isLoading: boolean
}) {
    const { register, handleSubmit, formState: { errors } } = useForm<TaskFormValues>({
        resolver: zodResolver(taskSchema),
        defaultValues: defaultValues ?? { course_name: '', title: '', description: '', deadline: '' },
    })

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
                label="Course name"
                {...register('course_name')}
                error={errors.course_name?.message}
                placeholder="e.g. Mathematics"
                id="course_name"
            />
            <Input
                label="Task title"
                {...register('title')}
                error={errors.title?.message}
                placeholder="e.g. Chapter 5 exercises"
                id="task_title"
            />
            <div className="space-y-1">
                <label className="block text-sm font-medium" htmlFor="task_desc">Description</label>
                <textarea
                    id="task_desc"
                    {...register('description')}
                    rows={3}
                    placeholder="Optional details…"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
            </div>
            <Input
                label="Deadline"
                type="datetime-local"
                {...register('deadline')}
                error={errors.deadline?.message}
                id="task_deadline"
            />
            <Button type="submit" className="w-full" loading={isLoading}>
                Save task
            </Button>
        </form>
    )
}

// ── Confirm delete dialog ─────────────────────────────────────
function ConfirmDialog({
    open,
    title,
    onConfirm,
    onCancel,
    isLoading,
}: {
    open: boolean
    title: string
    onConfirm: () => void
    onCancel: () => void
    isLoading: boolean
}) {
    return (
        <Dialog open={open} onClose={onCancel} title="Delete task" description="This action cannot be undone.">
            <p className="mb-6 text-sm text-muted-foreground">
                Are you sure you want to delete <span className="font-semibold text-foreground">"{title}"</span>?
                All student completions will also be deleted.
            </p>
            <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={onCancel}>
                    Cancel
                </Button>
                <Button
                    variant="destructive"
                    className="flex-1"
                    loading={isLoading}
                    onClick={onConfirm}
                >
                    Delete
                </Button>
            </div>
        </Dialog>
    )
}

// ── Column helper ─────────────────────────────────────────────
const col = createColumnHelper<TaskWithCompletions>()

// ── Main component ────────────────────────────────────────────
function AdminDashboardContent() {
    const { data: tasks = [], isLoading } = useAdminTasks()
    useRealtimeCompletions()

    const updateTask = useUpdateTask()
    const deleteTask = useDeleteTask()

    // Dialog state
    const [editTask, setEditTask] = useState<TaskWithCompletions | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<TaskWithCompletions | null>(null)
    const [sorting, setSorting] = useState<SortingState>([])

    const columns = useMemo(() => [
        col.accessor('course_name', {
            header: 'Course',
            enableSorting: true,
            cell: ({ getValue }) => (
                <span className="font-medium">{getValue()}</span>
            ),
        }),
        col.accessor('title', {
            header: 'Title',
            enableSorting: false,
            cell: ({ row }) => (
                <div>
                    <p className="font-medium">{row.original.title}</p>
                    {row.original.description && (
                        <p className="max-w-xs truncate text-xs text-muted-foreground">{row.original.description}</p>
                    )}
                </div>
            ),
        }),
        col.accessor('deadline', {
            header: 'Deadline',
            enableSorting: true,
            cell: ({ getValue }) => {
                const d = new Date(getValue())
                const isPast = d < new Date()
                return (
                    <span className={`text-sm ${isPast ? 'text-destructive' : 'text-foreground'}`}>
                        {format(d, 'MMM d, yyyy · HH:mm')}
                    </span>
                )
            },
        }),
        col.accessor('completions_count', {
            header: 'Completions',
            enableSorting: true,
            cell: ({ getValue }) => (
                <div className="flex items-center gap-1.5 text-sm">
                    <Users size={14} className="text-muted-foreground" />
                    <span className="font-semibold">{getValue()}</span>
                </div>
            ),
        }),
        col.display({
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <button
                        id={`edit-${row.original.id}`}
                        onClick={() => setEditTask(row.original)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        title="Edit"
                    >
                        <Pencil size={15} />
                    </button>
                    <button
                        id={`delete-${row.original.id}`}
                        onClick={() => setDeleteTarget(row.original)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        title="Delete"
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
            ),
        }),
    ], [])

    const table = useReactTable({
        data: tasks,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    })

    // Helpers to format deadline for datetime-local input
    function toDatetimeLocal(iso: string) {
        return format(new Date(iso), "yyyy-MM-dd'T'HH:mm")
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Task Management</h1>
                    <p className="text-sm text-muted-foreground">{tasks.length} task{tasks.length !== 1 ? 's' : ''} in your class</p>
                </div>
                <Link
                    id="create-task-btn"
                    to="/admin/create-task"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 h-10"
                >
                    <Plus size={16} />
                    New task
                </Link>
            </div>

            {/* Table */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                    Loading tasks…
                </div>
            ) : tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
                    <p className="text-muted-foreground text-sm">No tasks yet</p>
                    <Link
                        to="/admin/create-task"
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-transparent px-4 text-sm font-semibold transition-all hover:bg-accent hover:text-accent-foreground h-10"
                    >
                        <Plus size={14} />
                        Create your first task
                    </Link>
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                    <table className="w-full">
                        <thead>
                            {table.getHeaderGroups().map((hg) => (
                                <tr key={hg.id} className="border-b border-border bg-muted/40">
                                    {hg.headers.map((header) => (
                                        <th
                                            key={header.id}
                                            className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground ${header.column.getCanSort() ? 'cursor-pointer select-none' : ''
                                                }`}
                                            onClick={header.column.getToggleSortingHandler()}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                {header.column.getCanSort() && (
                                                    <SortIcon sorted={header.column.getIsSorted()} />
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            <AnimatePresence initial={false}>
                                {table.getRowModel().rows.map((row) => (
                                    <motion.tr
                                        key={row.original.id}
                                        layout
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <td key={cell.id} className="px-4 py-3">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            )}


            {/* Edit dialog */}
            <Dialog
                open={!!editTask}
                onClose={() => setEditTask(null)}
                title="Edit task"
                description="Update the task details."
            >
                {editTask && (
                    <TaskForm
                        key={editTask.id}
                        defaultValues={{
                            course_name: editTask.course_name,
                            title: editTask.title,
                            description: editTask.description ?? '',
                            deadline: toDatetimeLocal(editTask.deadline),
                        }}
                        isLoading={updateTask.isPending}
                        onSubmit={async (values) => {
                            await updateTask.mutateAsync({ id: editTask.id, values })
                            setEditTask(null)
                        }}
                    />
                )}
            </Dialog>

            {/* Delete confirm dialog */}
            <ConfirmDialog
                open={!!deleteTarget}
                title={deleteTarget?.title ?? ''}
                isLoading={deleteTask.isPending}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={async () => {
                    if (!deleteTarget) return
                    await deleteTask.mutateAsync(deleteTarget.id)
                    setDeleteTarget(null)
                }}
            />
        </div>
    )
}

export default function AdminDashboardPage() {
    return (
        <ErrorBoundary>
            <AdminDashboardContent />
        </ErrorBoundary>
    )
}
