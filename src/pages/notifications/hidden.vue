<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader nav-mode="back" />

    <PageContent>
    <scroll-view class="scroll" scroll-y :show-scrollbar="false">
      <view v-if="!list.length" class="empty">
        <EmptyState
          variant="notifications"
          title="Nothing hidden"
        />
      </view>

      <NoticeSwipeRow
        v-for="n in list"
        :key="n.id"
        v-memo="[n.id, n.title, n.subject, n.type, leavingId === n.id, deletableNoticeIds.has(n.id)]"
        class="swipeRow"
        mode="hidden"
        :can-delete="deletableNoticeIds.has(n.id)"
        @commit="onSwipe(n, $event)"
        @action="onSwipe(n, $event)"
        @longpress-delete="onLongPressDelete(n)"
      >
        <view
          class="row"
          :class="{ leaving: leavingId === n.id }"
          role="button"
          @tap="openNotice(n)"
        >
          <view class="main">
            <text class="title" :number-of-lines="2">{{ n.title }}</text>
            <text class="meta">{{ n.subject }} · {{ n.type }}</text>
          </view>
        </view>
      </NoticeSwipeRow>
      <view class="gap" />
    </scroll-view>
    </PageContent>

    <GlobalSearchOverlay />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppHeader from '@/components/AppHeader.vue'
import PageContent from '@/components/PageContent.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import EmptyState from '@/components/EmptyState.vue'
import NoticeSwipeRow from '@/components/NoticeSwipeRow.vue'
import { useTheme } from '@/composables/useTheme'
import { useNotificationStore } from '@/composables/useNotificationStore'
import { toast } from '@/composables/useToast'
import { deleteConfirm } from '@/composables/useConfirmDelete'
import { navChild } from '@/lib/navigation'

const SWIPE_LEAVE_MS = 220

const { themeClass } = useTheme()
const {
  notifications,
  hiddenNotifications,
  unhide,
  removeNotification,
  fetchNotifications,
  buildDeletableNoticeIds,
} = useNotificationStore()

const list = computed(() => hiddenNotifications.value)
const deletableNoticeIds = computed(() => buildDeletableNoticeIds(list.value))
const leavingId = ref('')

onShow(() => {
  if (!notifications.value.length) fetchNotifications()
})

function openNotice(n) {
  if (!n?.id) return
  navChild(`/pages/notice/detail?id=${encodeURIComponent(n.id)}`)
}

async function restore(id) {
  const { error } = await unhide(id)
  if (error) {
    toast.show('Could not restore')
    return
  }
  toast.show('Notice restored')
}

async function remove(n) {
  if (!n || !deletableNoticeIds.value.has(n.id)) return
  const ok = await deleteConfirm.notice({
    message: n.inPlanner
      ? 'This notice is in your planner. The linked task will be removed too.'
      : 'This cannot be undone.',
  })
  if (!ok) return
  leavingId.value = n.id
  setTimeout(async () => {
    const { error } = await removeNotification(n.id)
    leavingId.value = ''
    if (error) {
      toast.show(error.message || 'Could not delete')
      return
    }
    toast.noticeDeleted()
  }, 280)
}

async function onLongPressDelete(n) {
  await remove(n)
}

async function onSwipe(n, actionId) {
  if (actionId === 'restore') {
    leavingId.value = n.id
    setTimeout(async () => {
      await restore(n.id)
      leavingId.value = ''
    }, SWIPE_LEAVE_MS)
    return
  }
  if (actionId === 'delete') {
    await remove(n)
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  position: relative;
}
.bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(900rpx 600rpx at 50% 0%, rgba(40, 110, 255, 0.06), transparent 55%),
    linear-gradient(180deg, #f4f6fa, #eceef4);
}
.t-dark .bg {
  background: radial-gradient(900rpx 600rpx at 50% 0%, rgba(60, 120, 255, 0.08), transparent 55%),
    linear-gradient(180deg, #111315, #0e1014);
}
.scroll {
  position: relative;
  z-index: 1;
  height: calc(100vh - var(--shell-header-offset));
  padding: 12rpx 24rpx 40rpx;
}
.empty {
  padding: 80rpx 20rpx;
  text-align: center;
}
.swipeRow {
  margin-top: var(--list-stack-gap);
}
.row {
  display: flex;
  align-items: center;
  gap: var(--list-card-gap);
  padding: var(--list-card-pad-y) var(--list-card-pad-x);
  border-radius: var(--list-card-radius);
  background: rgba(255, 255, 255, 0.7);
  border: 1rpx solid rgba(16, 24, 40, 0.04);
  opacity: 0.92;
  transition: opacity 220ms ease, transform 220ms ease;
}
.row.leaving {
  opacity: 0;
  transform: scale(0.98);
}
.t-dark .row {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.06);
}
.main {
  flex: 1;
  min-width: 0;
}
.title {
  font-size: var(--list-title-size);
  font-weight: 680;
  color: rgba(16, 24, 40, 0.72);
}
.t-dark .title {
  color: rgba(245, 247, 255, 0.68);
}
.meta {
  display: block;
  margin-top: 6rpx;
  font-size: var(--list-meta-size);
  color: rgba(16, 24, 40, 0.42);
}
.t-dark .meta {
  color: rgba(245, 247, 255, 0.38);
}
.gap {
  height: 32rpx;
}
</style>
