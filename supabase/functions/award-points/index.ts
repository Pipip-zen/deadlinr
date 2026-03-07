// @ts-nocheck
// Supabase Edge Function: award-points
// Invoked after a task_completion is inserted (via DB webhook or trigger).
// Uses the service role key to bypass RLS and update student_points.


import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface Payload {
    task_id: string
    user_id: string
    points_earned: number
}

serve(async (req) => {
    try {
        const payload: Payload = await req.json()
        const { user_id, points_earned } = payload

        // Service role — bypasses all RLS
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        // Upsert total points
        const { error } = await supabase.rpc('increment_points', {
            p_user_id: user_id,
            p_points: points_earned,
        })

        if (error) throw error

        return new Response(JSON.stringify({ ok: true }), {
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (err) {
        return new Response(JSON.stringify({ error: (err as Error).message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        })
    }
})

/* -----------------------------------------------------------------------
 * Add this helper SQL function to your migration:
 *
 * create or replace function public.increment_points(p_user_id uuid, p_points int)
 * returns void language plpgsql security definer as $$
 * begin
 *   insert into public.student_points (user_id, total_points, updated_at)
 *     values (p_user_id, p_points, now())
 *   on conflict (user_id)
 *     do update set
 *       total_points = student_points.total_points + p_points,
 *       updated_at   = now();
 * end;
 * $$;
 * ----------------------------------------------------------------------- */
