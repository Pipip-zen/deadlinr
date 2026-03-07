import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'

export function useTasks() {
    const classId = useAppStore((s) => s.classId)

    return useQuery({
        queryKey: ['tasks', classId],
        queryFn: async () => {
            if (!classId) return []
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('class_id', classId)
                .order('deadline', { ascending: true })
            if (error) throw error
            return data
        },
        enabled: !!classId,
    })
}
