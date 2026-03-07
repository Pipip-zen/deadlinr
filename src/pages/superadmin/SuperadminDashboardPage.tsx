import { useState, useMemo } from 'react'
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    flexRender,
    createColumnHelper,
    type SortingState,
} from '@tanstack/react-table'
import { motion, AnimatePresence } from 'framer-motion'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import {
    Users,
    BookOpen,
    ListTodo,
    Plus,
    Trash2,
    UserMinus,
    UserPlus,
    ChevronUp,
    ChevronDown,
    ChevronsUpDown,
} from 'lucide-react'

import {
    useSuperadminStats,
    useSuperadminClasses,
    useSuperadminAdmins,
    useCreateClass,
    useDeleteClass,
    useAssignAdmin,
    useRevokeAdmin,
    type ClassRow,
    type AdminRow,
} from '@/hooks/useSuperadmin'
import { useClasses } from '@/hooks/useClasses'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Avatar } from '@/components/ui/avatar'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'

// ── Zod Schemas ───────────────────────────────────────────────

const createClassSchema = z.object({
    name: z.string().min(1, 'Class name is required'),
})

const assignAdminSchema = z.object({
    email: z.string().email('Invalid email address'),
    classId: z.string().min(1, 'Please select a class'),
})

// ── Sort Icon ─────────────────────────────────────────────────

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
    if (!sorted) return <ChevronsUpDown size={13} className="text-muted-foreground" />
    return sorted === 'asc'
        ? <ChevronUp size={13} className="text-primary" />
        : <ChevronDown size={13} className="text-primary" />
}

// ── Badge Component ───────────────────────────────────────────

function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'outline' }) {
    const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
    const variants = {
        default: "bg-primary/10 text-primary",
        outline: "border border-border text-foreground"
    }
    return <span className={`${base} ${variants[variant]}`}>{children}</span>
}

// ── Class Column Helper ───────────────────────────────────────
const classCol = createColumnHelper<ClassRow>()

// ── Admin Column Helper ───────────────────────────────────────
const adminCol = createColumnHelper<AdminRow>()

// ── Main Page Component ───────────────────────────────────────

