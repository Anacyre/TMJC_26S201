import { ref } from 'vue'
import { fetchDueReminders, markRemindersSeen } from '@/api/reminders'
import { toast } from '@/composables/useToast'

// Minimum gap between reminder checks so repeated App.onShow calls don't spam.
const MIN_CHECK_INTERVAL = 20000

const dueReminders = ref([])
let lastCheckedAt = 0
let checking = false

function buildToastMessage(events) {
  if (events.length === 1) {
    const e = events[0]
    const label = e.sourceType === 'notice' ? 'Notice' : 'Task'
    return `Reminder · ${label}: ${e.title || 'Untitled'}`
  }
  return `${events.length} reminders · ${events[0].title || 'Untitled'} +${events.length - 1} more`
}

/**
 * Poll the per-user reminder inbox and surface any due reminders as a toast.
 * Safe to call from App.onShow / bootstrap; self-throttles.
 */
export async function checkDueReminders({ force = false } = {}) {
  const now = Date.now()
  if (!force && now - lastCheckedAt < MIN_CHECK_INTERVAL) return
  if (checking) return
  checking = true
  lastCheckedAt = now
  try {
    const { data, error } = await fetchDueReminders()
    if (error || !data?.length) {
      dueReminders.value = []
      return
    }
    dueReminders.value = data
    toast.show(buildToastMessage(data), { duration: 4200 })
    const { error: ackError } = await markRemindersSeen(data.map((e) => e.id))
    if (!ackError) dueReminders.value = []
  } catch (err) {
    console.error('[useReminders] checkDueReminders:', err?.message || err)
  } finally {
    checking = false
  }
}

export function resetRemindersSession() {
  dueReminders.value = []
  lastCheckedAt = 0
  checking = false
}

export function useReminders() {
  return { dueReminders, checkDueReminders }
}
