<template>
  <view class="page" :class="themeClass">
    <view class="bg" />

    <AppHeader title="Tasks" nav-mode="back" :show-avatar="false" />

    <scroll-view class="scroll" scroll-y :show-scrollbar="false" :enhanced="true">
      <view class="safe">
        <view class="tabs">
          <view class="tab" :class="{ on: tab === 'today' }" role="button" @tap="tab = 'today'">
            <text class="tabText">Today</text>
          </view>
          <view class="tab" :class="{ on: tab === 'upcoming' }" role="button" @tap="tab = 'upcoming'">
            <text class="tabText">Upcoming</text>
          </view>
          <view class="tab" :class="{ on: tab === 'completed' }" role="button" @tap="tab = 'completed'">
            <text class="tabText">Completed</text>
          </view>
        </view>

        <view class="list">
          <view
            v-for="t in filtered"
            :key="t.id"
            class="card task tap"
            :class="['st-' + t.status, { pressed: pressedKey === t.id }]"
            @touchstart="pressedKey = t.id"
            @touchend="pressedKey = ''"
            @touchcancel="pressedKey = ''"
            @tap="openTask(t)"
          >
            <view class="left">
              <view class="check" :class="{ on: t.done }" role="button" @tap.stop="toggleDone(t)">
                <view class="checkDot" />
              </view>
            </view>

            <view class="main">
              <view class="row1">
                <text class="title" :class="{ done: t.done }" :number-of-lines="1">{{ t.title }}</text>
                <view class="prio" :class="'p-' + t.priority">
                  <text class="prioText">{{ t.priority }}</text>
                </view>
              </view>

              <view class="row2">
                <text class="metaMuted">{{ t.deadline }}</text>
                <view class="tag">
                  <text class="tagText">{{ t.subject }}</text>
                </view>
                <text class="state" :class="'state-' + t.status">{{ t.status }}</text>
              </view>
            </view>
          </view>
        </view>

        <view class="spacer" />
      </view>
    </scroll-view>

    <view class="addFab" role="button" @tap="openCreate">
      <text class="addFabText">＋</text>
    </view>

    <BottomNav active="tasks" />
    <TaskEditorSheet v-model="createOpen" mode="create" :task="emptyTask" @save="createTask" />
    <GlobalSearchOverlay />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import BottomNav from '@/components/BottomNav.vue'
import AppHeader from '@/components/AppHeader.vue'
import TaskEditorSheet from '@/components/TaskEditorSheet.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import { useTheme } from '@/composables/useTheme'
import { useTasksStore } from '@/composables/useTasksStore'

const { themeClass } = useTheme()
const { tasks, tasksCountToday, toggleTaskDone, addTask } = useTasksStore()

const tab = ref('today')
const pressedKey = ref('')
const createOpen = ref(false)
const emptyTask = ref({ title: '', description: '', deadline: '', subject: '', priority: 'P2', status: 'today', reminder: '', checklist: [] })

const subtitle = computed(() => {
  if (tab.value === 'today') return 'Focus'
  if (tab.value === 'upcoming') return 'Plan'
  return 'Done'
})

const todayCount = computed(() => tasksCountToday.value)

const filtered = computed(() => {
  if (tab.value === 'completed') return tasks.value.filter((x) => x.done)
  if (tab.value === 'upcoming') return tasks.value.filter((x) => !x.done && x.status === 'upcoming')
  return tasks.value.filter((x) => !x.done && (x.status === 'today' || x.status === 'overdue'))
})

function toggleDone(t) {
  toggleTaskDone(t.id)
}

function openTask(t) {
  uni.navigateTo({ url: `/pages/task/detail?id=${encodeURIComponent(t.id)}` })
}

function openCreate() {
  createOpen.value = true
}

function createTask(payload) {
  addTask(payload)
  uni.showToast({ title: 'Task created', icon: 'none' })
}
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
  transition: filter 220ms ease;
}

