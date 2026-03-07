// @ts-nocheck
// Supabase Edge Function: complete-task
// POST body: { taskId: string, userId: string }

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { taskId, userId } = await req.json()
        if (!taskId || !userId) {
            return new Response(JSON.stringify({ error: 'taskId and userId are required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Service-role client — bypasses all RLS
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        const now = new Date()
        const today = now.toISOString().split('T')[0] // YYYY-MM-DD

        // ─── 1. Fetch task deadline ───────────────────────────────
        const { data: task, error: taskErr } = await supabase
            .from('tasks')
            .select('deadline')
            .eq('id', taskId)
            .single()

        if (taskErr || !task) throw new Error('Task not found')

        // ─── 2. Calculate points ──────────────────────────────────
        const deadline = new Date(task.deadline)
        const daysLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        let pointsEarned = 10
        if (daysLeft >= 2) pointsEarned += 5   // speed bonus

        // ─── 3. Insert task_completions ───────────────────────────
        const { error: insertErr } = await supabase.from('task_completions').insert({
            task_id: taskId,
            user_id: userId,
            completed_at: now.toISOString(),
            points_earned: pointsEarned,
        })
        if (insertErr) throw new Error(insertErr.message)

        // ─── 4. Streak logic ─────────────────────────────────────
        const { data: profile, error: profErr } = await supabase
            .from('profiles')
            .select('streak_count, last_active_date')
            .eq('id', userId)
            .single()

        if (profErr || !profile) throw new Error('Profile not found')

        const lastActive = profile.last_active_date ?? null
        let streakCount = profile.streak_count ?? 0
        let streakBonus = 0

        if (lastActive === null) {
            // First completion ever
            streakCount = 1
        } else {
            const yesterday = new Date(now)
            yesterday.setDate(yesterday.getDate() - 1)
            const yesterdayStr = yesterday.toISOString().split('T')[0]

            if (lastActive === yesterdayStr) {
                // Continued streak
                streakCount += 1
                streakBonus = 3
            } else if (lastActive === today) {
                // Already active today — no change
            } else {
                // Streak broken
                streakCount = 1
            }
        }

        pointsEarned += streakBonus

        // ─── 5. Update profile ────────────────────────────────────
        await supabase
            .from('profiles')
            .update({ streak_count: streakCount, last_active_date: today })
            .eq('id', userId)

        // ─── 6. Upsert student_points ─────────────────────────────
        const { data: current } = await supabase
            .from('student_points')
            .select('total_points')
            .eq('user_id', userId)
            .single()

        const newTotal = (current?.total_points ?? 0) + pointsEarned

        await supabase.from('student_points').upsert({
            user_id: userId,
            total_points: newTotal,
            updated_at: now.toISOString(),
        })

        // ─── 7. Return result ─────────────────────────────────────
        return new Response(
            JSON.stringify({ pointsEarned, streakBonus, newTotal, streakCount }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (err) {
        return new Response(
            JSON.stringify({ error: (err as Error).message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
