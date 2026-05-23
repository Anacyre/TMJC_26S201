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

        <SkeletonList v-if="loading" variant="tasks" :count="4" />

        <view v-else-if="!filtered.length" class="emptyWrap">
          <EmptyState
            variant="tasks"
            :title="emptyTitle"
            :action-label="tab !== 'completed' ? 'New task' : ''"
            @action="openCreate"
          />
        </view>

        <view v-else class="list">
          <template v-for="t in filtered" :key="t.id">
            <SwipeRow
              v-if="tab === 'completed'"
              side="left"
              :actions="taskSwipeActions"
              commit-action="delete"
              :context-items="taskContextItems"
              @commit="deleteTaskRow(t.id)"
              @action="onTaskSwipeAction(t.id, $event)"
            >
              <view
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
                    <view class="tag"><text class="tagText">{{ t.subject }}</text></view>
                    <text class="state" :class="'state-' + t.status">{{ t.status }}</text>
                  </view>
                </view>
              </view>
            </SwipeRow>
            <view
              v-else
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
                  <view class="tag"><text class="tagText">{{ t.subject }}</text></view>
                  <text class="state" :class="'state-' + t.status">{{ t.status }}</text>
                </view>
              </view>
            </view>
          </template>
        </view>

        <view v-if="tab === 'completed' && filtered.length" class="swipeHint">
          <text class="swipeHintText">Swipe for delete · archive</text>
        </view>

        <view class="spacer" />
      </view>
    </scroll-view>

    <view class="addFab" role="button" @tap="openCreate" aria-label="Add task">
      <view class="plus">
        <view class="hLine" />
        <view class="vLine" />
      </view>
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
import EmptyState from '@/components/EmptyState.vue'
import SwipeRow from '@/components/SwipeRow.vue'
import SkeletonList from '@/components/SkeletonList.vue'
import { useTheme } from '@/composables/useTheme'
import { useTasksStore } from '@/composables/useTasksStore'
import { toast } from '@/composables/useToast'

const { themeClass } = useTheme()
const { tasks, loading, toggleTaskDone, addTask, deleteTask, archiveTask } = useTasksStore()

const taskSwipeActions = [
  { id: 'delete', icon: 'trash' },
  { id: 'archive', icon: 'archive' },
]
const taskContextItems = [
  { id: 'delete', label: 'Delete task', icon: 'trash', danger: true },
  { id: 'archive', label: 'Archive task', icon: 'archive' },
]

const tab = ref('today')
const pressedKey = ref('')
const createOpen = ref(false)
const emptyTask = ref({ title: '', description: '', deadline: '', subject: '', priority: 'P2', status: 'today', reminder: '', checklist: [] })

const filtered = computed(() => {
  if (tab.value === 'completed') return tasks.value.filter((x) => x.done && x.status !== 'archived')
  if (tab.value === 'upcoming') return tasks.value.filter((x) => !x.done && x.status === 'upcoming')
  return tasks.value.filter((x) => !x.done && (x.status === 'today' || x.status === 'overdue'))
})

