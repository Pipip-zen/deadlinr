import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/lib/store'
import { Spinner } from '@/components/ui/spinner'
import type { UserRole } from '@/types/database'

interface ProtectedRouteProps {
    allowedRoles?: UserRole[]
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
    const { session, profile, loading } = useAuthStore()

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <Spinner size="lg" className="text-primary" />
            </div>
        )
    }

    if (!session) return <Navigate to="/login" replace />

    if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
        const redirect =
            profile.role === 'superadmin' ? '/superadmin/dashboard' :
                profile.role === 'admin' ? '/admin/dashboard' :
                    '/student/dashboard'
        return <Navigate to={redirect} replace />
    }

    return <Outlet />
}
