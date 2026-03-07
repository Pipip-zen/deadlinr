import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleGoogleLogin() {
        setLoading(true)
        setError(null)

        const redirectTo = `${window.location.origin}/auth/callback`

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo },
        })

        if (error) {
            setError(error.message)
            setLoading(false)
        }
        // On success, browser redirects — no further action needed here
    }

    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background">
            {/* Gradient blobs */}
            <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl" />

            <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-8 px-6">
                {/* Brand */}
                <div className="text-center">
                    <div className="mb-4 text-6xl">📋</div>
                    <h1 className="text-4xl font-bold tracking-tight text-foreground">TaskTrack</h1>
                    <p className="mt-2 text-muted-foreground">
                        College task tracker with class sync &amp; gamification
                    </p>
                </div>

                {/* Card */}
                <div className="w-full rounded-2xl border border-border bg-card/80 p-8 shadow-xl backdrop-blur">
                    <h2 className="mb-1 text-xl font-semibold">Welcome 👋</h2>
                    <p className="mb-6 text-sm text-muted-foreground">
                        Sign in with your Google account to continue.
                    </p>

                    {error && (
                        <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    <Button
                        id="google-login-btn"
                        onClick={handleGoogleLogin}
                        loading={loading}
                        size="lg"
                        className="w-full gap-3"
                    >
                        {!loading && (
                            <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
                                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                            </svg>
                        )}
                        {loading ? 'Redirecting…' : 'Continue with Google'}
                    </Button>
                </div>

                <p className="text-center text-xs text-muted-foreground">
                    By continuing, you agree to TaskTrack's terms of service.
                </p>
            </div>
        </div>
    )
}
