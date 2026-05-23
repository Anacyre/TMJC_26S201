import { supabase } from '@/lib/supabase'
import * as mock from '@/lib/mockBackend'

const USE_MOCK = mock.USE_MOCK

/**
 * 将数据库行映射为前端 Notification 对象
 */
function rowToNotification(row, state = {}) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    subject: row.subject || '',
    deadline: row.deadline || '',
    description: row.description || '',
    attachment: row.attachment || '',
    attachmentUrl: row.attachment_url || '',
    by: row.by || 'Admin',
    createdAt: row.created_at,
    // 每个用户的个人状态（来自 notification_user_states 或默认值）
    hidden: state.hidden ?? false,
    read: state.read ?? false,
    important: state.important ?? false,
    inPlanner: state.in_planner ?? false,
  }
}

/**
 * 获取通知列表（含当前用户的个人状态）
 * @param {{ hidden?: boolean }} options
 */
export async function fetchNotifications(options = {}) {
  if (USE_MOCK) return mock.fetchNotifications(options)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], error: new Error('未登录') }

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return { data: [], error }
  if (!data || data.length === 0) return { data: [], error: null }

  const { data: states } = await supabase
    .from('notification_user_states')
    .select('notification_id, hidden, read, important, in_planner')
    .eq('user_id', user.id)
    .in('notification_id', data.map((n) => n.id))

  const stateMap = new Map((states || []).map((s) => [s.notification_id, s]))
  const list = data.map((row) => rowToNotification(row, stateMap.get(row.id) || {}))

  const filtered = options.hidden !== undefined
    ? list.filter((n) => n.hidden === options.hidden)
    : list

  return { data: filtered, error: null }
}

/**
 * 创建通知（仅管理员）
 */
export async function createNotification(payload) {
  if (USE_MOCK) return mock.createNotification(payload)
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      type: payload.type,
      title: payload.title,
      subject: payload.subject || '',
      deadline: payload.deadline || '',
      description: payload.description || '',
      attachment: payload.attachment || '',
      attachment_url: payload.attachmentUrl || '',
      important: payload.important || false,
      by: payload.by || 'Admin',
    })
    .select()
    .single()

  return { data: data ? rowToNotification(data) : null, error }
}

/**
 * 更新当前用户对某条通知的个人状态（upsert）
 */
async function upsertState(notificationId, patch) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: new Error('未登录') }

  const { error } = await supabase
    .from('notification_user_states')
    .upsert(
      { user_id: user.id, notification_id: notificationId, ...patch },
      { onConflict: 'user_id,notification_id' }
    )

  return { error }
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

export async function setInPlanner(notificationId, value) {
  if (USE_MOCK) return mock.setInPlanner(notificationId, value)
  return upsertState(notificationId, { in_planner: value })
}

/**
 * 删除通知（仅管理员）
 */
export async function deleteNotification(notificationId) {
  if (USE_MOCK) return mock.deleteNotification(notificationId)
  const { error } = await supabase.from('notifications').delete().eq('id', notificationId)
  return { error }
}
