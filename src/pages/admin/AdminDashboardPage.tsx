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
import {
    Plus, Pencil, Trash2, ChevronUp, ChevronDown, ChevronsUpDown,
    CheckCircle2, XCircle, X, Loader2, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { format } from 'date-fns'

import {
    useAdminTasks,
    useUpdateTask,
    useDeleteTask,
    useRealtimeCompletions,
    PAGE_SIZE,
    type TaskWithCompletions,
    type TaskFormValues,
} from '@/hooks/useAdminTasks'
import { useTaskCompletionDetail } from '@/hooks/useTaskCompletionDetail'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'

// ── Zod schema (edit form) ─────────────────────────────────────
const taskSchema = z.object({
    course_name: z.string().min(1, 'Course name is required'),
    title: z.string().min(1, 'Title is required'),
    description: z.string(),
    deadline: z.string().min(1, 'Deadline is required'),
})

// ── Sort icon ──────────────────────────────────────────────────
function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
    if (!sorted) return <ChevronsUpDown size={13} className="text-muted-foreground" />
    return sorted === 'asc'
        ? <ChevronUp size={13} className="text-primary" />
        : <ChevronDown size={13} className="text-primary" />
}

// ── Task edit form ─────────────────────────────────────────────
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
            <Input label="Course name" {...register('course_name')} error={errors.course_name?.message} id="course_name" />
            <Input label="Task title" {...register('title')} error={errors.title?.message} id="task_title" />
            <div className="space-y-1">
                <label className="block text-sm font-medium" htmlFor="task_desc">Description</label>
                <textarea
                    id="task_desc"
                    {...register('description')}
                    rows={3}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
            </div>
            <Input label="Deadline" type="datetime-local" {...register('deadline')} error={errors.deadline?.message} id="task_deadline" />
            <Button type="submit" className="w-full" loading={isLoading}>Save task</Button>
        </form>
    )
}

