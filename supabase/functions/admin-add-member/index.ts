/// <reference path="../deno.d.ts" />
import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function memberEmail(username: string, role = 'student') {
  if (role === 'teacher_admin') return ''
  return `${username}@students.edu.sg`
}

function authLoginEmail(username: string, role = 'student') {
  if (role === 'teacher_admin') return `${username}@class.com`
  return `${username}@students.edu.sg`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) return json({ error: 'Unauthorized' }, 401)

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('is_admin, role')
      .eq('id', user.id)
      .single()

    const isAdmin =
      callerProfile?.is_admin ||
      callerProfile?.role === 'admin' ||
      callerProfile?.role === 'teacher_admin'
    if (!isAdmin) return json({ error: 'Admin only' }, 403)

    const body = await req.json()
    const {
      username,
      display_name,
      email,
      role = 'student',
      birthday = '',
      is_admin = false,
    } = body

    const cleanUsername = String(username || '').trim().toLowerCase()
    const cleanDisplay = String(display_name || '').trim()
    if (!cleanUsername || !/^[a-z0-9_]+$/.test(cleanUsername)) {
      return json({ error: 'Username required (lowercase, underscores only)' }, 400)
    }
    if (!cleanDisplay) return json({ error: 'Display name required' }, 400)

    const memberRole = role === 'admin' || role === 'teacher_admin' ? role : 'student'
    const adminFlag = is_admin || memberRole === 'admin' || memberRole === 'teacher_admin'
    const cleanEmail =
      String(email || '').trim().toLowerCase() || authLoginEmail(cleanUsername, memberRole)
    const profileEmail = memberEmail(cleanUsername, memberRole)
    const defaultPassword = '123456'

    const { data: existingUsername } = await adminClient
      .from('profiles')
      .select('id')
      .ilike('username', cleanUsername)
      .maybeSingle()
    if (existingUsername) return json({ error: 'Username already exists' }, 409)

    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password: defaultPassword,
      email_confirm: true,
      app_metadata: { must_change_password: true, is_admin: adminFlag },
      user_metadata: {
        username: cleanUsername,
        display_name: cleanDisplay,
        role: memberRole,
      },
    })

    if (createError) return json({ error: createError.message }, 400)

    const userId = authData.user!.id

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .update({
        username: cleanUsername,
        display_name: cleanDisplay,
        name: cleanDisplay,
        email: profileEmail || null,
        role: memberRole,
        is_admin: adminFlag,
        birthday: birthday || '',
        must_change_password: true,
      })
      .eq('id', userId)
      .select('*')
      .single()

    if (profileError) return json({ error: profileError.message }, 500)

    return json({ data: profile })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
