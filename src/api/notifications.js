import { supabase } from '@/lib/supabase'
import * as mock from '@/lib/mockBackend'
import { isAdminMember } from '@/lib/classMembers'
import { adminModeEnabled } from '@/composables/adminModeState'
import { canEditNotice } from '@/lib/noticePermissions'

const USE_MOCK = mock.USE_MOCK

/**
 * Map a database row to a frontend Notification object
 */
function rowToNotification(row, state) {
  const hasUserState = state != null
  const s = state || {}
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    subject: row.subject || '',
    deadline: row.deadline || '',
    deadlineAt: row.deadline_at || '',
    description: row.description || '',
    attachment: row.attachment || '',
    attachmentUrl: row.attachment_url || '',
    by: row.by || 'Admin',
    createdBy: row.created_by || '',
    createdAt: row.created_at,
    hidden: !!s.hidden,
    read: !!s.read,
    important: !!s.important,
    inPlanner: !!s.in_planner,
    hasUserState,
  }
}

/**
 * Fetch notifications (including per-user state)
 * @param {{ hidden?: boolean }} options
 */
export async function fetchNotifications(options = {}) {
  if (USE_MOCK) return mock.fetchNotifications(options)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], error: new Error('Not signed in'), userId: '' }

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return { data: [], error, userId: user.id }
  if (!data || data.length === 0) return { data: [], error: null, userId: user.id }

  const { data: states } = await supabase
    .from('notification_user_states')
    .select('notification_id, hidden, read, important, in_planner')
    .eq('user_id', user.id)
    .in('notification_id', data.map((n) => n.id))

  const stateMap = new Map((states || []).map((s) => [s.notification_id, s]))
  const list = data.map((row) => rowToNotification(row, stateMap.get(row.id)))

  const filtered = options.hidden !== undefined
    ? list.filter((n) => n.hidden === options.hidden)
    : list

  return { data: filtered, error: null, userId: user.id }
}

async function fetchNoticeUserState(userId, notificationId) {
  const { data } = await supabase
    .from('notification_user_states')
    .select('notification_id, hidden, read, important, in_planner')
    .eq('user_id', userId)
    .eq('notification_id', notificationId)
    .maybeSingle()
  return data || null
}

async function assertNoticeMutable(notificationId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: new Error('Not signed in'), user: null }

  const { data: row, error: fetchError } = await supabase
    .from('notifications')
    .select('id, created_by')
    .eq('id', notificationId)
    .maybeSingle()
  if (fetchError) return { error: fetchError, user }
  if (!row) return { error: new Error('Notice not found'), user }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_admin, username, display_name, name')
    .eq('id', user.id)
    .maybeSingle()
  if (profileError) return { error: profileError, user }

  const allowed = canEditNotice(
    { id: row.id, createdBy: row.created_by },
    {
      userId: user.id,
      isAdminActive: isAdminMember(profile) && adminModeEnabled.value,
    },
  )
  if (!allowed) return { error: new Error('Not allowed'), user }
  return { error: null, user }
}

/**
 * Create a notification (admins only)
 */
export async function createNotification(payload) {
  if (USE_MOCK) return mock.createNotification(payload)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: new Error('Not signed in') }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) return { data: null, error: profileError }
  if (!isAdminMember(profile)) return { data: null, error: new Error('Admins only') }

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      type: payload.type,
      title: payload.title,
      subject: payload.subject || '',
      deadline: payload.deadline || '',
      deadline_at: payload.deadlineAt || null,
      description: payload.description || '',
      attachment: payload.attachment || '',
      attachment_url: payload.attachmentUrl || '',
      important: payload.important || false,
      by: payload.by || 'Admin',
      created_by: user.id,
    })
    .select()
    .single()

  return { data: data ? rowToNotification(data) : null, error }
}

/**
 * Upsert the current user's personal state for a notification.
 * Uses partial UPDATE so concurrent patches (e.g. in_planner + hidden) do not clobber each other.
 */
