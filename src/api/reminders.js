import { supabase } from '@/lib/supabase'
import * as mock from '@/lib/mockBackend'

const USE_MOCK = mock.USE_MOCK

function rowToReminderEvent(row) {
  return {
    id: row.id,
    sourceType: row.source_type,
    sourceId: row.source_id,
    title: row.title || '',
    body: row.body || '',
    dueAt: row.due_at,
    seenAt: row.seen_at || '',
    createdAt: row.created_at,
  }
}

/**
 * Fetch this user's undelivered (unseen) reminder events.
 * The server-side pg_cron dispatcher populates reminder_events; the client
 * just reads and acknowledges them.
 */
export async function fetchDueReminders() {
  if (USE_MOCK) {
    const { data, error } = await mock.fetchDueReminders()
    return { data: (data || []).map(rowToReminderEvent), error }
  }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], error: null }

  const { data, error } = await supabase
    .from('reminder_events')
    .select('*')
    .eq('user_id', user.id)
    .is('seen_at', null)
    .order('due_at', { ascending: true })

  if (error) return { data: [], error }
  return { data: (data || []).map(rowToReminderEvent), error: null }
}

/** Acknowledge reminder events so they are not shown again. */
export async function markRemindersSeen(ids) {
  if (USE_MOCK) return mock.markRemindersSeen(ids)
  if (!ids?.length) return { error: null }
  const { error } = await supabase
    .from('reminder_events')
    .update({ seen_at: new Date().toISOString() })
    .in('id', ids)
  return { error }
}
