import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, MoreVertical, Edit2, Trash2, Book } from 'lucide-react'
import { useCourses, useDeleteCourse, type Course } from '@/hooks/useCourses'
import { AddCourseDialog } from '@/components/courses/AddCourseDialog'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
export function CoursesPage() {
    const { courses, isLoading } = useCourses()
    const deleteMutation = useDeleteCourse()

    const [isAddOpen, setIsAddOpen] = useState(false)
    const [editingCourse, setEditingCourse] = useState<Course | null>(null)
    const [deletingCourse, setDeletingCourse] = useState<string | null>(null)

    const handleDelete = async () => {
        if (!deletingCourse) return
        await deleteMutation.mutateAsync(deletingCourse)
        setDeletingCourse(null)
    }

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-5xl space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Courses</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Manage your personal courses and tags
                    </p>
                </div>
                <Button onClick={() => setIsAddOpen(true)} className="gap-2">
                    <Plus size={16} />
                    <span className="hidden sm:inline">Add Course</span>
                </Button>
            </div>

            {courses.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24 text-center">
                    <div className="mb-4 rounded-full bg-primary/10 p-4 text-primary">
                        <Book size={32} />
                    </div>
                    <h3 className="mb-2 text-xl font-bold">No courses yet</h3>
                    <p className="mb-6 max-w-sm text-sm text-muted-foreground">
                        Create your first course to start categorizing your tasks and assignments.
                    </p>
                    <Button onClick={() => setIsAddOpen(true)}>Create Course</Button>
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <AnimatePresence mode="popLayout">
                        {courses.map((course) => (
                            <motion.div
                                key={course.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-border hover:shadow-md"
                            >
                                <div>
                                    <div className="mb-4 flex items-start justify-between">
                                        <div
                                            className="flex h-12 w-12 items-center justify-center rounded-xl shadow-inner text-white font-bold tracking-widest uppercase text-lg"
                                            style={{ backgroundColor: course.color }}
                                        >
                                            {course.code.slice(0, 2)}
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="-mr-2 -mt-2 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100">
                                                    <MoreVertical size={16} />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => setEditingCourse(course)} className="gap-2">
                                                    <Edit2 size={14} /> Edit Course
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setDeletingCourse(course.id)} className="gap-2 text-destructive focus:text-destructive">
                                                    <Trash2 size={14} /> Delete Course
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    <h3 className="truncate text-lg font-bold">{course.name}</h3>
                                    <p className="mt-1 text-sm font-medium text-muted-foreground uppercase tracking-widest">{course.code}</p>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            <AddCourseDialog
                open={isAddOpen || !!editingCourse}
                onOpenChange={(open) => {
                    setIsAddOpen(open)
                    if (!open) setEditingCourse(null)
                }}
                editingCourse={editingCourse}
            />

            <AlertDialog open={!!deletingCourse} onOpenChange={(open) => !open && setDeletingCourse(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the course. Any tasks associated with this course will become uncategorized.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete Course
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
