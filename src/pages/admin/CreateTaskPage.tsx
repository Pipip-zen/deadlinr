import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { PlusSquare } from 'lucide-react'

import { useCreateTask, type TaskFormValues } from '@/hooks/useAdminTasks'
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

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<TaskFormValues>({
        resolver: zodResolver(taskSchema),
        defaultValues: { course_name: '', title: '', description: '', deadline: '' },
    })

    const onSubmit = async (values: TaskFormValues) => {
        await createTask.mutateAsync(values)
        navigate('/admin/dashboard')
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

                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium" htmlFor="task_desc">
                                Description <span className="text-muted-foreground">(optional)</span>
                            </label>
                            <textarea
                                id="task_desc"
                                {...register('description')}
                                rows={4}
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
