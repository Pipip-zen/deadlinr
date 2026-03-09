import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { PlusSquare, Plus, X, Loader2 } from 'lucide-react'
import { useState } from 'react'

import { useCreateTask, type TaskFormValues } from '@/hooks/useAdminTasks'
import { useCourses, useAddCourse, useDeleteCourse } from '@/hooks/useCourses'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'

const taskSchema = z.object({
    course_name: z.string().min(1, 'Course name is required'),
    title: z.string().min(1, 'Title is required'),
    description: z.string(),
    deadline: z.string().min(1, 'Deadline is required'),
})

function CreateTaskContent() {
    const navigate = useNavigate()
    const createTask = useCreateTask()

    const { data: courses = [], isLoading: coursesLoading } = useCourses()
    const addCourse = useAddCourse()
    const deleteCourse = useDeleteCourse()

    const presetCourses = courses.filter((c) => c.is_preset)
    const customCourses = courses.filter((c) => !c.is_preset)

    const [addingCustom, setAddingCustom] = useState(false)
    const [customInput, setCustomInput] = useState('')

    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
    } = useForm<TaskFormValues>({
        resolver: zodResolver(taskSchema),
        defaultValues: { course_name: '', title: '', description: '', deadline: '' },
    })

    const onSubmit = async (values: TaskFormValues) => {
        await createTask.mutateAsync(values)
        navigate('/admin/dashboard')
    }

    const handleAddCustom = async () => {
        const trimmed = customInput.trim()
        if (!trimmed) return
        await addCourse.mutateAsync(trimmed)
        setCustomInput('')
        setAddingCustom(false)
    }

    return (
        <div className="flex min-h-full items-center justify-center py-12">
            <div className="w-full max-w-xl space-y-8">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <PlusSquare size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight">Create Task</h1>
                        <p className="text-sm text-muted-foreground">Add a new assignment for your class</p>
                    </div>
                </div>

                {/* Form card */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="rounded-3xl border border-border bg-card/60 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.05)] backdrop-blur-xl"
                >
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

                        {/* Course Name Dropdown */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-foreground" htmlFor="course_name">
                                Course name
                            </label>

                            {coursesLoading ? (
                                <div className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 size={14} className="animate-spin" />
                                    Memuat mata kuliah…
                                </div>
                            ) : (
                                <Controller
                                    name="course_name"
                                    control={control}
                                    render={({ field }) => (
                                        <select
                                            {...field}
                                            id="course_name"
                                            className={`flex h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${errors.course_name ? 'border-destructive focus:ring-destructive' : 'border-border'
                                                }`}
                                        >
                                            <option value="">Pilih mata kuliah…</option>
                                            <optgroup label="Mata Kuliah TRM">
                                                {presetCourses.map((c) => (
                                                    <option key={c.id} value={c.name}>{c.name}</option>
                                                ))}
                                            </optgroup>
                                            {customCourses.length > 0 && (
                                                <optgroup label="Mata Kuliah Tambahan">
                                                    {customCourses.map((c) => (
                                                        <option key={c.id} value={c.name}>{c.name}</option>
                                                    ))}
                                                </optgroup>
                                            )}
                                        </select>
                                    )}
                                />
                            )}

                            {errors.course_name && (
                                <p className="text-xs text-destructive">{errors.course_name.message}</p>
                            )}

                            {/* Custom courses manager */}
                            <div className="pt-1">
                                {customCourses.length > 0 && (
                                    <div className="mb-2 flex flex-wrap gap-1.5">
                                        {customCourses.map((c) => (
                                            <span
                                                key={c.id}
                                                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium"
                                            >
                                                {c.name}
                                                <button
                                                    type="button"
                                                    onClick={() => deleteCourse.mutate(c.id)}
                                                    className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
                                                >
                                                    <X size={10} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {addingCustom ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            autoFocus
                                            value={customInput}
                                            onChange={(e) => setCustomInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') { e.preventDefault(); handleAddCustom() }
                                                if (e.key === 'Escape') { setAddingCustom(false); setCustomInput('') }
                                            }}
                                            placeholder="Nama mata kuliah baru…"
                                            className="h-8 flex-1 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                        <Button type="button" size="sm" onClick={handleAddCustom} loading={addCourse.isPending}>
                                            Add
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => { setAddingCustom(false); setCustomInput('') }}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setAddingCustom(true)}
                                        className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                                    >
                                        <Plus size={12} />
                                        Tambah mata kuliah…
                                    </button>
                                )}
                            </div>
                        </div>

                        <Input
                            label="Task title"
                            {...register('title')}
                            error={errors.title?.message}
                            placeholder="e.g. Chapter 5 exercises"
                            id="task_title"
                        />

                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium" htmlFor="task_desc">
                                Description <span className="text-muted-foreground">(optional)</span>
                            </label>
                            <textarea
                                id="task_desc"
                                {...register('description')}
                                rows={3}
                                placeholder="Additional context or instructions…"
                                className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>

                        <Input
                            label="Deadline"
                            type="datetime-local"
                            {...register('deadline')}
                            error={errors.deadline?.message}
                            id="task_deadline"
                        />

                        <div className="flex gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1"
                                onClick={() => navigate('/admin/dashboard')}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" className="flex-1" loading={createTask.isPending}>
                                Create Task
                            </Button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </div>
    )
}

export default function CreateTaskPage() {
    return (
        <ErrorBoundary>
            <CreateTaskContent />
        </ErrorBoundary>
    )
}
