import { supabase } from '@/lib/supabase'
import * as mock from '@/lib/mockBackend'
import { isTestMaintainer } from '@/lib/testAccount'

const USE_MOCK = mock.USE_MOCK

function profileName(profile) {
  return profile?.display_name || profile?.name || 'Unknown'
}

function rowToThread(row, profile, previewMessage) {
  return {
    id: row.id,
    userId: row.user_id,
    userName: profileName(profile),
    status: row.status || 'open',
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
    resolvedAt: row.resolved_at || null,
    resolvedBy: row.resolved_by || null,
    preview: previewMessage?.body || '',
    previewAt: previewMessage?.created_at || row.created_at,
  }
}

function rowToMessage(row, profile) {
  return {
    id: row.id,
    threadId: row.thread_id,
    senderId: row.sender_id,
    senderName: profileName(profile),
    body: row.body,
    createdAt: row.created_at,
  }
}

async function getCurrentProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, profile: null }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, display_name, name')
    .eq('id', user.id)
    .maybeSingle()

  if (error) return { user, profile: null }
  return { user, profile }
}

async function getProfilesByIds(ids) {
  const unique = [...new Set((ids || []).filter(Boolean))]
  if (!unique.length) return new Map()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, name')
    .in('id', unique)
  if (error) return new Map()
  return new Map((data || []).map((p) => [p.id, p]))
}

export async function fetchFeedbackThreads() {
  if (USE_MOCK) return mock.fetchFeedbackThreads()

  const { user, profile } = await getCurrentProfile()
  if (!user) return { data: [], error: new Error('Not signed in') }

  const maintainer = isTestMaintainer(profile)
  let query = supabase
    .from('feedback_threads')
    .select('id, user_id, status, created_at, updated_at, resolved_at, resolved_by')
    .order('updated_at', { ascending: false })

  if (!maintainer) query = query.eq('user_id', user.id)

  const { data: threads, error } = await query
  if (error) return { data: [], error }

  const threadIds = (threads || []).map((t) => t.id)
  if (!threadIds.length) return { data: [], error: null }

  const profileMap = await getProfilesByIds((threads || []).map((t) => t.user_id))

  const { data: messages, error: msgError } = await supabase
    .from('feedback_messages')
    .select('id, thread_id, body, created_at')
    .in('thread_id', threadIds)
    .order('created_at', { ascending: false })

  if (msgError) return { data: [], error: msgError }

  const previewByThread = new Map()
  for (const msg of messages || []) {
    if (!previewByThread.has(msg.thread_id)) previewByThread.set(msg.thread_id, msg)
  }

  return {
    data: (threads || []).map((row) => rowToThread(
      row,
      profileMap.get(row.user_id),
      previewByThread.get(row.id)
    )),
    error: null,
  }
}

