import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useClasses() {
    return useQuery({
        queryKey: ['classes'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('classes')
                .select('id, name')
                .order('name')
            if (error) throw error
            return data ?? []
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    })
}
