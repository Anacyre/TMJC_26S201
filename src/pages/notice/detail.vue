<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader nav-mode="back" />

    <PageContent>
    <view class="safe">
      <view class="card pad">
        <view class="head">
          <view class="tag"><text class="tagText">{{ notice.type || 'General' }}</text></view>
          <text class="time">{{ timeLabel }}</text>
        </view>
        <text class="title">{{ notice.title }}</text>
        <text class="meta">{{ notice.subject || 'General' }}<text v-if="notice.deadline"> · {{ notice.deadline }}</text></text>
        <text v-if="hasReminder" class="meta reminderMeta">Reminder · {{ notice.reminder }}</text>

        <view class="body">
          <text class="p text-word-wrap">{{ notice.description || 'No description.' }}</text>
          <text v-if="notice.attachment" class="p attach">{{ notice.attachment }}</text>
        </view>

        <view v-if="noticeSteps.length" class="stepsSection">
          <text class="stepsTitle">Steps</text>
          <view v-for="(step, idx) in noticeSteps" :key="step.id" class="stepRow">
            <text class="stepIndex">{{ idx + 1 }}</text>
            <view class="stepMain">
              <text class="stepText">{{ step.text }}</text>
              <text v-if="stepDueLabel(step)" class="stepDue">{{ stepDueLabel(step) }}</text>
            </view>
          </view>
        </view>

        <view class="actions">
          <view v-if="canEdit" class="btn ghost tap" @tap="editOpen = true">
            <text class="btnText">Edit</text>
          </view>
          <view class="btn ghost tap" @tap="togglePinned">
            <text class="btnText">{{ notice.important ? 'Unpin' : 'Pin' }}</text>
          </view>
          <view v-if="canAddToTasks" class="btn primary tap" @tap="addToPlanner"><text class="btnTextPrimary">Add task</text></view>
          <view class="btn ghost tap" @tap="toggleHidden">
            <text class="btnText">{{ notice.hidden ? 'Restore' : 'Hide' }}</text>
          </view>
          <view v-if="canDelete" class="btn ghost danger tap" @tap="deleteNotice">
            <text class="btnTextDanger">Delete</text>
          </view>
        </view>
      </view>
    </view>
    </PageContent>
    <NoticeEditorSheet
      v-model="editOpen"
      mode="edit"
      :notice="notice"
      :subject-options="subjectOptions"
      @save="saveNotice"
      @create-tag="onCreateTag"
    />
    <GlobalSearchOverlay />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppHeader from '@/components/AppHeader.vue'
import PageContent from '@/components/PageContent.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import { useTheme } from '@/composables/useTheme'
import NoticeEditorSheet from '@/components/NoticeEditorSheet.vue'
import { useNotificationStore } from '@/composables/useNotificationStore'
import { useTasksStore } from '@/composables/useTasksStore'
import { useUserStore } from '@/composables/useUserStore'
import { useTagStore } from '@/composables/useTagStore'
import { useCommunityStore } from '@/composables/useCommunityStore'
import { toast } from '@/composables/useToast'
import { deleteConfirm } from '@/composables/useConfirmDelete'
import { canAddNoticeToTasks } from '@/lib/noticeRules'
import { addNoticeToPlanner } from '@/lib/noticePlanner'
import { shortTimeLabel } from '@/lib/timeLabel'
import { normalizeChecklist } from '@/lib/checklist'
import { formatTaskDueChipLabel, parseChecklistItemDeadline } from '@/lib/taskDueDate'

import { communitySubjectNames } from '@/lib/communitySubjectLinks'

const { themeClass } = useTheme()
const {
  getNotificationById,
  markRead,
  toggleImportant,
  setHidden,
  setInPlanner,
  patchNotificationState,
  removeNotification,
  updateNotification,
  isNoticeDeletable,
  isNoticeEditable,
} = useNotificationStore()
const { addTaskFromNotice, deleteTask } = useTasksStore()
const { currentUser } = useUserStore()
const { addTag } = useTagStore()
const { sortedCommunities } = useCommunityStore()
const editOpen = ref(false)
const id = ref('')
const fallback = {
  id: '',
  type: 'General',
  title: 'Notice not found',
  subject: 'General',
  deadline: '',
  description: 'This notice may have been removed.',
  attachment: '',
  checklist: [],
  reminder: 'None',
  important: false,
  inPlanner: false,
  read: false,
  createdAt: '',
}
const notice = computed(() => getNotificationById(id.value) || fallback)
const noticeSteps = computed(() => normalizeChecklist(notice.value.checklist))
const canAddToTasks = computed(() => canAddNoticeToTasks(notice.value))
const timeLabel = computed(() => shortTimeLabel(notice.value.createdAt))
const subjectOptions = computed(() => communitySubjectNames(sortedCommunities.value))
const canEdit = computed(() => isNoticeEditable(notice.value, currentUser.value?.id))
const canDelete = computed(() => isNoticeDeletable(notice.value, currentUser.value?.id))
const hasReminder = computed(() => {
  const value = String(notice.value?.reminder || '').trim()
  return !!value && value !== 'None'
})

