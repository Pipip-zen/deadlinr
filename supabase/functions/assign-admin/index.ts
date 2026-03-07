// @ts-nocheck
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const { email, classId } = await req.json()
        if (!email || !classId) throw new Error('email and classId are required')

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        // 1. Fetch user by email using auth admin API
        // Note: listUsers fetches 50 users by default. We assume the system has < 50 users for this prototype.
        // In production, we should implement a server-side search or store emails in profiles.
        const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers()
        if (authErr) throw new Error(authErr.message)

        const user = users.find((u) => u.email === email)
        if (!user) throw new Error(`User with email ${email} not found`)

        // 2. Update their profile to admin role + assign to class
        const { error: profErr } = await supabase
            .from('profiles')
            .update({ role: 'admin', class_id: classId })
            .eq('id', user.id)

        if (profErr) throw new Error(profErr.message)

        return new Response(JSON.stringify({ success: true, userId: user.id }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
