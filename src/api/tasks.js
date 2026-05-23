import { supabase } from '@/lib/supabase'
import * as mock from '@/lib/mockBackend'
import {
  enrichTask,
  normalizeTaskStatus,
  purgeStaleCompletedTasks,
  resolveTaskStatusFromForm,
  shouldRetainCompletedTask,
} from '@/lib/taskDueDate'

const USE_MOCK = mock.USE_MOCK

function parseDeadlineDate(deadline) {
  if (!deadline) return ''
  const iso = String(deadline).match(/(\d{4}-\d{2}-\d{2})/)
  return iso ? iso[1] : ''
}

function rowToTask(row) {
  const task = {
    id: row.id,
    title: row.title,
    description: row.description || '',
    deadline: row.deadline || 'Anytime',
    subject: row.subject || 'General',
    priority: row.priority || 'P3',
    status: normalizeTaskStatus(row.status),
    reminder: row.reminder || 'None',
    done: row.done || false,
    checklist: row.checklist || [],
    relatedNotice: row.related_notice || null,
    sourceNoticeId: row.source_notice_id || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at || '',
    completedAt: row.completed_at || (row.done ? row.updated_at : '') || '',
  }
  return enrichTask(task)
}

async function deleteCompletedTask(taskId) {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId)
  return { error }
}

/**
 * Fetch all tasks for the current user
 * @param {{ status?: string }} options
 */
export async function fetchTasks(options = {}) {
  if (USE_MOCK) return mock.fetchTasks(options)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], error: new Error('Not signed in') }

  let query = supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (options.status) query = query.eq('status', options.status)

  const { data, error } = await query
  if (error) return { data: [], error }

  const mapped = (data || []).map(rowToTask)
  const stale = mapped.filter((task) => !shouldRetainCompletedTask(task))
  await Promise.all(stale.map((task) => deleteCompletedTask(task.id)))
  return { data: purgeStaleCompletedTasks(mapped), error: null }
}

/**
 * Fetch a single task
 */
export async function fetchTaskById(taskId) {
  if (USE_MOCK) return mock.fetchTaskById(taskId)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: new Error('Not signed in') }

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!data) return { data: null, error }
  if (!shouldRetainCompletedTask(rowToTask(data))) {
    await deleteCompletedTask(taskId)
    return { data: null, error: new Error('Task expired') }
  }
  return { data: rowToTask(data), error }
}

/**
 * Create a task
 */
export async function createTask(payload) {
  if (USE_MOCK) return mock.createTask(payload)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: new Error('Not signed in') }

  const deadlineDate = parseDeadlineDate(payload.deadline)
  const status = payload.status || resolveTaskStatusFromForm({ deadlineDate })

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      title: payload.title?.trim() || 'Untitled Task',
      description: payload.description?.trim() || '',
      deadline: payload.deadline?.trim() || 'Anytime',
      subject: payload.subject?.trim() || 'General',
      priority: payload.priority || 'P3',
      status,
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
 * Update a task
 */
export async function updateTask(taskId, payload) {
  if (USE_MOCK) return mock.updateTask(taskId, payload)
  const deadlineDate = parseDeadlineDate(payload.deadline)
  const status = payload.status || resolveTaskStatusFromForm({
    deadlineDate,
    done: payload.done,
  })

  const { data, error } = await supabase
    .from('tasks')
    .update({
      title: payload.title?.trim(),
      description: payload.description?.trim() ?? '',
      deadline: payload.deadline?.trim() ?? 'Anytime',
      subject: payload.subject?.trim() ?? 'General',
      priority: payload.priority,
      status,
      reminder: payload.reminder?.trim() ?? 'None',
      done: payload.done,
      checklist: payload.checklist,
      completed_at: payload.done ? payload.completedAt || new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select()
    .single()

  return { data: data ? rowToTask(data) : null, error }
}

/**
 * Delete a task
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
 * Toggle task done state
 */
export async function toggleTaskDone(taskId, currentDone) {
  if (USE_MOCK) return mock.toggleTaskDone(taskId, currentDone)
  const { data: existing, error: fetchError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .maybeSingle()

  if (fetchError || !existing) return { data: null, error: fetchError || new Error('Task not found') }

  const newDone = !currentDone
  const now = new Date().toISOString()
  const deadlineDate = parseDeadlineDate(existing.deadline)
  const status = newDone
    ? 'completed'
    : resolveTaskStatusFromForm({ deadlineDate })

  const { data, error } = await supabase
    .from('tasks')
    .update({
      done: newDone,
      status,
      completed_at: newDone ? now : null,
      updated_at: now,
    })
    .eq('id', taskId)
    .select()
    .single()

  return { data: data ? rowToTask(data) : null, error }
}

/**
 * Toggle a checklist item done state
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
