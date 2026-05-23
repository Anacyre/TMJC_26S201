import { supabase } from '@/lib/supabase'
import * as mock from '@/lib/mockBackend'

const USE_MOCK = mock.USE_MOCK

/**
 * 将数据库行映射为前端 Task 对象
 */
function rowToTask(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    deadline: row.deadline || 'Anytime',
    subject: row.subject || 'General',
    priority: row.priority || 'P3',
    status: row.status || 'today',
    reminder: row.reminder || 'None',
    done: row.done || false,
    checklist: row.checklist || [],
    relatedNotice: row.related_notice || null,
    sourceNoticeId: row.source_notice_id || '',
    createdAt: row.created_at,
  }
}

/**
 * 获取当前用户的全部任务
 * @param {{ status?: string }} options
 */
export async function fetchTasks(options = {}) {
  if (USE_MOCK) return mock.fetchTasks(options)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], error: new Error('未登录') }

  let query = supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (options.status) query = query.eq('status', options.status)

  const { data, error } = await query
  return { data: error ? [] : data.map(rowToTask), error }
}

/**
 * 创建任务
 */
export async function createTask(payload) {
  if (USE_MOCK) return mock.createTask(payload)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: new Error('未登录') }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      title: payload.title?.trim() || 'Untitled Task',
      description: payload.description?.trim() || '',
      deadline: payload.deadline?.trim() || 'Anytime',
      subject: payload.subject?.trim() || 'General',
      priority: payload.priority || 'P3',
      status: payload.status || 'today',
      reminder: payload.reminder?.trim() || 'None',
      done: false,
      checklist: payload.checklist || [],
      related_notice: payload.relatedNotice || null,
      source_notice_id: payload.sourceNoticeId || '',
    })
    .select()
    .single()

  return { data: data ? rowToTask(data) : null, error }
}

/**
 * 更新任务
 */
export async function updateTask(taskId, payload) {
  if (USE_MOCK) return mock.updateTask(taskId, payload)
  const { data, error } = await supabase
    .from('tasks')
    .update({
      title: payload.title?.trim(),
      description: payload.description?.trim() ?? '',
      deadline: payload.deadline?.trim() ?? 'Anytime',
      subject: payload.subject?.trim() ?? 'General',
      priority: payload.priority,
      status: payload.status,
      reminder: payload.reminder?.trim() ?? 'None',
      done: payload.done,
      checklist: payload.checklist,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select()
    .single()

  return { data: data ? rowToTask(data) : null, error }
}

/**
 * 删除任务
 */
export async function deleteTask(taskId) {
  if (USE_MOCK) return mock.deleteTask(taskId)
  const { error } = await supabase.from('tasks').delete().eq('id', taskId)
  return { error }
}

/**
 * Archive a completed task
 */
export async function archiveTask(taskId) {
  if (USE_MOCK) return mock.archiveTask(taskId)
  const { data, error } = await supabase
    .from('tasks')
    .update({ status: 'archived', done: true, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .select()
    .single()
  return { data: data ? rowToTask(data) : null, error }
}

/**
 * 切换任务完成状态
 */
export async function toggleTaskDone(taskId, currentDone) {
  if (USE_MOCK) return mock.toggleTaskDone(taskId, currentDone)
  const newDone = !currentDone
  const { data, error } = await supabase
    .from('tasks')
    .update({
      done: newDone,
      status: newDone ? 'completed' : 'today',
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select()
    .single()

  return { data: data ? rowToTask(data) : null, error }
}

/**
 * 切换 Checklist 某一项的完成状态
 */
export async function toggleChecklistItem(taskId, checklistId) {
  if (USE_MOCK) return mock.toggleChecklistItem(taskId, checklistId)
  const { data: taskRow, error: fetchError } = await supabase
    .from('tasks')
    .select('checklist')
    .eq('id', taskId)
    .single()

  if (fetchError) return { error: fetchError }

  const checklist = (taskRow.checklist || []).map((item) =>
    item.id === checklistId ? { ...item, done: !item.done } : item
  )

  const { data, error } = await supabase
    .from('tasks')
    .update({ checklist, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .select()
    .single()

  return { data: data ? rowToTask(data) : null, error }
}