const emptyTitle = computed(() => {
  if (tab.value === 'completed') return 'No tasks yet'
  if (tab.value === 'upcoming') return 'No upcoming tasks'
  return 'No tasks today'
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
  toast.added()
}

function deleteTaskRow(id) {
  deleteTask(id)
  toast.taskDeleted()
}

function archiveTaskRow(id) {
  archiveTask(id)
  toast.taskArchived()
}

function onTaskSwipeAction(id, actionId) {
  if (actionId === 'archive') archiveTaskRow(id)
  else deleteTaskRow(id)
}
</script>

<style scoped>
.page { min-height: 100vh; position: relative; overflow: hidden; }
.bg { position: absolute; inset: 0; z-index: 0; background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(40, 110, 255, 0.18), transparent 60%), radial-gradient(900rpx 700rpx at 70% 30%, rgba(120, 180, 255, 0.14), transparent 65%), linear-gradient(180deg, rgba(248, 250, 255, 1), rgba(241, 244, 250, 1)); }
.t-dark .bg { background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(60, 120, 255, 0.14), transparent 58%), radial-gradient(900rpx 700rpx at 70% 30%, rgba(100, 160, 255, 0.08), transparent 62%), linear-gradient(180deg, #111315, #0e1014); }

.scroll { position: relative; z-index: 1; height: calc(100vh - 110rpx); }
.safe { padding: 0 28rpx 200rpx; }

.tabs { display: flex; gap: 8rpx; padding: 8rpx 0 18rpx; }
.tab { padding: 12rpx 18rpx; border-radius: 999rpx; background: transparent; opacity: 0.62; transition: transform 150ms cubic-bezier(0.34,1.2,0.64,1), opacity 150ms ease, background 150ms ease; }
.tab.on { opacity: 1; background: rgba(46, 99, 255, 0.12); }
.tab:active { transform: scale(0.97); }
.tabText { font-size: 22rpx; font-weight: 660; color: rgba(16, 24, 40, 0.7); }
.t-dark .tabText { color: rgba(245, 247, 255, 0.66); }
.tab.on .tabText { color: rgba(46, 99, 255, 0.96); font-weight: 740; }
.t-dark .tab.on .tabText { color: rgba(170, 200, 255, 0.96); }

.emptyWrap { padding: 32rpx 0 0; }
.list { display: flex; flex-direction: column; gap: 12rpx; }
.swipeHint { padding: 18rpx 0 6rpx; text-align: center; opacity: 0.5; }
.swipeHintText { font-size: 18rpx; color: rgba(16, 24, 40, 0.5); }
.t-dark .swipeHintText { color: rgba(245, 247, 255, 0.5); }

.card { width: 100%; border-radius: 26rpx; background: rgba(255, 255, 255, 0.7); border: none; box-shadow: 0 14rpx 40rpx rgba(12, 20, 40, 0.06); transition: transform 150ms cubic-bezier(0.34,1.2,0.64,1), box-shadow 150ms ease; }
.t-dark .card { background: rgba(255, 255, 255, 0.04); box-shadow: 0 18rpx 50rpx rgba(0, 0, 0, 0.32); }
.tap:active { transform: scale(0.99); }
.pressed { transform: scale(0.99); }

.task { display: flex; gap: 14rpx; padding: 18rpx 18rpx; align-items: center; }
.left { padding-top: 2rpx; }
.check { width: 42rpx; height: 42rpx; border-radius: 14rpx; background: rgba(16, 24, 40, 0.06); border: 1rpx solid rgba(16, 24, 40, 0.08); display: flex; align-items: center; justify-content: center; transition: transform 180ms ease, background 220ms ease, border-color 220ms ease; }
.t-dark .check { background: rgba(245, 247, 255, 0.06); border-color: rgba(255, 255, 255, 0.08); }
.check:active { transform: scale(0.96); }
.checkDot { width: 16rpx; height: 16rpx; border-radius: 50%; background: rgba(16, 24, 40, 0.16); transition: transform 220ms ease, background 220ms ease; }
.check.on { background: rgba(46, 99, 255, 0.16); border-color: rgba(46, 99, 255, 0.24); }
.check.on .checkDot { background: rgba(46, 99, 255, 0.94); transform: scale(1.05); }

.main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.row1 { display: flex; align-items: center; justify-content: space-between; gap: 10rpx; }
.title { font-size: 26rpx; font-weight: 740; color: rgba(16, 24, 40, 0.92); }
.t-dark .title { color: rgba(245, 247, 255, 0.92); }
.title.done { opacity: 0.45; text-decoration: line-through; }
.prio { padding: 4rpx 10rpx; border-radius: 999rpx; background: transparent; border: 1rpx solid rgba(16, 24, 40, 0.06); }
.t-dark .prio { border-color: rgba(255, 255, 255, 0.06); }
.prio.p-P1 { background: rgba(255, 59, 48, 0.10); border-color: rgba(255, 59, 48, 0.18); }
.prio.p-P2 { background: rgba(255, 149, 0, 0.10); border-color: rgba(255, 149, 0, 0.18); }
.prio.p-P3 { background: rgba(88, 86, 214, 0.10); border-color: rgba(88, 86, 214, 0.18); }
.prioText { font-size: 17rpx; font-weight: 800; color: rgba(16, 24, 40, 0.62); }
.t-dark .prioText { color: rgba(245, 247, 255, 0.58); }
.prio.p-P1 .prioText { color: rgba(220, 55, 45, 0.96); }
.prio.p-P2 .prioText { color: rgba(180, 110, 20, 0.96); }
.t-dark .prio.p-P2 .prioText { color: rgba(255, 180, 80, 0.96); }
.prio.p-P3 .prioText { color: rgba(88, 86, 214, 0.96); }

.row2 { display: flex; align-items: center; gap: 8rpx; flex-wrap: wrap; }
.metaMuted { font-size: 19rpx; color: rgba(16, 24, 40, 0.52); }
.t-dark .metaMuted { color: rgba(245, 247, 255, 0.46); }
.tag { padding: 4rpx 10rpx; border-radius: 999rpx; background: rgba(46, 99, 255, 0.08); border: 1rpx solid rgba(46, 99, 255, 0.16); }
.tagText { font-size: 17rpx; font-weight: 700; color: rgba(46, 99, 255, 0.94); }
.state { font-size: 17rpx; font-weight: 800; letter-spacing: 0.3rpx; text-transform: lowercase; padding: 4rpx 10rpx; border-radius: 999rpx; border: 1rpx solid transparent; }
.state-overdue { color: rgba(255, 59, 48, 0.92); background: rgba(255, 59, 48, 0.10); border-color: rgba(255, 59, 48, 0.18); }
.state-today { color: rgba(46, 99, 255, 0.92); background: rgba(46, 99, 255, 0.10); border-color: rgba(46, 99, 255, 0.18); }
.state-upcoming { color: rgba(16, 24, 40, 0.6); background: rgba(16, 24, 40, 0.06); border-color: rgba(16, 24, 40, 0.08); }
.t-dark .state-upcoming { color: rgba(245, 247, 255, 0.54); background: rgba(245, 247, 255, 0.06); border-color: rgba(255, 255, 255, 0.08); }
.state-completed { color: rgba(36, 160, 110, 0.96); background: rgba(36, 160, 110, 0.10); border-color: rgba(36, 160, 110, 0.18); }
.t-dark .state-completed { color: rgba(120, 220, 170, 0.96); }

.spacer { height: 18rpx; }

.addFab { position: fixed; right: 28rpx; bottom: calc(160rpx + env(safe-area-inset-bottom)); width: 96rpx; height: 96rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.78); border: 1rpx solid rgba(255, 255, 255, 0.6); backdrop-filter: blur(16px); box-shadow: 0 26rpx 70rpx rgba(12, 20, 40, 0.22); z-index: 35; transition: transform 200ms ease, box-shadow 200ms ease; }
.t-dark .addFab { background: rgba(26, 29, 33, 0.86); border-color: rgba(255, 255, 255, 0.08); box-shadow: 0 24rpx 70rpx rgba(0, 0, 0, 0.52); }
.addFab:active { transform: scale(0.94); box-shadow: 0 14rpx 40rpx rgba(12, 20, 40, 0.16); }
.plus { position: relative; width: 26rpx; height: 26rpx; }
.hLine, .vLine { position: absolute; background: rgba(46, 99, 255, 0.95); border-radius: 999rpx; }
.hLine { left: 0; right: 0; top: 50%; height: 2.4rpx; margin-top: -1.2rpx; }
.vLine { top: 0; bottom: 0; left: 50%; width: 2.4rpx; margin-left: -1.2rpx; }
</style>
