<template>
  <view class="page" :class="themeClass">
    <view class="bg" />

    <AppHeader />

    <scroll-view class="scroll" scroll-y :show-scrollbar="false" :enhanced="true">
      <view class="safe">
        <view class="hero">
          <view class="heroHead">
            <view class="heroText">
              <text class="h1">{{ greeting }}, {{ userName }}</text>
              <text class="sub">{{ todayText }}</text>
            </view>
          </view>

          <view class="metrics">
            <view class="metric tap" role="button" @tap="openPlanner">
              <view class="metricNumRow">
                <text class="metricNum">{{ todayTasksCount }}</text>
                <text class="metricChev">&gt;</text>
              </view>
              <text class="metricLabel">tasks today</text>
            </view>
            <view class="metric tap" role="button" @tap="viewAllNotices">
              <view class="metricNumRow">
                <text class="metricNum">{{ unreadNoticesCount }}</text>
                <text class="metricChev">&gt;</text>
              </view>
              <text class="metricLabel">unread notices</text>
            </view>
            <view class="metric tap" role="button" @tap="openFocus">
              <view class="metricNumRow">
                <text class="metricNum">{{ focusHoursDisplay }}</text>
                <text class="metricChev">&gt;</text>
              </view>
              <text class="metricLabel">focused</text>
            </view>
          </view>
        </view>

        <view class="section">
          <text class="sectionTitle">Recent notices</text>

          <view v-if="!notices.length" class="emptyCard">
            <EmptyState variant="notifications" title="No notices yet" />
          </view>
          <view v-else class="taskList">
            <view
              v-for="n in notices"
              :key="n.id"
              class="taskRow tap"
              :class="{ pressed: pressedKey === 'notice:' + n.id }"
              @touchstart="pressedKey = 'notice:' + n.id"
              @touchend="pressedKey = ''"
              @touchcancel="pressedKey = ''"
              @tap="openNotice(n)"
            >
              <view class="taskMain">
                <text class="taskTitle" :number-of-lines="1">{{ n.title }}</text>
                <view class="taskMeta">
                  <text v-if="n.deadline" class="metaMuted">{{ n.deadline }}</text>
                  <view class="task-chip" :class="noticeTypeClass(n.type)">
                    <text class="task-chip-text">{{ n.type }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view class="section">
          <text class="sectionTitle">Today's focus</text>

          <view v-if="!todayTasks.length" class="emptyCard">
            <EmptyState variant="tasks" title="No tasks today" />
          </view>
          <view v-else class="taskList">
            <view
              v-for="t in todayTasks"
              :key="t.id"
              class="taskRow tap"
              :class="[{ pressed: pressedKey === 'task:' + t.id }, 'st-' + t.status]"
              @touchstart="pressedKey = 'task:' + t.id"
              @touchend="pressedKey = ''"
              @touchcancel="pressedKey = ''"
              @tap="openTask(t)"
            >
              <view class="check" :class="{ on: t.done }" @tap.stop="toggleTask(t)">
                <view class="checkDot" />
              </view>
              <view class="taskMain">
                <text class="taskTitle" :class="{ done: t.done }" :number-of-lines="1">{{ t.title }}</text>
                <view class="taskMeta">
                  <text class="metaMuted">{{ t.deadline }}</text>
                  <view class="task-chip" :class="'state-' + t.status">
                    <text class="task-chip-text">{{ t.status }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view class="spacer" />
      </view>
    </scroll-view>

    <BottomNav active="home" />
    <GlobalSearchOverlay />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import BottomNav from '@/components/BottomNav.vue'
import AppHeader from '@/components/AppHeader.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useTheme } from '@/composables/useTheme'
import { taskDueBucket } from '@/lib/taskDueDate'
import { useTasksStore } from '@/composables/useTasksStore'
import { useNotificationStore } from '@/composables/useNotificationStore'
import { useUserStore } from '@/composables/useUserStore'
import { useFocusStore } from '@/composables/useFocusStore'

const { themeClass } = useTheme()
const { tasks, toggleTaskDone } = useTasksStore()
const { visibleNotifications } = useNotificationStore()
const { currentUser, fetchCurrentUser } = useUserStore()
const { totalHoursLabel } = useFocusStore()
const userName = computed(() => currentUser.value.name || 'Guest')

const pressedKey = ref('')

const notices = computed(() =>
  visibleNotifications.value.slice(0, 4).map((n) => ({
    id: n.id,
    title: n.title,
    type: n.type || 'General',
    deadline: n.deadline || '',
  }))
)

function noticeTypeClass(type) {
  const key = String(type || '').toLowerCase()
  if (key === 'homework') return 'sub-blue'
  if (key === 'via') return 'sub-green'
  if (key === 'event') return 'sub-amber'
  return 'sub-slate'
}

const todayTasks = computed(() =>
  tasks.value.filter((x) => !x.done && (taskDueBucket(x) === 'recent' || taskDueBucket(x) === 'overdue')).slice(0, 4)
)

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
})