function markAsRead() {
  if (!notice.value?.id) return
  markRead(notice.value.id)
}

function stepDueLabel(step) {
  const key = parseChecklistItemDeadline(step)
  if (!key) return ''
  return formatTaskDueChipLabel({ deadline: key, done: false })
}

function togglePinned() {
  if (!notice.value?.id) return
  toggleImportant(notice.value.id)
  toast.noticeUpdated()
}

async function toggleHidden() {
  if (!notice.value?.id) return
  const nextHidden = !notice.value.hidden
  const { error } = await setHidden(notice.value.id, nextHidden)
  if (error) {
    toast.show(nextHidden ? 'Could not hide' : 'Could not restore')
    return
  }
  if (nextHidden) {
    toast.hidden()
    setTimeout(() => uni.navigateBack({ delta: 1 }), 180)
    return
  }
  toast.show('Notice restored')
}

async function deleteNotice() {
  if (!notice.value?.id || !canDelete.value) return
  const ok = await deleteConfirm.notice({
    message: notice.value.inPlanner
      ? 'This notice is in your planner. The linked task will be removed too.'
      : 'This cannot be undone.',
  })
  if (!ok) return
  const { error } = await removeNotification(notice.value.id)
  if (error) {
    toast.show(error.message || 'Could not delete')
    return
  }
  toast.noticeDeleted()
  setTimeout(() => uni.navigateBack({ delta: 1 }), 180)
}

function onCreateTag(name) {
  addTag(name)
}

async function saveNotice(payload) {
  if (!notice.value?.id) return
  const { error } = await updateNotification(notice.value.id, payload)
  if (error) {
    toast.show(error.message || 'Could not save')
    return
  }
  editOpen.value = false
  toast.noticeUpdated()
}

function addToPlanner() {
  if (!notice.value?.id) return
  addNoticeToPlanner(
    notice.value,
    { addTaskFromNotice, deleteTask, setInPlanner, patchNotificationState, toast },
    { hide: false }
  )
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
  display: flex;
  flex-direction: column;
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

.reminderMeta {
  margin-top: 6rpx;
  color: rgba(46, 99, 255, 0.82);
}

.t-dark .reminderMeta {
  color: rgba(170, 200, 255, 0.86);
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

.stepsSection {
  margin-top: 18rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid rgba(16, 24, 40, 0.06);
}

.t-dark .stepsSection {
  border-top-color: rgba(255, 255, 255, 0.06);
}

.stepsTitle {
  display: block;
  margin-bottom: 12rpx;
  font-size: 20rpx;
  font-weight: 700;
  color: rgba(16, 24, 40, 0.56);
}

.t-dark .stepsTitle {
  color: #9aa4b2;
}

.stepRow {
  display: flex;
  gap: 12rpx;
  align-items: flex-start;
  margin-bottom: 12rpx;
}

.stepIndex {
  width: 36rpx;
  height: 36rpx;
  border-radius: 999rpx;
  background: rgba(46, 99, 255, 0.12);
  color: rgba(46, 99, 255, 0.92);
  font-size: 18rpx;
  font-weight: 740;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stepMain {
  flex: 1;
  min-width: 0;
}

.stepText {
  display: block;
  font-size: 22rpx;
  color: rgba(16, 24, 40, 0.82);
  line-height: 1.45;
}

.t-dark .stepText {
  color: rgba(245, 247, 255, 0.82);
}

.stepDue {
  display: block;
  margin-top: 4rpx;
  font-size: 18rpx;
  color: rgba(46, 99, 255, 0.88);
}

.t-dark .stepDue {
  color: rgba(170, 200, 255, 0.9);
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
