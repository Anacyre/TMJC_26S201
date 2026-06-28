import { computed, ref } from 'vue'
import {
  fetchFeedbackThreads as apiFetchThreads,
  fetchFeedbackMessages as apiFetchMessages,
  createFeedbackThread,
  addFeedbackMessage,
  resolveFeedbackThread,
  deleteFeedbackThread,
} from '@/api/feedback'
import { currentUser } from '@/composables/useUserStore'
import { isTestMaintainer } from '@/lib/testAccount'

const threads = ref([])
const messagesByThread = ref({})
const loading = ref(false)

const isMaintainer = computed(() => isTestMaintainer(currentUser.value))

const openThreads = computed(() => threads.value.filter((t) => t.status === 'open'))
const resolvedThreads = computed(() => threads.value.filter((t) => t.status === 'resolved'))

function upsertThread(thread) {
  if (!thread?.id) return
  const idx = threads.value.findIndex((t) => t.id === thread.id)
  if (idx >= 0) threads.value[idx] = { ...threads.value[idx], ...thread }
  else threads.value.unshift(thread)
}

function setMessages(threadId, rows) {
  messagesByThread.value = {
    ...messagesByThread.value,
    [threadId]: rows,
  }
}

function appendMessage(threadId, message) {
  const prev = messagesByThread.value[threadId] || []
  setMessages(threadId, [...prev, message])
}

async function fetchThreads({ force = false } = {}) {
  if (threads.value.length && !force) return { error: null }
  loading.value = true
  try {
    const { data, error } = await apiFetchThreads()
    if (!error) threads.value = data || []
    return { error }
  } finally {
    loading.value = false
  }
}

async function fetchMessages(threadId, { force = false } = {}) {
  if (!threadId) return { error: new Error('Missing thread') }
  if (messagesByThread.value[threadId]?.length && !force) return { error: null }
  const { data, error } = await apiFetchMessages(threadId)
  if (!error) setMessages(threadId, data || [])
  return { error }
}

async function sendFeedback(body) {
  const { data, error } = await createFeedbackThread(body)
  if (!error && data) upsertThread(data)
  return { data, error }
}

async function replyFeedback(threadId, body) {
  const { data, error } = await addFeedbackMessage(threadId, body)
  if (!error && data) {
    appendMessage(threadId, data)
    upsertThread({
      id: threadId,
      preview: data.body,
      previewAt: data.createdAt,
      updatedAt: data.createdAt,
    })
  }
  return { data, error }
}

async function resolveThread(threadId) {
  const { data, error } = await resolveFeedbackThread(threadId)
  if (!error && data) upsertThread(data)
  return { data, error }
}

function removeThread(threadId) {
  threads.value = threads.value.filter((t) => t.id !== threadId)
  const next = { ...messagesByThread.value }
  delete next[threadId]
  messagesByThread.value = next
}

async function deleteThread(threadId) {
  const { error } = await deleteFeedbackThread(threadId)
  if (!error) removeThread(threadId)
  return { error }
}

function canDeleteThread(thread) {
  if (!thread?.id || !currentUser.value.id) return false
  return thread.userId === currentUser.value.id || isMaintainer.value
}

function getThreadById(id) {
  return threads.value.find((t) => t.id === id) || null
}

function getMessages(threadId) {
  return messagesByThread.value[threadId] || []
}

function resetFeedbackSession() {
  threads.value = []
  messagesByThread.value = {}
  loading.value = false
}

export function useFeedbackStore() {
  return {
    threads,
    openThreads,
    resolvedThreads,
    loading,
    isMaintainer,
    fetchThreads,
    fetchMessages,
    sendFeedback,
    replyFeedback,
    resolveThread,
    deleteThread,
    canDeleteThread,
    getThreadById,
    getMessages,
    resetFeedbackSession,
  }
}

export { resetFeedbackSession }
