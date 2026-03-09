import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import { toast } from 'sonner'
import type { Database } from '@/types/database'

export type Course = Database['public']['Tables']['courses']['Row']
type CourseInsert = Database['public']['Tables']['courses']['Insert']

export function useCourses() {
    const profile = useAuthStore((s) => s.profile)
    const userId = profile?.id ?? null

    const query = useQuery({
        queryKey: ['courses', userId],
        queryFn: async () => {
            if (!userId) return []
            const { data, error } = await supabase
                .from('courses')
                .select('*')
                .eq('user_id', userId)
                .order('name', { ascending: true })

            if (error) throw error
            return data as Course[]
        },
        enabled: !!userId,
        staleTime: 1000 * 60 * 5, // 5 mins
    })

    return {
        courses: query.data ?? [],
        isLoading: query.isLoading,
        error: query.error,
    }
}

export function useCreateCourse() {
    const qc = useQueryClient()
    const profile = useAuthStore((s) => s.profile)
    const userId = profile?.id ?? null

    return useMutation({
        mutationFn: async (course: Omit<CourseInsert, 'user_id'>) => {
            if (!userId) throw new Error('Not authenticated')
            const { data, error } = await supabase
                .from('courses')
                .insert({ ...course, user_id: userId })
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ['courses'] })
            toast.success(`Mata kuliah ${data.name} ditambahkan`)
        },
        onError: (err: any) => {
            toast.error(err.message || 'Gagal menambahkan mata kuliah')
        }
    })
}
