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

import LoginPage from '@/pages/auth/LoginPage'
import AuthCallbackPage from '@/pages/auth/AuthCallbackPage'
import SetupPage from '@/pages/onboarding/SetupPage'
import DashboardPage from '@/pages/student/DashboardPage'
import TasksPage from '@/pages/student/TasksPage'
import { CoursesPage } from '@/pages/student/CoursesPage'

function AppRoutes() {
    useAuthSession() // bootstrap auth at root level

    const { session, profile, loading } = useAuthStore()

    // Smart root redirect based on auth status
    function RootRedirect() {
        if (loading) return null
        if (!session) return <Navigate to="/login" replace />
        if (!profile?.name) return <Navigate to="/setup" replace />
        return <Navigate to="/dashboard" replace />
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

            {/* Main App — needs session + complete profile */}
            <Route element={<ProtectedRoute />}>
                <Route element={<OnboardingGuard />}>
                    <Route element={<StudentLayout />}>
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route path="/tasks" element={<TasksPage />} />
                        <Route path="/courses" element={<CoursesPage />} />
                        {/* Leaderboard removed as per gamification removal */}
                    </Route>
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
