import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/lib/store'

export function useLeaderboard() {
    const classId = useAppStore((s) => s.classId)

    return useQuery({
        queryKey: ['leaderboard', classId],
        queryFn: async () => {
            if (!classId) return []
            // Join student_points with profiles filtered by class
            const { data, error } = await supabase
                .from('student_points')
                .select(`
          user_id,
          total_points,
          updated_at,
          profiles!inner(name, avatar_url, class_id, streak_count)
        `)
                .eq('profiles.class_id', classId)
                .order('total_points', { ascending: false })
                .limit(50)
            if (error) throw error
            return data
        },
        enabled: !!classId,
    })
}
