import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
            setError(error.message)
            setLoading(false)
            return
        }
        // Auth state listener in useAuthSession will sync the profile
        navigate('/student/dashboard')
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <form
                onSubmit={handleLogin}
                className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-8 shadow-lg"
            >
                <h1 className="text-2xl font-bold text-foreground">Welcome back 👋</h1>
                <p className="text-sm text-muted-foreground">Sign in to TaskTrack</p>

                {error && (
                    <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
                )}

                <input
                    id="email"
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                    id="password"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />

                <button
                    id="login-btn"
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                    {loading ? 'Signing in…' : 'Sign in'}
                </button>
            </form>
        </div>
    )
}
