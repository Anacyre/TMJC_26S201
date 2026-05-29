import { supabase } from '@/lib/supabase'
import * as mock from '@/lib/mockBackend'
import { isAdminMember } from '@/lib/classMembers'

const USE_MOCK = mock.USE_MOCK

function rowToSound(row) {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon || 'water',
    color: row.color || '',
    audioUrl: row.audio_url,
    fileKey: row.file_key || '',
    durationSeconds: Number(row.duration_seconds) || 0,
    source: 'shared',
    createdAt: row.created_at,
  }
}

async function requireAdminCaller() {
  if (USE_MOCK) {
    const { error } = await mock.requireAdminCaller()
    return error
  }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Error('Not signed in')
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, is_admin')
    .eq('id', user.id)
    .maybeSingle()
  if (error) return error
  if (!isAdminMember(profile)) return new Error('Admins only')
  return null
}

export async function fetchSharedSounds() {
  if (USE_MOCK) return mock.fetchFocusSounds()
  const { data, error } = await supabase
    .from('focus_sounds')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return { data: [], error }
  return { data: (data || []).map(rowToSound), error: null }
}

export async function addSharedSound(record) {
  if (USE_MOCK) return mock.addFocusSound(record)
  const denied = await requireAdminCaller()
  if (denied) return { data: null, error: denied }

  const { data, error } = await supabase
    .from('focus_sounds')
    .insert({
      name: record.name,
      icon: record.icon || 'water',
      color: record.color || '',
      audio_url: record.audioUrl,
      file_key: record.fileKey || '',
      duration_seconds: record.durationSeconds || 0,
    })
    .select('*')
    .single()

  if (error) return { data: null, error }
  return { data: rowToSound(data), error: null }
}

export async function removeSharedSound(id) {
  if (USE_MOCK) return mock.removeFocusSound(id)
  const denied = await requireAdminCaller()
  if (denied) return { error: denied }

  const { data: row } = await supabase
    .from('focus_sounds')
    .select('file_key')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase.from('focus_sounds').delete().eq('id', id)
  if (error) return { error }

  if (row?.file_key) {
    await supabase.storage.from('class-os-files').remove([row.file_key])
  }
  return { error: null }
}
