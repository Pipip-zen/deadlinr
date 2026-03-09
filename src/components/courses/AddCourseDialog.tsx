import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { useCreateCourse, useUpdateCourse, type Course } from '@/hooks/useCourses'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const COURSE_COLORS = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#14b8a6', // teal
    '#3b82f6', // blue
    '#a855f7', // purple
    '#ec4899', // pink
]

const courseSchema = z.object({
    name: z.string().min(1, 'Course name is required'),
    code: z.string().min(1, 'Course code is required').max(10, 'Code max 10 chars'),
    color: z.string().min(1, 'Color is required'),
})

type CourseFormValues = z.infer<typeof courseSchema>

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    editingCourse?: Course | null
}

export function AddCourseDialog({ open, onOpenChange, editingCourse }: Props) {
    const createCourse = useCreateCourse()
    const updateCourse = useUpdateCourse()
    const isEditing = !!editingCourse

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<CourseFormValues>({
        resolver: zodResolver(courseSchema),
        defaultValues: {
            name: '',
            code: '',
            color: COURSE_COLORS[0],
        },
    })

    useEffect(() => {
        if (open) {
            if (editingCourse) {
                reset({
                    name: editingCourse.name,
                    code: editingCourse.code,
                    color: editingCourse.color,
                })
            } else {
                reset({
                    name: '',
                    code: '',
                    color: COURSE_COLORS[0],
                })
            }
        }
    }, [open, editingCourse, reset])

    const selectedColor = watch('color')

    async function onSubmit(data: CourseFormValues) {
        try {
            if (isEditing) {
                await updateCourse.mutateAsync({ id: editingCourse.id, ...data })
            } else {
                await createCourse.mutateAsync(data)
            }
            onOpenChange(false)
        } catch {
            // Error toast handled in hook
        }
    }

    function handleClose() {
        onOpenChange(false)
    }

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            title={isEditing ? 'Edit Course' : 'Add Course'}
            description={isEditing ? 'Update course details and tag color.' : 'Create a new personal course for tracking tasks.'}
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-2">
                <div className="space-y-2">
                    <label htmlFor="code" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Course Code</label>
                    <Input
                        id="code"
                        {...register('code')}
                        placeholder="e.g. CS101"
                        maxLength={10}
                    />
                    {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
                </div>

                <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Course Name</label>
                    <Input
                        id="name"
                        {...register('name')}
                        placeholder="e.g. Intro to Computer Science"
                    />
                    {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Course Color</label>
                    <div className="flex flex-wrap gap-3">
                        {COURSE_COLORS.map((hex) => (
                            <button
                                key={hex}
                                type="button"
                                onClick={() => setValue('color', hex, { shouldValidate: true })}
                                className={`flex h-8 w-8 items-center justify-center rounded-full transition-transform hover:scale-110 focus:outline-none ${selectedColor === hex ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                                style={{ backgroundColor: hex }}
                                aria-label={`Select color ${hex}`}
                            />
                        ))}
                        {/* Custom Color Input */}
                        <div className={`relative flex h-8 w-8 overflow-hidden rounded-full transition-transform hover:scale-110 ${!COURSE_COLORS.includes(selectedColor) ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}>
                            <input
                                type="color"
                                value={selectedColor}
                                onChange={(e) => setValue('color', e.target.value, { shouldValidate: true })}
                                className="absolute -inset-2 h-12 w-12 cursor-pointer border-0 p-0"
                                aria-label="Custom color picker"
                                title="Custom Color"
                            />
                        </div>
                    </div>
                    {errors.color && <p className="text-xs text-destructive">{errors.color.message}</p>}
                </div>

                <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={isSubmitting} loading={isSubmitting}>
                        {isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Add Course')}
                    </Button>
                </div>
            </form>
        </Dialog>
    )
}
