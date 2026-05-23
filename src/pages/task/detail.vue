<template>
  <view class="page" :class="themeClass">
    <view class="bg" />

    <AppHeader nav-mode="back" />

    <scroll-view class="scroll" scroll-y :show-scrollbar="false" :enhanced="true">
      <view class="safe">
        <view class="card pad">
          <view class="head">
            <view class="state" :class="'state-' + task.status"><text class="stateText">{{ task.status }}</text></view>
            <text class="time">{{ task.deadline }}</text>
          </view>

          <text class="title">{{ task.title }}</text>

          <view class="metaGrid">
            <view class="metaItem">
              <text class="metaLabel">Subject</text>
              <text class="metaValue">{{ task.subject }}</text>
            </view>
            <view class="metaItem">
              <text class="metaLabel">Priority</text>
              <text class="metaValue">{{ task.priority }}</text>
            </view>
            <view class="metaItem">
              <text class="metaLabel">Reminder</text>
              <text class="metaValue">{{ task.reminder }}</text>
            </view>
          </view>

          <view class="section">
            <text class="sectionTitle">Description</text>
            <text class="p">{{ task.description }}</text>
          </view>

          <view class="section">
            <text class="sectionTitle">Checklist</text>
            <view class="checklist">
              <view v-for="c in task.checklist" :key="c.id" class="checkRow" @tap="toggleCheck(c)" role="button">
                <view class="check" :class="{ on: c.done }"><view class="checkDot" /></view>
                <text class="checkText" :class="{ done: c.done }">{{ c.text }}</text>
              </view>
            </view>
          </view>

          <view v-if="relatedNoticeBlock" class="section">
            <text class="sectionTitle">Source notice</text>
            <view class="rel tap" @tap="openNotice(relatedNoticeBlock.id)" role="button">
              <text class="relTitle" :number-of-lines="1">{{ relatedNoticeBlock.title }}</text>
              <text class="relSub">Open in feed</text>
            </view>
          </view>
        </view>

        <view class="bottomBar">
          <view class="btn ghost" role="button" @tap="editOpen = true"><text class="btnText">Edit</text></view>
          <view class="btn primary" role="button" @tap="completeTask">
            <text class="btnTextPrimary">{{ task.done ? 'Completed' : 'Complete Task' }}</text>
          </view>
        </view>

        <view class="spacer" />
      </view>
    </scroll-view>
    <TaskEditorSheet v-model="editOpen" mode="edit" :task="task" @save="saveTask" />
    <GlobalSearchOverlay />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppHeader from '@/components/AppHeader.vue'
import TaskEditorSheet from '@/components/TaskEditorSheet.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import { useTheme } from '@/composables/useTheme'
import { useTasksStore } from '@/composables/useTasksStore'
import { useNotificationStore } from '@/composables/useNotificationStore'
import { toast } from '@/composables/useToast'

const { themeClass } = useTheme()
const id = ref('')
const editOpen = ref(false)
const taskReady = ref(false)
const { getTaskById, loadTaskById, toggleTaskDone, toggleChecklist, updateTask } = useTasksStore()
const { getNotificationById } = useNotificationStore()

const fallbackTask = {
  id: 'fallback',
  title: 'Task not found',
  deadline: 'Anytime',
  subject: 'General',
  priority: 'P3',
  reminder: 'None',
  status: 'upcoming',
  done: false,
  description: 'This task might have been removed.',
  checklist: [],
  relatedNotice: null,
}
const task = computed(() => {
  if (!id.value) return fallbackTask
  return getTaskById(id.value) || fallbackTask
})

const isMissingTask = computed(() => taskReady.value && id.value && task.value.id === 'fallback')

const relatedNoticeBlock = computed(() => {
  const t = task.value
  if (t.relatedNotice?.id) return { id: t.relatedNotice.id, title: t.relatedNotice.title }
  if (t.sourceNoticeId) {
    const n = getNotificationById(t.sourceNoticeId)
    return n ? { id: n.id, title: n.title } : { id: t.sourceNoticeId, title: 'Class notice' }
  }
  return null
})

function toggleCheck(c) {
  toggleChecklist(task.value.id, c.id)
}

