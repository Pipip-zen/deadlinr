import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'
import { cn } from '@/utils/cn'
import { LayoutDashboard, PlusSquare, LogOut } from 'lucide-react'

const navItems = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/create-task', icon: PlusSquare, label: 'Create Task' },
]

export function AdminLayout() {
    const { name, clearProfile } = useAppStore()
    const navigate = useNavigate()

    async function handleSignOut() {
        await supabase.auth.signOut()
        clearProfile()
        navigate('/login')
    }

    return (
        <div className="flex h-screen bg-background text-foreground">
            <aside className="flex w-60 flex-col border-r border-border bg-card px-4 py-6">
                <div className="mb-8">
                    <h1 className="text-xl font-bold tracking-tight text-primary">TaskTrack</h1>
                    <p className="mt-1 text-xs text-muted-foreground font-medium text-amber-500">Admin Panel</p>
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

            <main className="flex-1 overflow-y-auto p-6">
                <Outlet />
            </main>
        </div>
    )
}