// ── Completion viewer drawer ───────────────────────────────────
function CompletionDrawer({ task, onClose }: { task: TaskWithCompletions | null; onClose: () => void }) {
    const { data: students = [], isLoading } = useTaskCompletionDetail(task?.id ?? null)
    const done = students.filter((s) => s.completed_at !== null)
    const notDone = students.filter((s) => s.completed_at === null)

    return (
        <AnimatePresence>
            {task && (
                <>
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                    />
                    <motion.div
                        key="drawer"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-border bg-card shadow-2xl"
                    >
                        <div className="flex items-start justify-between border-b border-border p-5">
                            <div className="min-w-0 pr-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{task.course_name}</p>
                                <h2 className="mt-0.5 truncate text-base font-bold">{task.title}</h2>
                                <p className="mt-1 text-xs text-muted-foreground">{done.length}/{students.length} students selesai</p>
                            </div>
                            <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent transition-colors shrink-0">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-5">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-10 text-muted-foreground">
                                    <Loader2 size={18} className="animate-spin mr-2" />Memuat…
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                                            <CheckCircle2 size={15} />Sudah mengerjakan ({done.length})
                                        </h3>
                                        {done.length === 0
                                            ? <p className="text-xs text-muted-foreground italic">Belum ada yang mengerjakan</p>
                                            : <ul className="space-y-2">
                                                {done.map((s) => (
                                                    <li key={s.id} className="flex items-center gap-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2">
                                                        {s.avatar_url
                                                            ? <img src={s.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                                                            : <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">{s.name?.charAt(0) ?? '?'}</div>
                                                        }
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-sm font-medium">{s.name ?? 'Unknown'}</p>
                                                            <p className="text-xs text-muted-foreground">{format(new Date(s.completed_at!), 'MMM d, HH:mm')}</p>
                                                        </div>
                                                        <CheckCircle2 size={15} className="shrink-0 text-emerald-500" />
                                                    </li>
                                                ))}
                                            </ul>
                                        }
                                    </div>

                                    <div>
                                        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-rose-500">
                                            <XCircle size={15} />Belum mengerjakan ({notDone.length})
                                        </h3>
                                        {notDone.length === 0
                                            ? <p className="text-xs text-muted-foreground italic">Semua sudah mengerjakan 🎉</p>
                                            : <ul className="space-y-2">
                                                {notDone.map((s) => (
                                                    <li key={s.id} className="flex items-center gap-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 px-3 py-2">
                                                        {s.avatar_url
                                                            ? <img src={s.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                                                            : <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 text-xs font-bold text-rose-500">{s.name?.charAt(0) ?? '?'}</div>
                                                        }
                                                        <p className="truncate text-sm font-medium">{s.name ?? 'Unknown'}</p>
                                                        <XCircle size={15} className="ml-auto shrink-0 text-rose-400" />
                                                    </li>
                                                ))}
                                            </ul>
                                        }
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

// ── Column helper ──────────────────────────────────────────────
const col = createColumnHelper<TaskWithCompletions>()

// ── Main component ─────────────────────────────────────────────
function AdminDashboardContent() {
    const [page, setPage] = useState(0)
    const { data, isLoading } = useAdminTasks(page)
    const tasks = data?.tasks ?? []
    const total = data?.total ?? 0
    const totalPages = Math.ceil(total / PAGE_SIZE)

    useRealtimeCompletions()

    const updateTask = useUpdateTask()
    const deleteTask = useDeleteTask()

    const [editTask, setEditTask] = useState<TaskWithCompletions | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<TaskWithCompletions | null>(null)
    const [viewTask, setViewTask] = useState<TaskWithCompletions | null>(null)
    const [sorting, setSorting] = useState<SortingState>([])

    const columns = useMemo(() => [
        col.accessor('course_name', {
            header: 'Course',
            enableSorting: true,
            cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
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
                return <span className={`text-sm ${isPast ? 'text-destructive' : 'text-foreground'}`}>{format(d, 'MMM d, yyyy · HH:mm')}</span>
            },
        }),
        col.accessor('completions_count', {
            header: 'Selesai',
            enableSorting: true,
            cell: ({ getValue, row }) => (
                <button
                    onClick={() => setViewTask(row.original)}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold hover:bg-accent transition-colors"
                    title="Lihat detail"
                >
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    {getValue()}
                </button>
            ),
        }),
        col.display({
            id: 'actions',
            header: 'Aksi',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setViewTask(row.original)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        title="Lihat detail"
                    ><CheckCircle2 size={15} /></button>
                    <button
                        id={`edit-${row.original.id}`}
                        onClick={() => setEditTask(row.original)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        title="Edit"
                    ><Pencil size={15} /></button>
                    <button
                        id={`delete-${row.original.id}`}
                        onClick={() => setDeleteTarget(row.original)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        title="Delete"
                    ><Trash2 size={15} /></button>
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
        manualPagination: true,
        pageCount: totalPages,
    })

    function toDatetimeLocal(iso: string) {
        return format(new Date(iso), "yyyy-MM-dd'T'HH:mm")
    }

    return (
        <>
            <CompletionDrawer task={viewTask} onClose={() => setViewTask(null)} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Task Management</h1>
                        <p className="text-sm text-muted-foreground">{total} task{total !== 1 ? 's' : ''} in your class</p>
                    </div>
                    <Link
                        id="create-task-btn"
                        to="/admin/create-task"
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 h-10"
                    >
                        <Plus size={16} />New task
                    </Link>
                </div>

                {/* Table */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                        <Loader2 size={16} className="animate-spin mr-2" />Loading tasks…
                    </div>
                ) : tasks.length === 0 && page === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
                        <p className="text-muted-foreground text-sm">No tasks yet</p>
                        <Link
                            to="/admin/create-task"
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-transparent px-4 text-sm font-semibold transition-all hover:bg-accent h-10"
                        >
                            <Plus size={14} />Create your first task
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
                                                className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground ${header.column.getCanSort() ? 'cursor-pointer select-none' : ''}`}
                                                onClick={header.column.getToggleSortingHandler()}
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                    {header.column.getCanSort() && <SortIcon sorted={header.column.getIsSorted()} />}
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

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between border-t border-border px-4 py-3">
                                <p className="text-xs text-muted-foreground">
                                    Halaman {page + 1} dari {totalPages} ({total} task)
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                                        disabled={page === 0}
                                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
                                    ><ChevronLeft size={16} /></button>
                                    <button
                                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                                        disabled={page >= totalPages - 1}
                                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
                                    ><ChevronRight size={16} /></button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Edit dialog */}
                <Dialog open={!!editTask} onClose={() => setEditTask(null)} title="Edit task" description="Update the task details.">
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
                <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete task" description="This action cannot be undone.">
                    <p className="mb-6 text-sm text-muted-foreground">
                        Are you sure you want to delete <span className="font-semibold text-foreground">"{deleteTarget?.title}"</span>?
                        All student completions will also be deleted.
                    </p>
                    <div className="flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            className="flex-1"
                            loading={deleteTask.isPending}
                            onClick={async () => {
                                if (!deleteTarget) return
                                await deleteTask.mutateAsync(deleteTarget.id)
                                setDeleteTarget(null)
                            }}
                        >Delete</Button>
                    </div>
                </Dialog>
            </div>
        </>
    )
}

export default function AdminDashboardPage() {
    return (
        <ErrorBoundary>
            <AdminDashboardContent />
        </ErrorBoundary>
    )
}
