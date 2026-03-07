import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

import { queryClient } from '@/lib/queryClient'
import { useAuthSession } from '@/hooks/useAuthSession'
import { useAppStore } from '@/lib/store'

import { ProtectedRoute } from '@/components/shared/ProtectedRoute'
import { StudentLayout } from '@/components/layouts/StudentLayout'
import { AdminLayout } from '@/components/layouts/AdminLayout'

import LoginPage from '@/pages/auth/LoginPage'
import SetupPage from '@/pages/onboarding/SetupPage'
import DashboardPage from '@/pages/student/DashboardPage'
import TasksPage from '@/pages/student/TasksPage'
import LeaderboardPage from '@/pages/student/LeaderboardPage'
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage'
import SuperadminDashboardPage from '@/pages/superadmin/SuperadminDashboardPage'

function AppRoutes() {
    const { loading } = useAuthSession()
    const role = useAppStore((s) => s.role)

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p className="text-muted-foreground animate-pulse">Loading…</p>
            </div>
        )
    }

    return (
        <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/setup" element={<SetupPage />} />

            {/* Student */}
            <Route element={<ProtectedRoute allowedRoles={['student', 'admin', 'superadmin']} />}>
                <Route element={<StudentLayout />}>
                    <Route path="/student/dashboard" element={<DashboardPage />} />
                    <Route path="/student/tasks" element={<TasksPage />} />
                    <Route path="/student/leaderboard" element={<LeaderboardPage />} />
                </Route>
            </Route>

            {/* Admin */}
            <Route element={<ProtectedRoute allowedRoles={['admin', 'superadmin']} />}>
                <Route element={<AdminLayout />}>
                    <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                </Route>
            </Route>

            {/* Superadmin */}
            <Route element={<ProtectedRoute allowedRoles={['superadmin']} />}>
                <Route path="/superadmin/dashboard" element={<SuperadminDashboardPage />} />
            </Route>

            {/* Root redirect */}
            <Route
                path="/"
                element={
                    <Navigate
                        to={
                            !role ? '/login' :
                                role === 'superadmin' ? '/superadmin/dashboard' :
                                    role === 'admin' ? '/admin/dashboard' :
                                        '/student/dashboard'
                        }
                        replace
                    />
                }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <AppRoutes />
            </BrowserRouter>
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    )
}
