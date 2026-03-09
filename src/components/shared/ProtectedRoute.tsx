import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/lib/store'
import { Spinner } from '@/components/ui/spinner'

export function ProtectedRoute() {
    const { session, loading } = useAuthStore()

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <Spinner size="lg" className="text-primary" />
            </div>
        )
    }

    if (!session) return <Navigate to="/login" replace />

    return <Outlet />
}
