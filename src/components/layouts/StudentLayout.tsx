import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import { cn } from '@/utils/cn'
import { LayoutDashboard, CheckSquare, Book, LogOut, User } from 'lucide-react'

const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
    { to: '/courses', icon: Book, label: 'Courses' },
    // On mobile we add a profile button, on desktop the profile name is in sidebar
]

export function StudentLayout() {
    const { profile, clearAuth } = useAuthStore()
    const name = profile?.name
    const navigate = useNavigate()

    async function handleSignOut() {
        await supabase.auth.signOut()
        clearAuth()
        navigate('/login')
    }

    return (
        <div className="flex h-[100dvh] bg-background text-foreground overflow-hidden">
            {/* Desktop Sidebar (hidden on mobile) */}
            <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card px-4 py-8 relative z-20">
                <div className="mb-10 px-2">
                    <h1 className="text-2xl font-black tracking-tight text-primary">Deadlinr</h1>
                </div>

                <nav className="flex-1 space-y-8 overflow-y-auto">
                    {/* Main Links */}
                    <div className="space-y-1">
                        {navItems.map(({ to, icon: Icon, label }) => (
                            <NavLink
                                key={to}
                                to={to}
                                className={({ isActive }) =>
                                    cn(
                                        'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                                        // Ensure root paths don't wildly match
                                        (to === '/dashboard' ? isActive : window.location.pathname.startsWith(to))
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
                                    )
                                }
                            >
                                <Icon size={18} />
                                {label}
                            </NavLink>
                        ))}
                    </div>

                </nav>

                <div className="border-t border-border pt-6 mt-6">
                    <div className="mb-4 flex items-center gap-3 px-2">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <User size={16} />
                        </div>
                        <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                        <LogOut size={18} />
                        Sign out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto pb-24 lg:pb-8 lg:p-8 p-4 relative z-0">
                <Outlet />
            </main>

            {/* Mobile Bottom Navigation (hidden on desktop) */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 flex lg:hidden items-center justify-around border-t border-border bg-card pb-safe-bottom pt-2 shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.1)]">
                {navItems.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                            cn(
                                'flex min-h-[56px] min-w-[64px] flex-col items-center justify-center gap-1 overflow-hidden transition-colors',
                                isActive
                                    ? 'text-primary'
                                    : 'text-muted-foreground hover:text-foreground'
                            )
                        }
                    >
                        <div className="relative">
                            <Icon size={22} className="relative z-10" />
                        </div>
                        <span className="text-[10px] font-medium tracking-wide">{label}</span>
                    </NavLink>
                ))}

                {/* Profile/Sign out bottom nav item */}
                <button
                    onClick={handleSignOut}
                    className="flex min-h-[56px] min-w-[64px] flex-col items-center justify-center gap-1 text-muted-foreground transition-colors hover:text-destructive"
                >
                    <LogOut size={22} />
                    <span className="text-[10px] font-medium tracking-wide">Sign out</span>
                </button>
            </nav>
        </div>
    )
}
