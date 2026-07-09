import { useUserStore } from '@/composables/useUserStore'
import { useTasksStore, resetTasksSession } from '@/composables/useTasksStore'
import { useNotificationStore } from '@/composables/useNotificationStore'
import { useCommunityStore } from '@/composables/useCommunityStore'
import { useStudyStore, resetStudySession } from '@/composables/useStudyStore'
import { useFocusStore } from '@/composables/useFocusStore'
import { useTagStore } from '@/composables/useTagStore'
import { resetCommunityPostsCache } from '@/composables/useCommunityStore'
import { resetNotificationSession } from '@/composables/useNotificationStore'
import { useFeedbackStore, resetFeedbackSession } from '@/composables/useFeedbackStore'
import { checkDueReminders, resetRemindersSession } from '@/composables/useReminders'

let _booting = null
let _booted = false

/**
 * Boot all data stores once there is a signed-in session.
 * - Safe to call from many entry points (App.onLaunch, App.onShow, post-login, page onLoad).
 * - Concurrent calls share the same promise.
 * - No-op when there is no current user.
 */
export function bootstrapData({ force = false } = {}) {
  if (_booting && !force) return _booting
  if (_booted && !force) return Promise.resolve()

  _booting = (async () => {
    const userStore = useUserStore()
    await userStore.fetchCurrentUser()
    if (!userStore.currentUser.value.id) {
      _booted = false
      return
    }

    const tasksStore = useTasksStore()
    const noticesStore = useNotificationStore()
    const communityStore = useCommunityStore()
    const studyStore = useStudyStore()
    const { fetchFocusSessions, bindUser } = useFocusStore()
    bindUser(userStore.currentUser.value.id)

    const { fetchThreads } = useFeedbackStore()

    await Promise.all([
      tasksStore.fetchTasks({ force }),
      noticesStore.fetchNotifications({ force }),
      communityStore.fetchCommunities(),
      communityStore.fetchMembers(),
      studyStore.fetchSubjects(),
      fetchFocusSessions(userStore.currentUser.value.id),
      fetchThreads({ force }),
    ])
    useTagStore().syncFromCommunities(communityStore.communities.value)
    _booted = true
    checkDueReminders({ force: true })
  })().finally(() => {
    _booting = null
  })

  return _booting
}

export function resetBootstrap() {
  _booted = false
  _booting = null
  resetCommunityPostsCache()
  resetNotificationSession()
  resetTasksSession()
  resetStudySession()
  resetFeedbackSession()
  resetRemindersSession()
}