const todayText = computed(() => {
  const d = new Date()
  const wk = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]
  const m = d.toLocaleString('en-US', { month: 'short' })
  return `${wk}, ${m} ${d.getDate()}`
})

const todayTasksCount = computed(() => tasks.value.filter((x) => !x.done && taskDueBucket(x) === 'recent').length)
const unreadNoticesCount = computed(() => visibleNotifications.value.filter((n) => !n.read).length)
const focusHoursDisplay = computed(() => totalHoursLabel.value || '0m')

function viewAllNotices() {
  uni.navigateTo({ url: '/pages/notifications/index', animationType: 'slide-in-right', animationDuration: 220 })
}

function openNotice(n) {
  uni.navigateTo({ url: `/pages/notice/detail?id=${encodeURIComponent(n.id)}`, animationType: 'slide-in-right', animationDuration: 220 })
}

function openTask(t) {
  uni.navigateTo({ url: `/pages/task/detail?id=${encodeURIComponent(t.id)}`, animationType: 'slide-in-right', animationDuration: 220 })
}

function toggleTask(t) {
  toggleTaskDone(t.id)
}

function openPlanner() {
  uni.navigateTo({ url: '/pages/tasks/index', animationType: 'slide-in-right', animationDuration: 220 })
}

function openFocus() {
  uni.navigateTo({ url: '/pages/study/focus', animationType: 'slide-in-right', animationDuration: 220 })
}

onLoad(() => { fetchCurrentUser() })
onShow(() => { fetchCurrentUser() })
</script>

