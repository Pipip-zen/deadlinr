import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/ui/spinner'

/**
 * Handles the OAuth redirect from Supabase (e.g. after Google login).
 * Supabase exchanges the code/token in the URL automatically via the SDK.
 * We just wait for the session and redirect accordingly.
 */
export default function AuthCallbackPage() {
    const navigate = useNavigate()

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            if (!data.session) {
                navigate('/login', { replace: true })
                return
            }
            // Let useAuthSession + OnboardingGuard handle where to send the user
            navigate('/', { replace: true })
        })
    }, [navigate])

    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4 text-center">
                <Spinner size="lg" className="text-primary" />
                <p className="text-sm text-muted-foreground">Finishing sign-in…</p>
            </div>
        </div>
    )
}
