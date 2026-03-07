import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'

export default function SetupPage() {
    const { userId, setProfile } = useAppStore()
    const navigate = useNavigate()
    const [name, setName] = useState('')
    const [classId, setClassId] = useState('')

    const { data: classes } = useQuery({
        queryKey: ['classes'],
        queryFn: async () => {
            const { data, error } = await supabase.from('classes').select('*').order('name')
            if (error) throw error
            return data
        },
    })

    const mutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase
                .from('profiles')
                .upsert({ id: userId!, name, class_id: classId, role: 'student' })
            if (error) throw error
        },
        onSuccess: () => {
            setProfile({ name, classId })
            navigate('/student/dashboard')
        },
    })

    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <form
                onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}
                className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card p-8 shadow-lg"
            >
                <h1 className="text-2xl font-bold">Set up your profile 🎓</h1>

                <input
                    id="setup-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    required
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />

                <select
                    id="setup-class"
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    required
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                >
                    <option value="">Select your class…</option>
                    {classes?.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>

                <button
                    id="setup-btn"
                    type="submit"
                    disabled={mutation.isPending}
                    className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                    {mutation.isPending ? 'Saving…' : 'Get started'}
                </button>
            </form>
        </div>
    )
}
