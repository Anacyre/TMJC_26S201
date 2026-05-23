<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader nav-mode="back" />

    <view class="safe">
      <view class="card pad">
        <view class="head">
          <view class="tag"><text class="tagText">{{ notice.type || 'General' }}</text></view>
          <text class="time">{{ timeLabel }}</text>
        </view>
        <text class="title">{{ notice.title }}</text>
        <text class="meta">{{ notice.subject || 'General' }}<text v-if="notice.deadline"> · {{ notice.deadline }}</text></text>

        <view class="body">
          <text class="p text-word-wrap">{{ notice.description || 'No description.' }}</text>
          <text v-if="notice.attachment" class="p attach">{{ notice.attachment }}</text>
        </view>

        <view class="actions">
          <view class="btn ghost tap" @tap="togglePinned">
            <text class="btnText">{{ notice.important ? 'Unpin' : 'Pin' }}</text>
          </view>
          <view class="btn primary tap" @tap="addToPlanner"><text class="btnTextPrimary">Add task</text></view>
          <view class="btn ghost tap" @tap="hideNotice"><text class="btnText">Hide</text></view>
          <view v-if="canDelete" class="btn ghost danger tap" @tap="deleteNotice">
            <text class="btnTextDanger">Delete</text>
          </view>
        </view>
      </view>
    </view>
    <GlobalSearchOverlay />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppHeader from '@/components/AppHeader.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import { useTheme } from '@/composables/useTheme'
import { useNotificationStore } from '@/composables/useNotificationStore'
import { useTasksStore } from '@/composables/useTasksStore'
import { useUserStore } from '@/composables/useUserStore'
import { useAdminMode } from '@/composables/useAdminMode'
import { toast } from '@/composables/useToast'

const { themeClass } = useTheme()
const { getNotificationById, markRead, toggleImportant, setHidden, setInPlanner, removeNotification } = useNotificationStore()
const { addTaskFromNotice } = useTasksStore()
const { currentUser } = useUserStore()
const { isAdminActive } = useAdminMode()
const id = ref('')
const fallback = {
  id: '',
  type: 'General',
  title: 'Notice not found',
  subject: 'General',
  deadline: '',
  description: 'This notice may have been removed.',
  attachment: '',
  important: false,
  inPlanner: false,
  read: false,
  createdAt: '',
}
const notice = computed(() => getNotificationById(id.value) || fallback)
const timeLabel = computed(() => shortTimeLabel(notice.value.createdAt))
const canDelete = computed(() => {
  const userId = currentUser.value?.id
  const n = notice.value
  if (!userId || !n?.id) return false
  return isAdminActive.value || n.createdBy === userId
})

function shortTimeLabel(iso) {
  if (!iso) return 'just now'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-SG', { month: 'short', day: 'numeric' })
}

function markAsRead() {
  if (!notice.value?.id) return
  markRead(notice.value.id)
}

function togglePinned() {
  if (!notice.value?.id) return
  toggleImportant(notice.value.id)
  toast.updated()
}

function hideNotice() {
  if (!notice.value?.id) return
  setHidden(notice.value.id, true)
  toast.hidden()
  setTimeout(() => uni.navigateBack({ delta: 1 }), 180)
}

function deleteNotice() {
  if (!notice.value?.id || !canDelete.value) return
  uni.showModal({
    title: 'Delete notice?',
    content: 'This permanently removes the notice for everyone.',
    confirmText: 'Delete',
    confirmColor: '#dc5050',
    success: async (res) => {
      if (!res.confirm) return
      const { error } = await removeNotification(notice.value.id)
      if (error) {
        toast.show('Could not delete')
        return
      }
      toast.removed()
      setTimeout(() => uni.navigateBack({ delta: 1 }), 180)
    },
  })
}

function addToPlanner() {
  if (!notice.value?.id) return
  if (notice.value.inPlanner) {
    toast.show('Already added')
    return
  }
  addTaskFromNotice({
    noticeId: notice.value.id,
    title: notice.value.title,
    subject: notice.value.subject,
    deadline: notice.value.deadline,
    description: notice.value.description,
    noticeTitle: notice.value.title,
  })
  setInPlanner(notice.value.id, true)
  toast.addedToPlanner()
}

onLoad((query) => {
  id.value = query?.id || ''
  if (id.value) markRead(id.value)
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

.bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(40, 110, 255, 0.16), transparent 60%),
    linear-gradient(180deg, #f8faff, #f1f4fa);
}

.t-dark .bg {
  background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(60, 120, 255, 0.14), transparent 58%),
    linear-gradient(180deg, #111315, #0e1014);
}

.safe {
  position: relative;
  z-index: 1;
  padding: 4rpx 28rpx 40rpx;
}

.card {
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.7);
  border: 1rpx solid rgba(16, 24, 40, 0.04);
}

.t-dark .card {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.06);
}

.pad {
  padding: 18rpx 18rpx;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14rpx;
}

.tag {
  padding: 6rpx 12rpx;
  border-radius: 999rpx;
  background: rgba(46, 99, 255, 0.12);
  border: 1rpx solid rgba(46, 99, 255, 0.18);
}

.tagText {
  font-size: 18rpx;
  color: rgba(46, 99, 255, 0.95);
}

.time {
  font-size: 18rpx;
  color: rgba(16, 24, 40, 0.5);
}

.t-dark .time {
  color: #9aa4b2;
}

.title {
  font-size: 26rpx;
  font-weight: 740;
  color: rgba(16, 24, 40, 0.92);
}

.t-dark .title {
  color: #f5f7fa;
}

.meta {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: rgba(16, 24, 40, 0.56);
}

.t-dark .meta {
  color: #9aa4b2;
}

.body {
  margin-top: 18rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid rgba(16, 24, 40, 0.06);
}

.t-dark .body {
  border-top-color: rgba(255, 255, 255, 0.06);
}

.p {
  display: block;
  font-size: 22rpx;
  color: rgba(16, 24, 40, 0.74);
  margin-bottom: 12rpx;
  line-height: 1.5;
}

.t-dark .p {
  color: rgba(245, 247, 255, 0.78);
}

.p.attach {
  color: rgba(46, 99, 255, 0.88);
  font-size: 20rpx;
}

.actions {
  margin-top: 16rpx;
  display: flex;
  gap: 8rpx;
}

.btn {
  flex: 1;
  height: 64rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 160ms ease;
}

.btn:active {
  transform: scale(0.985);
}

.ghost {
  background: rgba(16, 24, 40, 0.05);
  border: 1rpx solid rgba(16, 24, 40, 0.06);
}

.t-dark .ghost {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.06);
}

.primary {
  background: linear-gradient(180deg, #4f86ff, #2e63ff);
  box-shadow: 0 16rpx 44rpx rgba(46, 99, 255, 0.3);
}

.btnText {
  font-size: 22rpx;
  font-weight: 720;
  color: rgba(16, 24, 40, 0.78);
}

.t-dark .btnText {
  color: rgba(245, 247, 255, 0.82);
}

.btnTextPrimary {
  font-size: 22rpx;
  font-weight: 740;
  color: #fff;
}

.btn.ghost.danger {
  border-color: rgba(220, 80, 80, 0.22);
}

.btnTextDanger {
  font-size: 22rpx;
  font-weight: 720;
  color: rgba(200, 90, 90, 0.95);
}
</style>