function openNotice(nid) {
  uni.navigateTo({ url: `/pages/notifications/index?id=${encodeURIComponent(nid)}` })
}

function completeTask() {
  const wasDone = task.value.done
  toggleTaskDone(task.value.id)
  toast.updated()
}

async function saveTask(payload) {
  if (isMissingTask.value) {
    toast.show('Task not found')
    return
  }
  const { error } = await updateTask(task.value.id, payload)
  if (error) {
    toast.show(error.message || 'Could not save task')
    return
  }
  toast.saved()
  editOpen.value = false
}

onLoad(async (query) => {
  id.value = decodeURIComponent(query?.id || '')
  if (!id.value) return
  const { error } = await loadTaskById(id.value)
  taskReady.value = true
  if (error) toast.show('Task not found')
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
  background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(40, 110, 255, 0.18), transparent 60%),
    radial-gradient(900rpx 700rpx at 70% 30%, rgba(120, 180, 255, 0.14), transparent 65%),
    linear-gradient(180deg, rgba(248, 250, 255, 1), rgba(241, 244, 250, 1));
}

.t-dark .bg {
  background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(60, 120, 255, 0.22), transparent 58%),
    radial-gradient(900rpx 700rpx at 70% 30%, rgba(100, 160, 255, 0.14), transparent 62%),
    linear-gradient(180deg, rgba(8, 12, 20, 1), rgba(10, 14, 26, 1));
}

.scroll {
  position: relative;
  z-index: 1;
  height: calc(100vh - var(--shell-header-offset, 148rpx));
}

.safe {
  padding: 0 28rpx 40rpx;
}

.card {
  width: 100%;
  border-radius: 34rpx;
  background: rgba(255, 255, 255, 0.74);
  border: 1rpx solid rgba(255, 255, 255, 0.60);
  box-shadow: 0 22rpx 70rpx rgba(12, 20, 40, 0.10);
  backdrop-filter: blur(14px);
}

.t-dark .card {
  background: #1a1d21;
  border-color: rgba(255, 255, 255, 0.06);
  box-shadow: 0 26rpx 90rpx rgba(0, 0, 0, 0.40);
}

