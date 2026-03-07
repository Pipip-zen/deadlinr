import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/lib/store'
import { Spinner } from '@/components/ui/spinner'

/**
 * Redirect to /setup if the user's profile name is not yet set.
 * Place inside ProtectedRoute so session is guaranteed.
 */
export function OnboardingGuard() {
    const { profile, loading } = useAuthStore()

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <Spinner size="lg" className="text-primary" />
            </div>
        )
    }

    if (!profile?.name) return <Navigate to="/setup" replace />

    return <Outlet />
}