.t-dark .bg {
  background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(60, 120, 255, 0.14), transparent 58%),
    radial-gradient(900rpx 700rpx at 70% 30%, rgba(100, 160, 255, 0.08), transparent 62%),
    linear-gradient(180deg, #111315, #0e1014);
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 5;
  padding: 36rpx 28rpx 18rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 12rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.62);
  border: 1rpx solid rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(12px);
  transition: transform 180ms ease;
}

.t-dark .brand {
  background: rgba(22, 28, 44, 0.55);
  border-color: rgba(255, 255, 255, 0.10);
}

.brand:active {
  transform: scale(0.985);
}

.dot {
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  background: linear-gradient(180deg, #6aa6ff, #2e63ff);
  box-shadow: 0 0 0 7rpx rgba(83, 147, 255, 0.18);
}

.brandText {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.brandTitle {
  font-size: 24rpx;
  font-weight: 760;
  color: rgba(16, 24, 40, 0.92);
}

.t-dark .brandTitle {
  color: rgba(245, 247, 255, 0.92);
}

.brandSub {
  font-size: 20rpx;
  color: rgba(16, 24, 40, 0.52);
}

.t-dark .brandSub {
  color: rgba(245, 247, 255, 0.50);
}

.topRight {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.countPill {
  padding: 10rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(16, 24, 40, 0.06);
  border: 1rpx solid rgba(16, 24, 40, 0.08);
  display: flex;
  align-items: baseline;
  gap: 10rpx;
}

.t-dark .countPill {
  background: rgba(245, 247, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.10);
}

.countNum {
  font-size: 22rpx;
  font-weight: 820;
  color: rgba(16, 24, 40, 0.86);
}

.t-dark .countNum {
  color: rgba(245, 247, 255, 0.82);
}

.countText {
  font-size: 18rpx;
  color: rgba(16, 24, 40, 0.52);
}

.t-dark .countText {
  color: rgba(245, 247, 255, 0.46);
}

.iconBtn {
  width: 66rpx;
  height: 48rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.62);
  border: 1rpx solid rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(12px);
}

.t-dark .iconBtn {
  background: rgba(22, 28, 44, 0.55);
  border-color: rgba(255, 255, 255, 0.10);
}

.iconText {
  font-size: 22rpx;
  color: rgba(16, 24, 40, 0.70);
}

.t-dark .iconText {
  color: rgba(245, 247, 255, 0.60);
}

.scroll {
  position: relative;
  z-index: 1;
  height: calc(100vh - 110rpx);
}

.safe {
  padding: 0 28rpx 180rpx;
}

.tabs {
  display: flex;
  gap: 10rpx;
  padding: 8rpx 0 18rpx;
}

.tab {
  padding: 12rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.55);
  border: 1rpx solid rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(14px);
  opacity: 0.85;
  transition: transform 180ms ease, opacity 180ms ease, background 220ms ease;
}

.t-dark .tab {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.06);
}

.tab.on {
  opacity: 1;
  background: rgba(46, 99, 255, 0.14);
  border-color: rgba(46, 99, 255, 0.18);
}

.t-dark .tab.on {
  background: rgba(46, 99, 255, 0.18);
  border-color: rgba(46, 99, 255, 0.22);
}

.tab:active {
  transform: scale(0.985);
}

.tabText {
  font-size: 22rpx;
  font-weight: 650;
  color: rgba(16, 24, 40, 0.78);
}