export async function fetchFeedbackMessages(threadId) {
  if (USE_MOCK) return mock.fetchFeedbackMessages(threadId)

  const { user, profile } = await getCurrentProfile()
  if (!user) return { data: [], error: new Error('Not signed in') }

  const { data: thread, error: threadError } = await supabase
    .from('feedback_threads')
    .select('id, user_id')
    .eq('id', threadId)
    .maybeSingle()

  if (threadError) return { data: [], error: threadError }
  if (!thread) return { data: [], error: new Error('Thread not found') }
  if (thread.user_id !== user.id && !isTestMaintainer(profile)) {
    return { data: [], error: new Error('Not allowed') }
  }

  const { data, error } = await supabase
    .from('feedback_messages')
    .select('id, thread_id, sender_id, body, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  if (error) return { data: [], error }

  const profileMap = await getProfilesByIds((data || []).map((row) => row.sender_id))
  return {
    data: (data || []).map((row) => rowToMessage(row, profileMap.get(row.sender_id))),
    error: null,
  }
}

export async function createFeedbackThread(body) {
  if (USE_MOCK) return mock.createFeedbackThread(body)

  const text = String(body || '').trim()
  if (!text) return { data: null, error: new Error('Message required') }

  const { user } = await getCurrentProfile()
  if (!user) return { data: null, error: new Error('Not signed in') }

  const now = new Date().toISOString()
  const { data: thread, error: threadError } = await supabase
    .from('feedback_threads')
    .insert({
      user_id: user.id,
      status: 'open',
      created_at: now,
      updated_at: now,
    })
    .select('id, user_id, status, created_at, updated_at, resolved_at, resolved_by')
    .single()

  if (threadError || !thread) return { data: null, error: threadError || new Error('Could not create thread') }

  const { error: msgError } = await supabase
    .from('feedback_messages')
    .insert({
      thread_id: thread.id,
      sender_id: user.id,
      body: text,
    })

  if (msgError) return { data: null, error: msgError }

  const profileMap = await getProfilesByIds([thread.user_id])
  return {
    data: rowToThread(thread, profileMap.get(thread.user_id), { body: text, created_at: now }),
    error: null,
  }
}

export async function addFeedbackMessage(threadId, body) {
  if (USE_MOCK) return mock.addFeedbackMessage(threadId, body)

  const text = String(body || '').trim()
  if (!text) return { data: null, error: new Error('Message required') }

  const { user, profile } = await getCurrentProfile()
  if (!user) return { data: null, error: new Error('Not signed in') }

  const { data: thread, error: threadError } = await supabase
    .from('feedback_threads')
    .select('id, user_id, status')
    .eq('id', threadId)
    .maybeSingle()

  if (threadError) return { data: null, error: threadError }
  if (!thread) return { data: null, error: new Error('Thread not found') }

  const isOwner = thread.user_id === user.id
  const maintainer = isTestMaintainer(profile)
  if (!isOwner && !maintainer) return { data: null, error: new Error('Not allowed') }

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('feedback_messages')
    .insert({
      thread_id: threadId,
      sender_id: user.id,
      body: text,
    })
    .select('id, thread_id, sender_id, body, created_at')
    .single()

  if (error) return { data: null, error }

  await supabase
    .from('feedback_threads')
    .update({ updated_at: now })
    .eq('id', threadId)

  const profileMap = await getProfilesByIds([user.id])
  return { data: rowToMessage(data, profileMap.get(user.id)), error: null }
}

export async function resolveFeedbackThread(threadId) {
  if (USE_MOCK) return mock.resolveFeedbackThread(threadId)

  const { user, profile } = await getCurrentProfile()
  if (!user) return { data: null, error: new Error('Not signed in') }
  if (!isTestMaintainer(profile)) return { data: null, error: new Error('Maintainers only') }

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('feedback_threads')
    .update({
      status: 'resolved',
      resolved_at: now,
      resolved_by: user.id,
      updated_at: now,
    })
    .eq('id', threadId)
    .select('id, user_id, status, created_at, updated_at, resolved_at, resolved_by')
    .single()

  if (error || !data) return { data: null, error: error || new Error('Could not resolve') }

  const { data: preview } = await supabase
    .from('feedback_messages')
    .select('body, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const profileMap = await getProfilesByIds([data.user_id])
  return { data: rowToThread(data, profileMap.get(data.user_id), preview), error: null }
}

export async function deleteFeedbackThread(threadId) {
  if (USE_MOCK) return mock.deleteFeedbackThread(threadId)

  const { user, profile } = await getCurrentProfile()
  if (!user) return { error: new Error('Not signed in') }

  const { data: thread, error: threadError } = await supabase
    .from('feedback_threads')
    .select('id, user_id')
    .eq('id', threadId)
    .maybeSingle()

  if (threadError) return { error: threadError }
  if (!thread) return { error: new Error('Thread not found') }

  const isOwner = thread.user_id === user.id
  const maintainer = isTestMaintainer(profile)
  if (!isOwner && !maintainer) return { error: new Error('Not allowed') }

  const { error } = await supabase
    .from('feedback_threads')
    .delete()
    .eq('id', threadId)

  return { error }
}
