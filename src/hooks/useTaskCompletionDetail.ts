import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'

export interface StudentCompletion {
    id: string
    name: string | null
    avatar_url: string | null
    completed_at: string | null // null = belum mengerjakan
}

export function useTaskCompletionDetail(taskId: string | null) {
    const profile = useAuthStore((s) => s.profile)
    const classId = profile?.classId ?? null

    return useQuery({
        queryKey: ['task-completion-detail', taskId],
        queryFn: async (): Promise<StudentCompletion[]> => {
            if (!taskId || !classId) return []

            // Fetch all students in the class
            const { data: students, error: stuErr } = await supabase
                .from('profiles')
                .select('id, name, avatar_url')
                .eq('class_id', classId)
                .eq('role', 'student')

            if (stuErr) throw stuErr

            // Fetch completions for this task
            const { data: completions, error: compErr } = await supabase
                .from('task_completions')
                .select('user_id, completed_at')
                .eq('task_id', taskId)

            if (compErr) throw compErr

            const completionMap = new Map(
                (completions ?? []).map((c) => [c.user_id, c.completed_at])
            )

            return (students ?? []).map((s) => ({
                id: s.id,
                name: s.name,
                avatar_url: s.avatar_url,
                completed_at: completionMap.get(s.id) ?? null,
            }))
        },
        enabled: !!taskId && !!classId,
        staleTime: 1000 * 30,
    })
}
