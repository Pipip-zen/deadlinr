import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Clock, AlertTriangle, Plus, MoreVertical, Trash2, Edit2, Loader2, ClipboardList, Check, ChevronsUpDown } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { useReactTable, getCoreRowModel, getFilteredRowModel, getSortedRowModel, type ColumnDef, type SortingState, type ColumnFiltersState } from '@tanstack/react-table'

import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/useTasks'
import { useMarkTaskDone } from '@/hooks/useMarkTaskDone'
import { useCourses } from '@/hooks/useCourses'
import { AddCourseDialog } from '@/components/courses/AddCourseDialog'
import type { TaskWithStatus } from '@/hooks/useTasks'
import { useAuthStore } from '@/lib/store'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

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
    course_id: z.string().min(1, 'Course is required'),
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

    const { courses = [], isLoading: isLoadingCourses } = useCourses()
    const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false)

    // Selection State
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])

    // Table Filters & Sorting States
    const [sorting, setSorting] = useState<SortingState>([{ id: 'created_at', desc: true }])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

    // Combobox State
    const [courseComboOpen, setCourseComboOpen] = useState(false)
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingTask, setEditingTask] = useState<TaskWithStatus | null>(null)
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<TaskWithStatus | null>(null)

    const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<TaskFormValues>({
        resolver: zodResolver(taskSchema),
        defaultValues: { course_id: '', title: '', description: '', deadline: '' }
    })

    const openCreateDialog = () => {
        setEditingTask(null)
        reset({ course_id: '', title: '', description: '', deadline: '' })
        setDialogOpen(true)
    }

    const openEditDialog = (task: TaskWithStatus) => {
        setEditingTask(task)
        const dt = new Date(task.deadline).toISOString().slice(0, 16)
        setValue('id', task.id)
        setValue('course_id', task.course_id ?? '')
        setValue('title', task.title)
        setValue('description', task.description || '')
        setValue('deadline', dt)
        setDialogOpen(true)
    }

    async function onFormSubmit(data: TaskFormValues) {
        try {
            if (editingTask && data.id) {
                await updateTask.mutateAsync({
                    ...data,
                    id: data.id,
                    deadline: new Date(data.deadline).toISOString()
                })
                toast.success('Task updated successfully')
            } else {
                await createTask.mutateAsync({
                    ...data,
                    deadline: new Date(data.deadline).toISOString()
                })
                toast.success('Task added successfully')
            }
            setDialogOpen(false)
        } catch {
            toast.error(editingTask ? 'Failed to update task' : 'Failed to add task')
        }
    }

    // Handlers for selection
    const toggleSelection = (taskId: string) => {
        setSelectedTaskIds(prev =>
            prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
        )
    }
    const executeBulkDone = async () => {
        try {
            await markDone.mutateAsync(selectedTaskIds)
            setSelectedTaskIds([])
        } catch {
            // Error handled by hook
        }
    }

    // TanStack Table setup
    const columns = useMemo<ColumnDef<TaskWithStatus>[]>(() => [
        {
            accessorKey: 'course_id',
            header: 'Course',
            accessorFn: (row) => row.course_id ?? 'uncategorized',
            filterFn: 'equals'
        },
        {
            accessorKey: 'course', // For sorting course A-Z visually
            accessorFn: (row) => row.course?.name ?? '',
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

    // Filter Accessors
    const currentCourseFilter = (table.getColumn('course_id')?.getFilterValue() as string) ?? 'all'
    const currentStatusFilter = (table.getColumn('status')?.getFilterValue() as string) ?? 'all'

    // Determine the sorting dropdown value based on state
    const currentSortValue = useMemo(() => {
        if (!sorting.length) return 'newest'
        const { id, desc } = sorting[0]
        if (id === 'created_at' && desc) return 'newest'
        if (id === 'created_at' && !desc) return 'oldest'
        if (id === 'deadline' && !desc) return 'dl_nearest'
        if (id === 'deadline' && desc) return 'dl_furthest'
        if (id === 'course' && !desc) return 'course_az'
        return 'newest'
    }, [sorting])

    const setSortDropdown = (val: string) => {
        switch (val) {
            case 'newest': setSorting([{ id: 'created_at', desc: true }]); break;
            case 'oldest': setSorting([{ id: 'created_at', desc: false }]); break;
            case 'dl_nearest': setSorting([{ id: 'deadline', desc: false }]); break;
            case 'dl_furthest': setSorting([{ id: 'deadline', desc: true }]); break;
            case 'course_az': setSorting([{ id: 'course', desc: false }]); break;
        }
    }

    const activeFilterCount = (currentCourseFilter !== 'all' ? 1 : 0) + (currentStatusFilter !== 'all' ? 1 : 0)

    const clearFilters = () => {
        setColumnFilters([])
    }

    const { rows } = table.getRowModel()

    return (
        <div className="mx-auto max-w-5xl space-y-8 pb-32 pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Your Tasks</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Manage everything across all your courses.</p>
                </div>
                <Button onClick={openCreateDialog} className="hidden shrink-0 group sm:flex">
                    <Plus size={16} className="mr-2 transition-transform group-hover:rotate-90" />
                    Add Task
                </Button>
            </div>

            {/* Mobile FAB */}
            <Button
                onClick={openCreateDialog}
                className="fixed bottom-20 right-6 z-40 h-14 w-14 rounded-full shadow-lg sm:hidden"
                size="icon"
            >
                <Plus size={24} />
            </Button>

            {/* Filters Bar */}
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Mobile Filter Expander */}
                <div className="sm:hidden flex items-center justify-between">
                    <Button variant="outline" size="sm" onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}>
                        Filters
                        {activeFilterCount > 0 && <Badge className="ml-2 px-1.5 min-w-5">{activeFilterCount}</Badge>}
                    </Button>
                    <Select value={currentSortValue} onValueChange={setSortDropdown}>
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Newest first</SelectItem>
                            <SelectItem value="oldest">Oldest first</SelectItem>
                            <SelectItem value="dl_nearest">Deadline nearest</SelectItem>
                            <SelectItem value="dl_furthest">Deadline furthest</SelectItem>
                            <SelectItem value="course_az">Course A-Z</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center w-full", mobileFiltersOpen ? "flex" : "hidden sm:flex")}>
                    {/* Status Filter */}
                    <div className="w-full sm:w-40">
                        <Select
                            value={currentStatusFilter}
                            onValueChange={(val) => table.getColumn('status')?.setFilterValue(val === 'all' ? undefined : val)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Status: All" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="done">Completed</SelectItem>
                                <SelectItem value="overdue">Overdue</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Course Filter (Combobox if > 5) */}
                    <div className="w-full sm:w-64">
                        {courses.length > 5 ? (
                            <Popover open={courseComboOpen} onOpenChange={setCourseComboOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={courseComboOpen}
                                        className="w-full justify-between bg-transparent font-normal"
                                    >
                                        {currentCourseFilter === 'all'
                                            ? "All Courses"
                                            : courses.find((course) => course.id === currentCourseFilter)?.code || "Uncategorized"}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-full p-0 sm:w-64">
                                    <Command>
                                        <CommandInput placeholder="Search course..." />
                                        <CommandList>
                                            <CommandEmpty>No course found.</CommandEmpty>
                                            <CommandGroup>
                                                <CommandItem
                                                    onSelect={() => {
                                                        table.getColumn('course_id')?.setFilterValue(undefined)
                                                        setCourseComboOpen(false)
                                                    }}
                                                >
                                                    <Check className={cn("mr-2 h-4 w-4", currentCourseFilter === 'all' ? "opacity-100" : "opacity-0")} />
                                                    All Courses
                                                </CommandItem>
                                                {courses.map((course) => (
                                                    <CommandItem
                                                        key={course.id}
                                                        onSelect={() => {
                                                            table.getColumn('course_id')?.setFilterValue(course.id)
                                                            setCourseComboOpen(false)
                                                        }}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", currentCourseFilter === course.id ? "opacity-100" : "opacity-0")} />
                                                        {course.code}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        ) : (
                            <Select
                                value={currentCourseFilter}
                                onValueChange={(val) => table.getColumn('course_id')?.setFilterValue(val === 'all' ? undefined : val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Course: All" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Courses</SelectItem>
                                    {courses.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    {/* Desktop Sort Dropdown */}
                    <div className="hidden sm:block ml-auto w-48">
                        <Select value={currentSortValue} onValueChange={setSortDropdown}>
                            <SelectTrigger>
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="newest">Newest first</SelectItem>
                                <SelectItem value="oldest">Oldest first</SelectItem>
                                <SelectItem value="dl_nearest">Deadline nearest</SelectItem>
                                <SelectItem value="dl_furthest">Deadline furthest</SelectItem>
                                <SelectItem value="course_az">Course A-Z</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Empty States & Task List */}
            {isLoading ? (
                <div className="flex h-40 items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-muted-foreground" />
                </div>
            ) : tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
                    <ClipboardList size={56} className="mb-4 text-muted-foreground/30" />
                    <h3 className="text-lg font-semibold">No tasks yet</h3>
                    <p className="mt-1 text-sm text-muted-foreground mb-4">You're completely caught up. Start by adding a task.</p>
                    <Button onClick={openCreateDialog}>Add your first task</Button>
                </div>
            ) : rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
                    <AlertTriangle size={56} className="mb-4 text-muted-foreground/30" />
                    <h3 className="text-lg font-semibold">No tasks match your filters</h3>
                    <p className="mt-1 text-sm text-muted-foreground mb-4">Try adjusting or removing some filters to see your tasks.</p>
                    <Button variant="outline" onClick={clearFilters}>Clear filters</Button>
                </div>
            ) : (
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <AnimatePresence mode="popLayout">
                        {rows.map(row => {
                            const task = row.original
                            const cfg = STATUS_CONFIG[task.status]
                            const Icon = cfg.icon
                            const isDone = task.status === 'done'
                            const isSelected = selectedTaskIds.includes(task.id)

                            return (
                                <motion.li
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                                    key={task.id}
                                    className={cn("flex flex-col justify-between rounded-2xl border-l-4 border-t border-r border-b px-5 py-4 shadow-sm transition-all duration-300", cfg.border, cfg.bg, isSelected && "ring-2 ring-primary bg-primary/5 dark:bg-primary/20")}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            {!isDone && (
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => toggleSelection(task.id)}
                                                    className="mr-1 h-5 w-5 data-[state=checked]:bg-primary"
                                                />
                                            )}
                                            <div className={cn("shrink-0", cfg.iconCls, isDone && "ml-1")}>
                                                <Icon size={18} />
                                            </div>
                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cfg.badgeCls}`}>
                                                {cfg.badge}
                                            </span>
                                        </div>
                                        <TaskActions task={task} onEdit={openEditDialog} onDelete={setDeleteConfirmOpen} />
                                    </div>

                                    <div className="my-4 flex-1">
                                        {task.course && (
                                            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border/40 px-2 py-0.5 text-xs font-semibold shadow-sm" style={{ backgroundColor: `${task.course.color}15`, color: task.course.color }}>
                                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: task.course.color }} />
                                                <span title={task.course.name}>{task.course.code}</span>
                                            </div>
                                        )}
                                        <p className={`font-semibold text-lg leading-tight ${isDone ? 'text-muted-foreground line-through' : ''}`}>
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
                                                loading={markDone.isPending}
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

            {/* Bulk Actions Floating Bar */}
            <AnimatePresence>
                {selectedTaskIds.length > 0 && (
                    <motion.div
                        initial={{ y: 120, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 120, opacity: 0 }}
                        className="fixed bottom-6 left-1/2 z-50 flex w-[90%] sm:w-auto -translate-x-1/2 items-center justify-between sm:justify-center gap-4 rounded-full bg-foreground px-6 py-4 text-background shadow-2xl"
                    >
                        <span className="text-sm font-semibold">{selectedTaskIds.length} task{selectedTaskIds.length > 1 ? 's' : ''} selected</span>
                        <div className="flex items-center gap-2">
                            <Button size="sm" variant="default" className="h-8 shadow-sm" onClick={executeBulkDone} loading={markDone.isPending}>
                                Mark as Done
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => setSelectedTaskIds([])}>
                                Cancel
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>


            {/* Add / Edit Task Dialog */}
            <Dialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                title={editingTask ? 'Edit Task' : 'Add New Task'}
                description="Enter task details below."
            >
                <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-muted-foreground">Course Name</label>
                            {courses.length === 0 && !isLoadingCourses ? (
                                <div className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-center">
                                    <p className="text-xs text-muted-foreground mb-2">You need a course to add tasks to.</p>
                                    <Button type="button" size="sm" variant="outline" onClick={() => setIsCourseDialogOpen(true)} className="h-7 text-xs">Add a Course First</Button>
                                </div>
                            ) : (
                                <select
                                    {...register('course_id')}
                                    className="w-full rounded-md border border-input bg-transparent px-3 py-[9px] text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                >
                                    <option value="" disabled>Select a course</option>
                                    {isLoadingCourses ? (
                                        <option disabled>Loading courses...</option>
                                    ) : (
                                        courses?.map((c: any) => (
                                            <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                                        ))
                                    )}
                                </select>
                            )}
                            {errors.course_id && <p className="mt-1 text-xs text-red-500">{errors.course_id.message}</p>}
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

            <AddCourseDialog open={isCourseDialogOpen} onOpenChange={setIsCourseDialogOpen} />

            {/* Delete Confirmation Alert Dialog */}
            {deleteConfirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
                        <h2 className="text-lg font-bold">Delete Task?</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Are you sure you want to delete the task <span className="font-semibold text-foreground">"{deleteConfirmOpen.title}"</span>? This action cannot be undone.
                        </p>
                        <div className="mt-6 flex justify-end gap-3">
                            <Button variant="ghost" onClick={() => setDeleteConfirmOpen(null)}>Cancel</Button>
                            <Button
                                variant="destructive"
                                loading={deleteTask.isPending}
                                onClick={async () => {
                                    try {
                                        await deleteTask.mutateAsync(deleteConfirmOpen.id)
                                        setDeleteConfirmOpen(null)
                                    } catch {
                                        toast.error("Failed to delete task")
                                    }
                                }}
                            >
                                Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}
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