.t-dark .tabText {
  color: rgba(245, 247, 255, 0.70);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.card {
  width: 100%;
  border-radius: 30rpx;
  background: rgba(255, 255, 255, 0.74);
  border: 1rpx solid rgba(255, 255, 255, 0.60);
  box-shadow: 0 22rpx 70rpx rgba(12, 20, 40, 0.10);
  backdrop-filter: blur(14px);
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
}

.t-dark .card {
  background: #1a1d21;
  border-color: rgba(255, 255, 255, 0.06);
  box-shadow: 0 22rpx 70rpx rgba(0, 0, 0, 0.40);
}

.tap:active {
  transform: scale(0.985);
}

.pressed {
  transform: scale(0.988);
}

.task {
  display: flex;
  gap: 14rpx;
  padding: 18rpx 18rpx;
}

.left {
  padding-top: 6rpx;
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
  transition: transform 180ms ease, background 220ms ease, border-color 220ms ease;
}

.t-dark .check {
  background: rgba(245, 247, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.10);
}

.check:active {
  transform: scale(0.96);
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

.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.row1 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10rpx;
}

.title {
  font-size: 28rpx;
  font-weight: 760;
  color: rgba(16, 24, 40, 0.90);
}

.t-dark .title {
  color: rgba(245, 247, 255, 0.90);
}

.title.done {
  opacity: 0.45;
  text-decoration: line-through;
}

.prio {
  padding: 6rpx 10rpx;
  border-radius: 999rpx;
  background: rgba(16, 24, 40, 0.06);
  border: 1rpx solid rgba(16, 24, 40, 0.08);
}

.t-dark .prio {
  background: rgba(245, 247, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.10);
}

.prio.p-P1 {
  background: rgba(255, 59, 48, 0.10);
  border-color: rgba(255, 59, 48, 0.12);
}

.prio.p-P2 {
  background: rgba(255, 149, 0, 0.10);
  border-color: rgba(255, 149, 0, 0.12);
}

.prio.p-P3 {
  background: rgba(88, 86, 214, 0.10);
  border-color: rgba(88, 86, 214, 0.12);
}

.prioText {
  font-size: 18rpx;
  font-weight: 800;
  color: rgba(16, 24, 40, 0.62);
}

.t-dark .prioText {
  color: rgba(245, 247, 255, 0.58);
}

.row2 {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex-wrap: wrap;
}

.metaMuted {
  font-size: 20rpx;
  color: rgba(16, 24, 40, 0.52);
}

.t-dark .metaMuted {
  color: rgba(245, 247, 255, 0.46);
}

.tag {
  padding: 6rpx 10rpx;
  border-radius: 999rpx;
  background: rgba(46, 99, 255, 0.10);
  border: 1rpx solid rgba(46, 99, 255, 0.12);
}

.tagText {
  font-size: 18rpx;
  font-weight: 700;
  color: rgba(46, 99, 255, 0.92);
}

.state {
  font-size: 18rpx;
  font-weight: 800;
  letter-spacing: 0.3rpx;
  text-transform: lowercase;
  padding: 6rpx 10rpx;
  border-radius: 999rpx;
  border: 1rpx solid transparent;
}

.state-overdue {
  color: rgba(255, 59, 48, 0.92);
  background: rgba(255, 59, 48, 0.10);
  border-color: rgba(255, 59, 48, 0.12);
}

.state-today {
  color: rgba(46, 99, 255, 0.92);
  background: rgba(46, 99, 255, 0.10);
  border-color: rgba(46, 99, 255, 0.12);
}

.state-upcoming {
  color: rgba(16, 24, 40, 0.62);
  background: rgba(16, 24, 40, 0.06);
  border-color: rgba(16, 24, 40, 0.08);
}

.t-dark .state-upcoming {
  color: rgba(245, 247, 255, 0.54);
  background: rgba(245, 247, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.10);
}

.spacer {
  height: 18rpx;
}

.addFab {
  position: fixed;
  right: 28rpx;
  bottom: 154rpx;
  z-index: 35;
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.68);
  border: 1rpx solid rgba(255, 255, 255, 0.62);
  backdrop-filter: blur(14px);
  box-shadow: 0 26rpx 70rpx rgba(12, 20, 40, 0.22);
  transition: transform 180ms ease, box-shadow 180ms ease;
}

.t-dark .addFab {
  background: #1a1d21;
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 24rpx 70rpx rgba(0, 0, 0, 0.52);
}

.addFab:active {
  transform: scale(0.96);
}

.addFabText {
  font-size: 42rpx;
  color: rgba(46, 99, 255, 0.95);
  font-weight: 500;
}
</style>