function SuperadminDashboardContent() {
    // Queries
    const { data: stats } = useSuperadminStats()
    const { data: classes = [], isLoading: classesLoading } = useSuperadminClasses()
    const { data: admins = [], isLoading: adminsLoading } = useSuperadminAdmins()
    const { data: classOptions = [] } = useClasses() // For dropdown

    // Mutations
    const createClassMut = useCreateClass()
    const deleteClassMut = useDeleteClass()
    const assignAdminMut = useAssignAdmin()
    const revokeAdminMut = useRevokeAdmin()

    // State
    const [classSorting, setClassSorting] = useState<SortingState>([])
    const [adminSorting, setAdminSorting] = useState<SortingState>([])

    // Dialogs
    const [createClassOpen, setCreateClassOpen] = useState(false)
    const [deleteClassId, setDeleteClassId] = useState<string | null>(null)

    const [assignAdminOpen, setAssignAdminOpen] = useState(false)
    const [revokeAdminId, setRevokeAdminId] = useState<string | null>(null)

    // Forms
    const classForm = useForm<z.infer<typeof createClassSchema>>({
        resolver: zodResolver(createClassSchema),
        defaultValues: { name: '' },
    })

    const adminForm = useForm<z.infer<typeof assignAdminSchema>>({
        resolver: zodResolver(assignAdminSchema),
        defaultValues: { email: '', classId: '' },
    })

    // Handlers
    const handleCreateClass = async (v: z.infer<typeof createClassSchema>) => {
        await createClassMut.mutateAsync(v.name)
        setCreateClassOpen(false)
        classForm.reset()
    }

    const handleAssignAdmin = async (v: z.infer<typeof assignAdminSchema>) => {
        await assignAdminMut.mutateAsync({ email: v.email, classId: v.classId })
        setAssignAdminOpen(false)
        adminForm.reset()
    }

    // ── Class Table Def ───────────────────────────────────────────
    const classColumns = useMemo(() => [
        classCol.accessor('name', {
            header: 'Class Name',
            enableSorting: true,
            cell: ({ getValue }) => <span className="font-semibold">{getValue()}</span>,
        }),
        classCol.accessor('created_at', {
            header: 'Created',
            enableSorting: true,
            cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{format(new Date(getValue()), 'MMM d, yyyy')}</span>,
        }),
        classCol.accessor('student_count', {
            header: 'Students',
            enableSorting: true,
            cell: ({ getValue }) => <Badge variant="outline">{getValue()} students</Badge>,
        }),
        classCol.accessor('task_count', {
            header: 'Tasks',
            enableSorting: true,
            cell: ({ getValue }) => <Badge variant="outline">{getValue()} tasks</Badge>,
        }),
        classCol.display({
            id: 'actions',
            header: '',
            cell: ({ row }) => (
                <div className="flex justify-end pr-2">
                    <button
                        onClick={() => setDeleteClassId(row.original.id)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        title="Delete class"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        })
    ], [])

    const classTable = useReactTable({
        data: classes,
        columns: classColumns,
        state: { sorting: classSorting },
        onSortingChange: setClassSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    })

    // ── Admin Table Def ───────────────────────────────────────────
    const adminColumns = useMemo(() => [
        adminCol.accessor('name', {
            header: 'Admin',
            enableSorting: true,
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <Avatar src={row.original.avatar_url} fallback={row.original.name ?? '?'} size="sm" />
                    <span className="font-medium">{row.original.name ?? 'Anonymous'}</span>
                </div>
            ),
        }),
        adminCol.accessor('class_name', {
            header: 'Assigned Class',
            enableSorting: true,
            cell: ({ getValue }) => {
                const c = getValue()
                return c ? <Badge>{c}</Badge> : <span className="text-xs text-muted-foreground">Unassigned</span>
            },
        }),
        adminCol.display({
            id: 'actions',
            header: '',
            cell: ({ row }) => (
                <div className="flex justify-end pr-2">
                    <button
                        onClick={() => setRevokeAdminId(row.original.id)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        title="Revoke admin rights"
                    >
                        <UserMinus size={16} />
                    </button>
                </div>
            )
        })
    ], [])

    const adminTable = useReactTable({
        data: admins,
        columns: adminColumns,
        state: { sorting: adminSorting },
        onSortingChange: setAdminSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    })

    // ── Render ───────────────────────────────────────────────────
    return (
        <div className="space-y-8 pb-12">
            <div>
                <h1 className="text-2xl font-bold">Superadmin Overview</h1>
                <p className="text-sm text-muted-foreground">System-wide statistics and management</p>
            </div>

            {/* ── Stats Row ── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-primary mb-2">
                        <BookOpen size={18} />
                        <h3 className="font-semibold">Total Classes</h3>
                    </div>
                    <p className="text-3xl font-bold">{stats?.totalClasses ?? 0}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-blue-500 mb-2">
                        <Users size={18} />
                        <h3 className="font-semibold">Total Students</h3>
                    </div>
                    <p className="text-3xl font-bold">{stats?.totalStudents ?? 0}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-emerald-500 mb-2">
                        <ListTodo size={18} />
                        <h3 className="font-semibold">Total Tasks</h3>
                    </div>
                    <p className="text-3xl font-bold">{stats?.totalTasks ?? 0}</p>
                </div>
            </div>

            {/* ── Classes Section ── */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">Classes</h2>
                    <Button onClick={() => setCreateClassOpen(true)} size="sm">
                        <Plus size={16} className="mr-2" /> New Class
                    </Button>
                </div>

                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                        <thead>
                            {classTable.getHeaderGroups().map(hg => (
                                <tr key={hg.id} className="border-b border-border bg-muted/40 text-left">
                                    {hg.headers.map(h => (
                                        <th key={h.id} className="px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wide text-xs">
                                            <div
                                                className={`flex items-center gap-1.5 ${h.column.getCanSort() ? 'cursor-pointer select-none' : ''}`}
                                                onClick={h.column.getToggleSortingHandler()}
                                            >
                                                {flexRender(h.column.columnDef.header, h.getContext())}
                                                {h.column.getCanSort() && <SortIcon sorted={h.column.getIsSorted()} />}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {classesLoading ? (
                                <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Loading classes...</td></tr>
                            ) : classes.length === 0 ? (
                                <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No classes found</td></tr>
                            ) : (
                                <AnimatePresence initial={false}>
                                    {classTable.getRowModel().rows.map(row => (
                                        <motion.tr
                                            key={row.original.id}
                                            layout
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                                        >
                                            {row.getVisibleCells().map(cell => (
                                                <td key={cell.id} className="px-4 py-3">
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </td>
                                            ))}
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Admins Section ── */}
            <div className="space-y-4">
                <div className="flex items-center justify-between pt-4">
                    <h2 className="text-xl font-bold">Class Admins</h2>
                    <Button onClick={() => setAssignAdminOpen(true)} size="sm" variant="outline">
                        <UserPlus size={16} className="mr-2" /> Assign Admin
                    </Button>
                </div>

                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                        <thead>
                            {adminTable.getHeaderGroups().map(hg => (
                                <tr key={hg.id} className="border-b border-border bg-muted/40 text-left">
                                    {hg.headers.map(h => (
                                        <th key={h.id} className="px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wide text-xs">
                                            <div
                                                className={`flex items-center gap-1.5 ${h.column.getCanSort() ? 'cursor-pointer select-none' : ''}`}
                                                onClick={h.column.getToggleSortingHandler()}
                                            >
                                                {flexRender(h.column.columnDef.header, h.getContext())}
                                                {h.column.getCanSort() && <SortIcon sorted={h.column.getIsSorted()} />}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {adminsLoading ? (
                                <tr><td colSpan={3} className="py-8 text-center text-muted-foreground">Loading admins...</td></tr>
                            ) : admins.length === 0 ? (
                                <tr><td colSpan={3} className="py-8 text-center text-muted-foreground">No admins assigned yet</td></tr>
                            ) : (
                                <AnimatePresence initial={false}>
                                    {adminTable.getRowModel().rows.map(row => (
                                        <motion.tr
                                            key={row.original.id}
                                            layout
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                                        >
                                            {row.getVisibleCells().map(cell => (
                                                <td key={cell.id} className="px-4 py-3">
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </td>
                                            ))}
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Dialogs ── */}

            <Dialog open={createClassOpen} onClose={() => setCreateClassOpen(false)} title="Create New Class">
                <form onSubmit={classForm.handleSubmit(handleCreateClass)} className="space-y-4">
                    <Input
                        label="Class Name"
                        placeholder="e.g. Computer Science 101"
                        {...classForm.register('name')}
                        error={classForm.formState.errors.name?.message}
                    />
                    <Button type="submit" className="w-full" loading={createClassMut.isPending}>Create Class</Button>
                </form>
            </Dialog>

            <Dialog open={!!deleteClassId} onClose={() => setDeleteClassId(null)} title="Delete Class" description="This cannot be undone.">
                <p className="text-sm text-muted-foreground mb-6">
                    Are you completely sure? This will cascade and delete all tasks and completions for this class.
                </p>
                <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setDeleteClassId(null)}>Cancel</Button>
                    <Button variant="destructive" className="flex-1" loading={deleteClassMut.isPending} onClick={async () => {
                        if (deleteClassId) await deleteClassMut.mutateAsync(deleteClassId)
                        setDeleteClassId(null)
                    }}>Yes, delete</Button>
                </div>
            </Dialog>

            <Dialog open={assignAdminOpen} onClose={() => setAssignAdminOpen(false)} title="Assign Admin">
                <form onSubmit={adminForm.handleSubmit(handleAssignAdmin)} className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                        The user must have already signed in with Google at least once so their email exists in the system.
                    </p>
                    <Input
                        label="User Email"
                        type="email"
                        placeholder="teacher@school.edu"
                        {...adminForm.register('email')}
                        error={adminForm.formState.errors.email?.message}
                    />
                    <Select
                        label="Assign to Class"
                        {...adminForm.register('classId')}
                        error={adminForm.formState.errors.classId?.message}
                        options={classOptions.map(c => ({ value: c.id, label: c.name }))}
                        placeholder="Select a class..."
                    />
                    <Button type="submit" className="w-full mt-2" loading={assignAdminMut.isPending}>Assign Admin Role</Button>
                </form>
            </Dialog>

            <Dialog open={!!revokeAdminId} onClose={() => setRevokeAdminId(null)} title="Revoke Admin Rights">
                <p className="text-sm text-muted-foreground mb-6">
                    Are you sure? This user will become a regular student and lose access to task management.
                </p>
                <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setRevokeAdminId(null)}>Cancel</Button>
                    <Button variant="destructive" className="flex-1" loading={revokeAdminMut.isPending} onClick={async () => {
                        if (revokeAdminId) await revokeAdminMut.mutateAsync(revokeAdminId)
                        setRevokeAdminId(null)
                    }}>Revoke Access</Button>
                </div>
            </Dialog>

        </div>
    )
}

export default function SuperadminDashboardPage() {
    return (
        <ErrorBoundary>
            <SuperadminDashboardContent />
        </ErrorBoundary>
    )
}
