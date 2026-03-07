import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

// ── Types ──────────────────────────────────────────────────────
export interface OverviewStats {
    totalClasses: number
    totalStudents: number
    totalTasks: number
}

export interface ClassRow {
    id: string
    name: string
    created_at: string
    student_count: number
    task_count: number
}

export interface AdminRow {
    id: string
    name: string | null
    avatar_url: string | null
    class_name: string | null
}

// ── Hooks ──────────────────────────────────────────────────────

export function useSuperadminStats() {
    return useQuery({
        queryKey: ['superadmin-stats'],
        queryFn: async (): Promise<OverviewStats> => {
            const [
                { count: classesCount },
                { count: studentsCount },
                { count: tasksCount }
            ] = await Promise.all([
                supabase.from('classes').select('*', { count: 'exact', head: true }),
                supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
                supabase.from('tasks').select('*', { count: 'exact', head: true })
            ])

            return {
                totalClasses: classesCount ?? 0,
                totalStudents: studentsCount ?? 0,
                totalTasks: tasksCount ?? 0,
            }
        },
        staleTime: 1000 * 60 * 5,
    })
}

export function useSuperadminClasses() {
    return useQuery({
        queryKey: ['superadmin-classes'],
        queryFn: async (): Promise<ClassRow[]> => {
            // Fetch classes with nested count of profiles & tasks
            // PostgREST syntax for nested counts: profiles(count), tasks(count)
            const { data, error } = await supabase
                .from('classes')
                .select(`
          id,
          name,
          created_at,
          profiles(count),
          tasks(count)
        `)
                .order('created_at', { ascending: false })

            if (error) throw error

            return (data ?? []).map((row: any) => ({
                id: row.id,
                name: row.name,
                created_at: row.created_at,
                student_count: row.profiles[0]?.count ?? 0,
                task_count: row.tasks[0]?.count ?? 0,
            }))
        },
        staleTime: 1000 * 60 * 5,
    })
}

export function useSuperadminAdmins() {
    return useQuery({
        queryKey: ['superadmin-admins'],
        queryFn: async (): Promise<AdminRow[]> => {
            // Fetch admins and join the class name
            const { data, error } = await supabase
                .from('profiles')
                .select(`
          id,
          name,
          avatar_url,
          classes (name)
        `)
                .eq('role', 'admin')

            if (error) throw error

            return (data ?? []).map((row: any) => ({
                id: row.id,
                name: row.name,
                avatar_url: row.avatar_url,
                class_name: row.classes?.name ?? null,
            }))
        },
        staleTime: 1000 * 60 * 5,
    })
}

// ── Mutations ────────────────────────────────────────────────────

export function useCreateClass() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async (name: string) => {
            const { data, error } = await supabase.functions.invoke('create-class', {
                body: { name }
            })
            if (error) throw new Error(error.message)
            if (data?.error) throw new Error(data.error)
            return data
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['superadmin-classes'] })
            qc.invalidateQueries({ queryKey: ['superadmin-stats'] })
            qc.invalidateQueries({ queryKey: ['classes'] }) // the global classes fetch
            toast.success('Class created ✅')
        },
        onError: (e: Error) => toast.error(`Failed: ${e.message}`),
    })
}

export function useDeleteClass() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async (classId: string) => {
            const { data, error } = await supabase.functions.invoke('delete-class', {
                body: { classId }
            })
            if (error) throw new Error(error.message)
            if (data?.error) throw new Error(data.error)
            return data
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['superadmin-classes'] })
            qc.invalidateQueries({ queryKey: ['superadmin-stats'] })
            qc.invalidateQueries({ queryKey: ['classes'] })
            toast.success('Class deleted 🗑️')
        },
        onError: (e: Error) => toast.error(`Failed: ${e.message}`),
    })
}

export function useAssignAdmin() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async ({ email, classId }: { email: string; classId: string }) => {
            const { data, error } = await supabase.functions.invoke('assign-admin', {
                body: { email, classId }
            })
            if (error) throw new Error(error.message)
            if (data?.error) throw new Error(data.error)
            return data
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['superadmin-admins'] })
            toast.success('Admin assigned 👑')
        },
        onError: (e: Error) => toast.error(`Failed: ${e.message}`),
    })
}

export function useRevokeAdmin() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async (userId: string) => {
            const { data, error } = await supabase.functions.invoke('revoke-admin', {
                body: { userId }
            })
            if (error) throw new Error(error.message)
            if (data?.error) throw new Error(data.error)
            return data
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['superadmin-admins'] })
            toast.success('Admin rights revoked')
        },
        onError: (e: Error) => toast.error(`Failed: ${e.message}`),
    })
}