async function upsertState(notificationId, patch) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: new Error('Not signed in'), userId: '' }

  const now = new Date().toISOString()
  const { data: updated, error: updateError } = await supabase
    .from('notification_user_states')
    .update({ ...patch, updated_at: now })
    .eq('user_id', user.id)
    .eq('notification_id', notificationId)
    .select('notification_id')
    .maybeSingle()

  if (updateError) return { error: updateError, userId: user.id }
  if (updated) return { error: null, userId: user.id }

  const row = {
    user_id: user.id,
    notification_id: notificationId,
    hidden: false,
    read: false,
    important: false,
    in_planner: false,
    updated_at: now,
    ...patch,
  }

  const { error: insertError } = await supabase
    .from('notification_user_states')
    .insert(row)

  return { error: insertError, userId: user.id }
}

/** Atomically patch multiple state fields in one request. */
export async function patchNotificationState(notificationId, patch) {
  if (USE_MOCK) return mock.patchNotificationState(notificationId, patch)
  const apiPatch = {}
  if (patch.hidden !== undefined) apiPatch.hidden = !!patch.hidden
  if (patch.read !== undefined) apiPatch.read = !!patch.read
  if (patch.important !== undefined) apiPatch.important = !!patch.important
  if (patch.in_planner !== undefined) apiPatch.in_planner = !!patch.in_planner
  if (patch.inPlanner !== undefined) apiPatch.in_planner = !!patch.inPlanner
  return upsertState(notificationId, apiPatch)
}

export async function markRead(notificationId) {
  if (USE_MOCK) return mock.markRead(notificationId)
  return upsertState(notificationId, { read: true })
}

export async function toggleImportant(notificationId, currentValue) {
  if (USE_MOCK) return mock.toggleImportant(notificationId, currentValue)
  return upsertState(notificationId, { important: !currentValue })
}

export async function toggleHidden(notificationId, currentValue) {
  if (USE_MOCK) return mock.toggleHidden(notificationId, currentValue)
  return upsertState(notificationId, { hidden: !currentValue })
}

export async function setHidden(notificationId, hidden) {
  if (USE_MOCK) return mock.setHidden(notificationId, hidden)
  return upsertState(notificationId, { hidden: !!hidden })
}

export async function setInPlanner(notificationId, value) {
  if (USE_MOCK) return mock.setInPlanner(notificationId, value)
  return upsertState(notificationId, { in_planner: value })
}

/**
 * Update a notification (publisher or admin with admin mode)
 */
export async function updateNotification(notificationId, payload) {
  if (USE_MOCK) return mock.updateNotification(notificationId, payload)
  const gate = await assertNoticeMutable(notificationId)
  if (gate.error) return { data: null, error: gate.error }

  const patch = {}
  if (payload.type !== undefined) patch.type = String(payload.type || '').trim()
  if (payload.title !== undefined) patch.title = String(payload.title || '').trim()
  if (payload.subject !== undefined) patch.subject = String(payload.subject || '').trim()
  if (payload.deadline !== undefined) patch.deadline = String(payload.deadline || '').trim()
  if (payload.deadlineAt !== undefined) patch.deadline_at = payload.deadlineAt || null
  if (payload.description !== undefined) patch.description = String(payload.description || '').trim()
  if (payload.attachment !== undefined) patch.attachment = String(payload.attachment || '').trim()
  if (payload.attachmentUrl !== undefined) patch.attachment_url = String(payload.attachmentUrl || '').trim()
  if (payload.important !== undefined) patch.important = !!payload.important

  const { data, error } = await supabase
    .from('notifications')
    .update(patch)
    .eq('id', notificationId)
    .select('*')
    .single()

  if (error || !data) return { data: null, error: error || new Error('Update failed') }

  const state = await fetchNoticeUserState(gate.user.id, notificationId)
  return { data: rowToNotification(data, state), error: null }
}

/**
 * Delete a notification (publisher or admin with admin mode)
 */
export async function deleteNotification(notificationId) {
  if (USE_MOCK) return mock.deleteNotification(notificationId)
  const gate = await assertNoticeMutable(notificationId)
  if (gate.error) return { error: gate.error, userId: gate.user?.id || '' }

  const { error } = await supabase.from('notifications').delete().eq('id', notificationId)
  return { error, userId: gate.user.id }
}