<style scoped>
.page { min-height: 100vh; position: relative; overflow: hidden; }
.bg { position: absolute; inset: 0; z-index: 0; background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(40, 110, 255, 0.18), transparent 60%), radial-gradient(900rpx 700rpx at 70% 30%, rgba(120, 180, 255, 0.14), transparent 65%), linear-gradient(180deg, rgba(248, 250, 255, 1), rgba(241, 244, 250, 1)); }
.t-dark .bg { background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(60, 120, 255, 0.14), transparent 58%), radial-gradient(900rpx 700rpx at 70% 30%, rgba(100, 160, 255, 0.08), transparent 62%), linear-gradient(180deg, #111315, #0e1014); }

.scroll { position: relative; z-index: 1; height: calc(100vh - var(--shell-header-offset, 148rpx)); }
.safe { padding: 0 28rpx 200rpx; }

.hero { padding-top: 4rpx; padding-bottom: 4rpx; }
.heroHead { display: flex; align-items: flex-end; justify-content: space-between; padding: 20rpx 4rpx 18rpx; }
.heroText { display: flex; flex-direction: column; gap: 6rpx; }
.h1 { font-size: 40rpx; font-weight: 740; color: rgba(16, 24, 40, 0.92); letter-spacing: -0.5rpx; }
.t-dark .h1 { color: rgba(245, 247, 255, 0.92); }
.sub { font-size: 22rpx; color: rgba(16, 24, 40, 0.5); }
.t-dark .sub { color: rgba(245, 247, 255, 0.5); }

.metrics { display: flex; gap: 10rpx; padding: 0 0 6rpx; }
.metric { flex: 1; padding: 18rpx 18rpx; border-radius: 26rpx; background: rgba(255, 255, 255, 0.7); border: 1rpx solid rgba(16, 24, 40, 0.04); transition: transform 180ms ease, background 220ms ease, border-color 220ms ease; }
.t-dark .metric { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.06); }
.metric.tap:active { transform: scale(0.985); background: rgba(46, 99, 255, 0.06); border-color: rgba(46, 99, 255, 0.16); }
.metricNumRow { display: flex; align-items: baseline; gap: 6rpx; justify-content: space-between; }
.metricNum { font-size: 36rpx; font-weight: 780; color: rgba(16, 24, 40, 0.92); letter-spacing: -0.5rpx; }
.t-dark .metricNum { color: rgba(245, 247, 255, 0.92); }
.metricChev { font-size: 24rpx; color: rgba(16, 24, 40, 0.3); font-weight: 300; }
.t-dark .metricChev { color: rgba(245, 247, 255, 0.3); }
.metricLabel { display: block; margin-top: 4rpx; font-size: 19rpx; color: rgba(16, 24, 40, 0.52); }
.t-dark .metricLabel { color: rgba(245, 247, 255, 0.48); }

.section { margin-top: 22rpx; }
.sectionTitle { display: block; font-size: 22rpx; color: rgba(16, 24, 40, 0.6); font-weight: 660; padding: 6rpx 4rpx 12rpx; }
.t-dark .sectionTitle { color: rgba(245, 247, 255, 0.55); }

.emptyCard { padding: 8rpx 0; }

.taskList { display: flex; flex-direction: column; gap: var(--list-stack-gap); }
.taskRow { display: flex; align-items: center; gap: var(--list-card-gap); padding: var(--list-card-pad-y) var(--list-card-pad-x); border-radius: var(--list-card-radius); background: rgba(255, 255, 255, 0.7); border: 1rpx solid rgba(16, 24, 40, 0.04); transition: transform 180ms ease, background 220ms ease, border-color 220ms ease; }
.t-dark .taskRow { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.06); }
.taskRow.tap:active { transform: scale(0.985); }
.check { width: var(--list-check-size); height: var(--list-check-size); border-radius: var(--list-check-radius); background: rgba(16, 24, 40, 0.06); border: 1rpx solid rgba(16, 24, 40, 0.08); display: flex; align-items: center; justify-content: center; }
.t-dark .check { background: rgba(245, 247, 255, 0.06); border-color: rgba(255, 255, 255, 0.08); }
.checkDot { width: var(--list-check-dot); height: var(--list-check-dot); border-radius: 50%; background: rgba(16, 24, 40, 0.16); transition: transform 180ms ease, background 180ms ease; }
.check.on { background: rgba(46, 99, 255, 0.14); border-color: rgba(46, 99, 255, 0.22); }
.check.on .checkDot { background: rgba(46, 99, 255, 0.95); transform: scale(1.05); }
.taskMain { flex: 1; display: flex; flex-direction: column; gap: 6rpx; min-width: 0; }
.taskTitle { font-size: var(--list-title-size); font-weight: 720; color: rgba(16, 24, 40, 0.9); }
.t-dark .taskTitle { color: rgba(245, 247, 255, 0.9); }
.taskTitle.done { opacity: 0.5; text-decoration: line-through; }
.taskMeta { display: flex; align-items: center; gap: 10rpx; justify-content: space-between; }
.metaMuted { font-size: var(--list-meta-size); color: rgba(16, 24, 40, 0.5); }
.t-dark .metaMuted { color: rgba(245, 247, 255, 0.45); }

.spacer { height: 18rpx; }
</style>
