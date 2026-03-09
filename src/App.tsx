import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

import { queryClient } from '@/lib/queryClient'
import { useAuthSession } from '@/hooks/useAuthSession'
import { useAuthStore } from '@/lib/store'
import { Toaster } from 'sonner'

import { ProtectedRoute } from '@/components/shared/ProtectedRoute'
import { OnboardingGuard } from '@/components/shared/OnboardingGuard'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { StudentLayout } from '@/components/layouts/StudentLayout'
import { AdminLayout } from '@/components/layouts/AdminLayout'

import LoginPage from '@/pages/auth/LoginPage'
import AuthCallbackPage from '@/pages/auth/AuthCallbackPage'
import SetupPage from '@/pages/onboarding/SetupPage'
import DashboardPage from '@/pages/student/DashboardPage'
import TasksPage from '@/pages/student/TasksPage'
import LeaderboardPage from '@/pages/student/LeaderboardPage'
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage'
import CreateTaskPage from '@/pages/admin/CreateTaskPage'
import SuperadminDashboardPage from '@/pages/superadmin/SuperadminDashboardPage'

function AppRoutes() {
    useAuthSession() // bootstrap auth at root level

    const { session, profile, loading } = useAuthStore()

    // Smart root redirect based on role
    function RootRedirect() {
        if (loading) return null
        if (!session) return <Navigate to="/login" replace />
        if (!profile?.name) return <Navigate to="/setup" replace />
        if (profile.role === 'superadmin') return <Navigate to="/superadmin/dashboard" replace />
        if (profile.role === 'admin') return <Navigate to="/admin/dashboard" replace />
        return <Navigate to="/student/dashboard" replace />
    }

    return (
        <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />

            {/* Onboarding — needs session, does NOT need complete profile */}
            <Route element={<ProtectedRoute />}>
                <Route path="/setup" element={<SetupPage />} />
            </Route>

            {/* Student — needs session + complete profile */}
            <Route element={<ProtectedRoute allowedRoles={['student', 'admin', 'superadmin']} />}>
                <Route element={<OnboardingGuard />}>
                    <Route element={<StudentLayout />}>
                        <Route path="/student/dashboard" element={<DashboardPage />} />
                        <Route path="/student/tasks" element={<TasksPage />} />
                        <Route path="/student/leaderboard" element={<LeaderboardPage />} />
                    </Route>
                </Route>
            </Route>

            {/* Admin */}
            <Route element={<ProtectedRoute allowedRoles={['admin', 'superadmin']} />}>
                <Route element={<OnboardingGuard />}>
                    <Route element={<AdminLayout />}>
                        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                        <Route path="/admin/create-task" element={<CreateTaskPage />} />
                    </Route>
                </Route>
            </Route>

            {/* Superadmin */}
            <Route element={<ProtectedRoute allowedRoles={['superadmin']} />}>
                <Route element={<OnboardingGuard />}>
                    <Route path="/superadmin/dashboard" element={<SuperadminDashboardPage />} />
                </Route>
            </Route>

            {/* Root & catch-all */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

export default function App() {
    return (
        <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <BrowserRouter>
                    <AppRoutes />
                </BrowserRouter>
                <Toaster richColors position="top-right" closeButton />
                <ReactQueryDevtools initialIsOpen={false} />
            </QueryClientProvider>
        </ErrorBoundary>
    )
}
