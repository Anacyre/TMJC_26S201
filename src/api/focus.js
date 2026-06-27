import { supabase } from '@/lib/supabase'
import * as mock from '@/lib/mockBackend'

const USE_MOCK = mock.USE_MOCK

function rowToSession(row) {
  return {
    id: row.id,
    clientId: row.client_id || '',
    minutes: row.minutes,
    subject: row.subject || 'Focus',
    soundId: row.sound_id || 'silence',
    endedAt: row.ended_at,
    synced: true,
  }
}

/**
 * Fetch focus prefs for a specific user profile.
 * @param {string} userId
 */
export async function fetchFocusPrefsForUser(userId) {
  if (USE_MOCK) return mock.fetchFocusPrefsForUser(userId)
  if (!userId) return { data: null, error: new Error('User required') }

  const { data, error } = await supabase
    .from('profiles')
    .select('focus_prefs')
    .eq('id', userId)
    .maybeSingle()

  if (error) return { data: null, error }
  return { data: data?.focus_prefs || null, error: null }
}

/**
 * Fetch focus sessions for a specific user (respects visibility unless viewer is self).
 * @param {string} userId
 */
export async function fetchFocusSessionsForUser(userId) {
  if (USE_MOCK) return mock.fetchFocusSessionsForUser(userId)
  if (!userId) return { data: [], error: new Error('User required') }

  const { data: { user } } = await supabase.auth.getUser()
  const { data: prefs, error: prefsError } = await fetchFocusPrefsForUser(userId)
  if (prefsError) return { data: [], error: prefsError }
  if (prefs?.visibility === 'private' && user?.id !== userId) {
    return { data: [], error: null }
  }

  const { data, error } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('ended_at', { ascending: false })
    .limit(200)

  if (error) return { data: [], error }
  return { data: (data || []).map(rowToSession), error: null }
}

/**
 * Fetch focus sessions for the current user (newest first, max 200).
 */
export async function fetchFocusSessions() {
  if (USE_MOCK) return mock.fetchFocusSessions()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], error: new Error('Not signed in') }

  const { data, error } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('ended_at', { ascending: false })
    .limit(200)

  if (error) return { data: [], error }
  return { data: (data || []).map(rowToSession), error: null }
}

/**
 * Record a completed focus session.
 * @param {{ minutes: number, subject?: string, soundId?: string, endedAt?: string, clientId?: string }} payload
 */
export async function createFocusSession(payload) {
  if (USE_MOCK) return mock.createFocusSession(payload)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: new Error('Not signed in') }

  const row = {
    user_id: user.id,
    client_id: payload.clientId || null,
    minutes: Math.round(payload.minutes),
    subject: payload.subject || 'Focus',
    sound_id: payload.soundId || 'silence',
    ended_at: payload.endedAt || new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('focus_sessions')
    .insert(row)
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505' && payload.clientId) {
      const { data: existing, error: fetchError } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('client_id', payload.clientId)
        .maybeSingle()
      if (!fetchError && existing) return { data: rowToSession(existing), error: null }
    }
    return { data: null, error }
  }

  return { data: rowToSession(data), error: null }
}

/**
 * Fetch focus prefs stored on the user profile.
 */
export async function fetchFocusPrefs() {
  if (USE_MOCK) return mock.fetchFocusPrefs()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: new Error('Not signed in') }

  const { data, error } = await supabase
    .from('profiles')
    .select('focus_prefs')
    .eq('id', user.id)
    .maybeSingle()

  if (error) return { data: null, error }
  return { data: data?.focus_prefs || null, error: null }
}

/**
 * Persist focus prefs to the user profile.
 */
export async function saveFocusPrefs(prefs) {
  if (USE_MOCK) return mock.saveFocusPrefs(prefs)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: new Error('Not signed in') }

  const { data, error } = await supabase
    .from('profiles')
    .update({ focus_prefs: prefs, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select('focus_prefs')
    .single()

  if (error) return { data: null, error }
  return { data: data?.focus_prefs || prefs, error: null }
}
