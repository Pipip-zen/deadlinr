import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

export interface CourseRow {
    id: string
    name: string
    is_preset: boolean
}

// ── Fetch all courses ─────────────────────────────────────────
export function useCourses() {
    return useQuery({
        queryKey: ['courses'],
        queryFn: async (): Promise<CourseRow[]> => {
            const { data, error } = await supabase
                .from('courses')
                .select('id, name, is_preset')
                .order('is_preset', { ascending: false }) // presets first
                .order('name', { ascending: true })
            if (error) throw error
            return data ?? []
        },
        staleTime: 1000 * 60 * 10,
    })
}

// ── Add a custom course ───────────────────────────────────────
export function useAddCourse() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async (name: string) => {
            const { error } = await supabase
                .from('courses')
                .insert({ name, is_preset: false })
            if (error) throw error
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['courses'] })
            toast.success('Mata kuliah ditambahkan ✅')
        },
        onError: (e: Error) => toast.error(`Gagal: ${e.message}`),
    })
}

// ── Delete a custom course ────────────────────────────────────
export function useDeleteCourse() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('courses')
                .delete()
                .eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['courses'] })
            toast.success('Mata kuliah dihapus 🗑️')
        },
        onError: (e: Error) => toast.error(`Gagal: ${e.message}`),
    })
}