.pad {
  padding: 22rpx 22rpx;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.state {
  padding: 8rpx 12rpx;
  border-radius: 999rpx;
  border: 1rpx solid transparent;
}

.state-overdue {
  background: rgba(255, 59, 48, 0.10);
  border-color: rgba(255, 59, 48, 0.12);
}

.state-today {
  background: rgba(46, 99, 255, 0.10);
  border-color: rgba(46, 99, 255, 0.12);
}

.state-upcoming {
  background: rgba(16, 24, 40, 0.06);
  border-color: rgba(16, 24, 40, 0.08);
}

.t-dark .state-upcoming {
  background: rgba(245, 247, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.10);
}

.stateText {
  font-size: 18rpx;
  font-weight: 800;
  text-transform: lowercase;
  letter-spacing: 0.3rpx;
  color: rgba(16, 24, 40, 0.70);
}

.state-overdue .stateText {
  color: rgba(255, 59, 48, 0.92);
}

.state-today .stateText {
  color: rgba(46, 99, 255, 0.92);
}

.t-dark .stateText {
  color: rgba(245, 247, 255, 0.62);
}

.time {
  font-size: 20rpx;
  color: rgba(16, 24, 40, 0.52);
}

.t-dark .time {
  color: rgba(245, 247, 255, 0.46);
}

.title {
  font-size: 40rpx;
  font-weight: 840;
  color: rgba(16, 24, 40, 0.92);
  letter-spacing: -0.6rpx;
}

.t-dark .title {
  color: rgba(245, 247, 255, 0.92);
}

.metaGrid {
  margin-top: 18rpx;
  display: flex;
  gap: 12rpx;
}

.metaItem {
  flex: 1;
  min-width: 0;
  padding: 16rpx 16rpx;
  border-radius: 22rpx;
  background: rgba(16, 24, 40, 0.04);
  border: 1rpx solid rgba(16, 24, 40, 0.06);
}

.t-dark .metaItem {
  background: rgba(245, 247, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.10);
}

.metaLabel {
  font-size: 18rpx;
  color: rgba(16, 24, 40, 0.52);
}

.t-dark .metaLabel {
  color: rgba(245, 247, 255, 0.45);
}

.metaValue {
  margin-top: 8rpx;
  font-size: 22rpx;
  font-weight: 760;
  color: rgba(16, 24, 40, 0.78);
}

.t-dark .metaValue {
  color: rgba(245, 247, 255, 0.70);
}

.section {
  margin-top: 26rpx;
}

.sectionTitle {
  font-size: 22rpx;
  font-weight: 760;
  color: rgba(16, 24, 40, 0.70);
}

.t-dark .sectionTitle {
  color: rgba(245, 247, 255, 0.62);
}

.p {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: rgba(16, 24, 40, 0.60);
  line-height: 1.55;
}

.t-dark .p {
  color: rgba(245, 247, 255, 0.54);
}

.checklist {
  margin-top: 10rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.checkRow {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 14rpx 14rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.55);
  border: 1rpx solid rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(14px);
  transition: transform 180ms ease;
}

.t-dark .checkRow {
  background: rgba(18, 24, 40, 0.42);
  border-color: rgba(255, 255, 255, 0.10);
}

.checkRow:active {
  transform: scale(0.985);
}

.check {
  width: 44rpx;
  height: 44rpx;
  border-radius: 14rpx;
  background: rgba(16, 24, 40, 0.08);
  border: 1rpx solid rgba(16, 24, 40, 0.10);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 220ms ease, border-color 220ms ease;
}

.t-dark .check {
  background: rgba(245, 247, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.10);
}

.checkDot {
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  background: rgba(16, 24, 40, 0.16);
  transition: transform 220ms ease, background 220ms ease;
}

.check.on {
  background: rgba(46, 99, 255, 0.16);
  border-color: rgba(46, 99, 255, 0.22);
}

.check.on .checkDot {
  background: rgba(46, 99, 255, 0.92);
  transform: scale(1.05);
}

.checkText {
  font-size: 24rpx;
  font-weight: 720;
  color: rgba(16, 24, 40, 0.78);
}

.t-dark .checkText {
  color: rgba(245, 247, 255, 0.70);
}

.checkText.done {
  opacity: 0.45;
  text-decoration: line-through;
}

.rel {
  margin-top: 10rpx;
  padding: 16rpx 16rpx;
  border-radius: 22rpx;
  background: rgba(46, 99, 255, 0.10);
  border: 1rpx solid rgba(46, 99, 255, 0.12);
}

.tap:active {
  transform: scale(0.985);
}

.relTitle {
  font-size: 24rpx;
  font-weight: 760;
  color: rgba(46, 99, 255, 0.92);
}

.relSub {
  margin-top: 6rpx;
  font-size: 20rpx;
  color: rgba(16, 24, 40, 0.52);
}

.t-dark .relSub {
  color: rgba(245, 247, 255, 0.46);
}

.bottomBar {
  margin-top: 16rpx;
  display: flex;
  gap: 12rpx;
}

.btn {
  flex: 1;
  height: 84rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 180ms ease;
}

.btn:active {
  transform: scale(0.985);
}

.ghost {
  background: rgba(16, 24, 40, 0.06);
  border: 1rpx solid rgba(16, 24, 40, 0.08);
}

.t-dark .ghost {
  background: rgba(245, 247, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.10);
}

.primary {
  background: linear-gradient(180deg, #4f86ff, #2e63ff);
  box-shadow: 0 18rpx 50rpx rgba(46, 99, 255, 0.30);
}

.t-dark .primary {
  box-shadow: 0 22rpx 70rpx rgba(46, 99, 255, 0.22);
}

.btnText {
  font-size: 24rpx;
  font-weight: 760;
  color: rgba(16, 24, 40, 0.72);
}

.t-dark .btnText {
  color: rgba(245, 247, 255, 0.62);
}

.btnTextPrimary {
  font-size: 24rpx;
  font-weight: 820;
  color: rgba(255, 255, 255, 0.96);
}

.spacer {
  height: 18rpx;
}
</style>

