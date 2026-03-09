import { useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Plus, Trash2, Loader2 } from 'lucide-react'

import { useCourses, useAddCourse, useDeleteCourse } from '@/hooks/useCourses'
import { Button } from '@/components/ui/button'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'

function CoursesContent() {
    const { data: courses = [], isLoading } = useCourses()
    const addCourse = useAddCourse()
    const deleteCourse = useDeleteCourse()

    const [addingCustom, setAddingCustom] = useState(false)
    const [customInput, setCustomInput] = useState('')

    const presetCourses = courses.filter((c) => c.is_preset)
    const customCourses = courses.filter((c) => !c.is_preset)

    const handleAdd = async () => {
        const trimmed = customInput.trim()
        if (!trimmed) return
        await addCourse.mutateAsync(trimmed)
        setCustomInput('')
        setAddingCustom(false)
    }

    return (
        <div className="mx-auto max-w-2xl space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <BookOpen size={22} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight">Mata Kuliah</h1>
                        <p className="text-sm text-muted-foreground">{courses.length} mata kuliah terdaftar</p>
                    </div>
                </div>
                {!addingCustom && (
                    <Button onClick={() => setAddingCustom(true)}>
                        <Plus size={16} />
                        Tambah Baru
                    </Button>
                )}
            </div>

            {/* Add new input */}
            {addingCustom && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4"
                >
                    <input
                        autoFocus
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); handleAdd() }
                            if (e.key === 'Escape') { setAddingCustom(false); setCustomInput('') }
                        }}
                        placeholder="Nama mata kuliah baru…"
                        className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <Button onClick={handleAdd} loading={addCourse.isPending}>Simpan</Button>
                    <Button variant="ghost" onClick={() => { setAddingCustom(false); setCustomInput('') }}>Batal</Button>
                </motion.div>
            )}

            {/* Preset courses */}
            <div className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Mata Kuliah TRM (Preset)
                </h2>
                {isLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                        <Loader2 size={14} className="animate-spin" /> Memuat…
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                        {presetCourses.map((c, i) => (
                            <div
                                key={c.id}
                                className={`flex items-center justify-between px-5 py-3 ${i !== presetCourses.length - 1 ? 'border-b border-border' : ''}`}
                            >
                                <span className="text-sm font-medium">{c.name}</span>
                                <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">preset</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Custom courses */}
            <div className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Mata Kuliah Tambahan
                </h2>
                {customCourses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-10 text-center">
                        <p className="text-sm text-muted-foreground">Belum ada mata kuliah tambahan</p>
                        <button
                            onClick={() => setAddingCustom(true)}
                            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                            <Plus size={12} />
                            Tambah sekarang
                        </button>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                        {customCourses.map((c, i) => (
                            <motion.div
                                key={c.id}
                                layout
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, height: 0 }}
                                className={`flex items-center justify-between px-5 py-3 ${i !== customCourses.length - 1 ? 'border-b border-border' : ''}`}
                            >
                                <span className="text-sm font-medium">{c.name}</span>
                                <button
                                    onClick={() => deleteCourse.mutate(c.id)}
                                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                    title="Hapus"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default function CoursesPage() {
    return (
        <ErrorBoundary>
            <CoursesContent />
        </ErrorBoundary>
    )
}
