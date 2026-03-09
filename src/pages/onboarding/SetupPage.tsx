import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import imageCompression from 'browser-image-compression'
import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Avatar } from '@/components/ui/avatar'

// ---- Zod schemas ----
const nameSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(60),
})
type NameForm = z.infer<typeof nameSchema>

// ---- Step motion variants ----
const stepVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 320 : -320, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -320 : 320, opacity: 0 }),
}

const STEPS = ['Name', 'Photo', 'Class']

// ---- Avatar upload step ----
function AvatarStep({
    preview, onDrop, uploading,
}: {
    preview: string | null
    onDrop: (files: File[]) => void
    uploading: boolean
}) {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [] },
        maxFiles: 1,
        disabled: uploading,
    })

    return (
        <div className="flex flex-col items-center gap-5">
            <Avatar src={preview} fallback="ME" size="xl" />
            <div
                {...getRootProps()}
                className={`flex w-full cursor-pointer flex-col items-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors ${isDragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                    } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
            >
                <input {...getInputProps()} />
                {uploading ? (
                    <p className="text-sm text-muted-foreground">Uploading…</p>
                ) : isDragActive ? (
                    <p className="text-sm font-medium text-primary">Drop it here!</p>
                ) : (
                    <>
                        <p className="text-sm font-medium">Drop a photo or click to browse</p>
                        <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, WEBP • max 5 MB</p>
                    </>
                )}
            </div>
        </div>
    )
}

// ---- Main component ----
function SetupWizard() {
    const navigate = useNavigate()
    const { session, setProfile } = useAuthStore()

    const [step, setStep] = useState(0)
    const [direction, setDir] = useState(1)
    const [avatarUrl, setAvatar] = useState<string | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [uploading, setUp] = useState(false)
    const [classId, setClassId] = useState('')
    const [submitting, setSub] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const {
        register,
        handleSubmit,
        getValues,
        formState: { errors },
    } = useForm<NameForm>({ resolver: zodResolver(nameSchema) })

    // Fetch classes
    const { data: classes = [] } = useQuery({
        queryKey: ['classes'],
        queryFn: async () => {
            const { data, error } = await supabase.from('classes').select('id, name').order('name')
            if (error) throw error
            return data
        },
    })

    // Navigate between steps
    const goTo = (next: number) => {
        setDir(next > step ? 1 : -1)
        setStep(next)
    }

    // Avatar compress + upload
    const onDrop = useCallback(
        async (accepted: File[]) => {
            const file = accepted[0]
            if (!file || !session?.user) return
            setUp(true)
            try {
                const compressed = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 512 })
                const blob = await compressed
                const ext = file.name.split('.').pop() ?? 'jpg'
                const path = `${session.user.id}/avatar.${ext}`
                const { error } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true })
                if (error) throw error
                const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
                setAvatar(publicUrl)
                setPreview(URL.createObjectURL(blob))
            } catch (e) {
                setError((e as Error).message)
            } finally {
                setUp(false)
            }
        },
        [session]
    )

    // Final submit
    async function onSubmit() {
        if (!session?.user) return
        setSub(true)
        setError(null)
        try {
            const name = getValues('name')
            const { error } = await supabase.from('profiles').upsert({
                id: session.user.id,
                name,
                avatar_url: avatarUrl,
                class_id: classId || null,
            })
            if (error) throw error
            setProfile({
                id: session.user.id,
                name,
                avatarUrl,
                classId: classId || null,
            })
            navigate('/dashboard', { replace: true })
        } catch (e) {
            setError((e as Error).message)
        } finally {
            setSub(false)
        }
    }

    // Step 0 submit — validate name then advance
    const onNameNext = handleSubmit(() => goTo(1))

    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4">
            {/* Background blobs */}
            <div className="pointer-events-none absolute -top-32 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />

            <div className="relative z-10 w-full max-w-sm sm:max-w-md px-4 sm:px-0">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome!</h1>
                    <p className="mt-2 text-muted-foreground">Let's set up your profile.</p>
                </div>

                {/* Progress Indicators */}
                <div className="mb-8 flex justify-center gap-2">
                    {STEPS.map((_, i) => (
                        <div
                            key={i}
                            className={`h-2 w-12 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-primary/20'}`}
                        />
                    ))}
                </div>

                <div className="w-full rounded-2xl border border-border bg-card/80 p-6 sm:p-8 shadow-xl backdrop-blur relative">
                    <AnimatePresence mode="wait" custom={direction}>
                        <motion.div
                            key={step}
                            custom={direction}
                            variants={stepVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="p-8"
                        >
                            {/* Step 1 — Name */}
                            {step === 0 && (
                                <form onSubmit={onNameNext} className="space-y-6">
                                    <div>
                                        <h2 className="text-xl font-semibold">What's your name?</h2>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            This will be visible to your classmates.
                                        </p>
                                    </div>
                                    <Input
                                        id="setup-name"
                                        label="Full name"
                                        placeholder="e.g. Andi Pratama"
                                        error={errors.name?.message}
                                        autoFocus
                                        {...register('name')}
                                    />
                                    <Button type="submit" size="lg" className="w-full">
                                        Continue →
                                    </Button>
                                </form>
                            )}

                            {/* Step 2 — Avatar */}
                            {step === 1 && (
                                <div className="space-y-6">
                                    <div>
                                        <h2 className="text-xl font-semibold">Add a profile photo</h2>
                                        <p className="mt-1 text-sm text-muted-foreground">Optional — you can skip this.</p>
                                    </div>
                                    <AvatarStep preview={preview} onDrop={onDrop} uploading={uploading} />
                                    <div className="flex gap-3">
                                        <Button variant="outline" size="lg" className="flex-1" onClick={() => goTo(0)}>
                                            ← Back
                                        </Button>
                                        <Button size="lg" className="flex-1" onClick={() => goTo(2)} disabled={uploading}>
                                            {avatarUrl ? 'Next →' : 'Skip →'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Step 3 — Class */}
                            {step === 2 && (
                                <div className="space-y-6">
                                    <div>
                                        <h2 className="text-xl font-semibold">Select your class</h2>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            You'll only see tasks from your class.
                                        </p>
                                    </div>
                                    <Select
                                        id="setup-class"
                                        label="Class"
                                        placeholder="Choose a class…"
                                        value={classId}
                                        onChange={(e) => setClassId(e.target.value)}
                                        options={classes.map((c) => ({ value: c.id, label: c.name }))}
                                    />
                                    {error && (
                                        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                            {error}
                                        </p>
                                    )}
                                    <div className="flex gap-3">
                                        <Button variant="outline" size="lg" className="flex-1" onClick={() => goTo(1)}>
                                            ← Back
                                        </Button>
                                        <Button
                                            size="lg"
                                            className="flex-1"
                                            loading={submitting}
                                            disabled={!classId}
                                            onClick={onSubmit}
                                        >
                                            Let's go 🚀
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}

// Wrap in Error Boundary
export default function SetupPage() {
    return (
        <ErrorBoundary>
            <SetupWizard />
        </ErrorBoundary>
    )
}
