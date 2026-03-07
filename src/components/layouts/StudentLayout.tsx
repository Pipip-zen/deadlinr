import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import { cn } from '@/utils/cn'
import { LayoutDashboard, CheckSquare, Trophy, LogOut } from 'lucide-react'

const navItems = [
    { to: '/student/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/student/tasks', icon: CheckSquare, label: 'Tasks' },
    { to: '/student/leaderboard', icon: Trophy, label: 'Leaderboard' },
]

export function StudentLayout() {
    const { profile, clearAuth } = useAuthStore()
    const name = profile?.name
    const streakCount = profile?.streakCount ?? 0
    const navigate = useNavigate()

    async function handleSignOut() {
        await supabase.auth.signOut()
        clearAuth()
        navigate('/login')
    }

    return (
        <div className="flex h-screen bg-background text-foreground">
            {/* Sidebar */}
            <aside className="flex w-60 flex-col border-r border-border bg-card px-4 py-6">
                <div className="mb-8">
                    <h1 className="text-xl font-bold tracking-tight text-primary">TaskTrack</h1>
                    <p className="mt-1 text-xs text-muted-foreground">🔥 {streakCount}-day streak</p>
                </div>

                <nav className="flex-1 space-y-1">
                    {navItems.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                cn(
                                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                                    isActive
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                )
                            }
                        >
                            <Icon size={16} />
                            {label}
                        </NavLink>
                    ))}
                </nav>

                <div className="border-t border-border pt-4">
                    <p className="mb-2 truncate px-3 text-xs text-muted-foreground">{name}</p>
                    <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                        <LogOut size={16} />
                        Sign out
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 overflow-y-auto p-6">
                <Outlet />
            </main>
        </div>
    )
}
