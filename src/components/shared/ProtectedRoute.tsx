import { Navigate, Outlet } from 'react-router-dom'
import { useAppStore } from '@/lib/store'
import type { UserRole } from '@/types/database'

interface ProtectedRouteProps {
    allowedRoles: UserRole[]
}

/**
 * Wraps a set of routes and redirects to /login if the user
 * doesn't have one of the allowed roles.
 */
export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
    const role = useAppStore((s) => s.role)
    const userId = useAppStore((s) => s.userId)

    if (!userId) return <Navigate to="/login" replace />

    if (!allowedRoles.includes(role as UserRole)) {
        // Redirect to the appropriate home based on role
        if (role === 'admin') return <Navigate to="/admin/dashboard" replace />
        if (role === 'superadmin') return <Navigate to="/superadmin/dashboard" replace />
        return <Navigate to="/student/dashboard" replace />
    }

    return <Outlet />
}
