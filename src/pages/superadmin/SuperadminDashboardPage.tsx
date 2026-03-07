import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export default function SuperadminDashboardPage() {
    const { data: classes } = useQuery({
        queryKey: ['all-classes'],
        queryFn: async () => {
            const { data, error } = await supabase.from('classes').select('*').order('name')
            if (error) throw error
            return data
        },
    })

    const { data: profiles } = useQuery({
        queryKey: ['all-profiles'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, name, role, class_id, streak_count')
                .order('created_at', { ascending: false })
            if (error) throw error
            return data
        },
    })

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Superadmin Dashboard</h1>

            <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Classes</p>
                    <p className="mt-1 text-3xl font-bold">{classes?.length ?? '—'}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Users</p>
                    <p className="mt-1 text-3xl font-bold">{profiles?.length ?? '—'}</p>
                </div>
            </div>

            <section>
                <h2 className="mb-3 text-lg font-semibold">All Users</h2>
                <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                                <th className="px-4 py-2">Name</th>
                                <th className="px-4 py-2">Role</th>
                                <th className="px-4 py-2">Class</th>
                                <th className="px-4 py-2">Streak</th>
                            </tr>
                        </thead>
                        <tbody>
                            {profiles?.map((p) => (
                                <tr key={p.id} className="border-b border-border last:border-0">
                                    <td className="px-4 py-2 font-medium">{p.name}</td>
                                    <td className="px-4 py-2 capitalize text-muted-foreground">{p.role}</td>
                                    <td className="px-4 py-2 text-muted-foreground">{p.class_id ?? '—'}</td>
                                    <td className="px-4 py-2">🔥 {p.streak_count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    )
}
