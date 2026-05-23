import { useUserStore } from '@/composables/useUserStore'
import { useTasksStore } from '@/composables/useTasksStore'
import { useNotificationStore } from '@/composables/useNotificationStore'
import { useCommunityStore } from '@/composables/useCommunityStore'
import { useStudyStore } from '@/composables/useStudyStore'

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

    await Promise.all([
      tasksStore.fetchTasks(),
      noticesStore.fetchNotifications(),
      communityStore.fetchCommunities(),
      communityStore.fetchMembers(),
      communityStore.fetchPosts(),
      studyStore.fetchSubjects(),
      studyStore.fetchResources(),
    ])
    _booted = true
  })().finally(() => {
    _booting = null
  })

  return _booting
}
