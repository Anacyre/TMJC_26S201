<template>
  <view class="page" :class="themeClass">
    <view class="bg" />

    <AppHeader title="Dashboard" />

    <scroll-view class="scroll" scroll-y :show-scrollbar="false" :enhanced="true">
      <view class="safe">
        <view class="card tap" @tap="pressCard" :class="{ pressed: pressedKey === 'greeting' }">
          <view class="cardHead">
            <view class="cardTitleWrap">
              <text class="h1">{{ greeting }}, {{ userName }}</text>
              <text class="sub">{{ todayText }}</text>
            </view>
            <view class="pill">
              <text class="pillText">{{ theme === 'dark' ? 'Dark' : 'Light' }}</text>
            </view>
          </view>

          <view class="metrics">
            <view class="metric">
              <text class="metricNum">{{ todayTasksCount }}</text>
              <text class="metricLabel">tasks today</text>
            </view>
            <view class="metric">
              <text class="metricNum">{{ unreadNoticesCount }}</text>
              <text class="metricLabel">unread notices</text>
            </view>
          </view>
        </view>

        <view class="section">
          <view class="sectionHead">
            <text class="sectionTitle">Notification preview</text>
            <text class="sectionLink" @tap="viewAllNotices">View all notices</text>
          </view>

          <view class="card pad">
            <view class="noticeGrid">
              <view
                v-for="n in notices"
                :key="n.id"
                class="noticeItem tap"
                :class="{ pressed: pressedKey === 'notice:' + n.id }"
                @touchstart="pressedKey = 'notice:' + n.id"
                @touchend="pressedKey = ''"
                @touchcancel="pressedKey = ''"
                @tap="openNotice(n)"
              >
                <view class="noticeTop">
                  <view class="tag" :class="'tag-' + n.tag.toLowerCase()">
                    <text class="tagText">{{ n.tag }}</text>
                  </view>
                  <text class="time">{{ n.time }}</text>
                </view>
                <text class="noticeTitle" :number-of-lines="2">{{ n.title }}</text>
                <view class="noticeMeta">
                  <text class="metaMuted">{{ n.subject }}</text>
                  <text v-if="n.ddl" class="ddl">DDL {{ n.ddl }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view class="section">
          <view class="sectionHead">
            <text class="sectionTitle">Upcoming tasks</text>
            <text class="sectionLink" @tap="openPlanner">Open planner</text>
          </view>

          <view class="card pad">
            <view class="taskList">
              <view
                v-for="t in tasks"
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
                    <text class="state" :class="'state-' + t.status">{{ t.status }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view class="section">
          <view class="sectionHead">
            <text class="sectionTitle">Community activity</text>
            <text class="sectionLink" @tap="exploreCommunity">Explore</text>
          </view>

          <view class="card pad">
            <view class="postList">
              <view
                v-for="p in posts"
                :key="p.id"
                class="postRow tap"
                :class="{ pressed: pressedKey === 'post:' + p.id }"
                @touchstart="pressedKey = 'post:' + p.id"
                @touchend="pressedKey = ''"
                @touchcancel="pressedKey = ''"
                @tap="openPost(p)"
              >
                <view class="postMain">
                  <text class="postTitle" :number-of-lines="1">{{ p.title }}</text>
                  <text class="metaMuted">{{ p.community }} · {{ p.replies }} replies</text>
                </view>
                <view class="likes">
                  <text class="likesNum">{{ p.likes }}</text>
                  <text class="likesLabel">likes</text>
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
import { useTheme } from '@/composables/useTheme'
import { useTasksStore } from '@/composables/useTasksStore'
import { useCommunityStore } from '@/composables/useCommunityStore'
import { useNotificationStore } from '@/composables/useNotificationStore'
import { useUserStore } from '@/composables/useUserStore'

const { theme, themeClass } = useTheme()
const { tasks, toggleTaskDone } = useTasksStore()
const { members } = useCommunityStore()
const { visibleNotifications } = useNotificationStore()
const { currentUser, fetchCurrentUser } = useUserStore()
const userName = computed(() => currentUser.value.name || 'Guest')

const pressedKey = ref('')

const notices = computed(() =>
  visibleNotifications.value.slice(0, 4).map((n, idx) => ({
    id: n.id,
    title: n.title,
    tag: n.type,
    time: ['1h', '3h', 'Yesterday', '2d'][idx] || 'now',
    subject: n.subject,
    ddl: n.deadline,
  }))
)

const posts = ref([
  { id: 'p1', title: 'Best way to structure study sprints?', community: 'Study Lab', replies: 12, likes: 38 },
  { id: 'p2', title: 'Anyone wants to pair on Chapter 6?', community: 'Math', replies: 7, likes: 22 },
  { id: 'p3', title: 'Share your note templates (Notion/Obsidian)', community: 'Productivity', replies: 18, likes: 64 },
])

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
  return `${wk} · ${m} ${d.getDate()}`
})

const todayTasksCount = computed(() => tasks.value.filter((x) => x.status === 'today' && !x.done).length)
const unreadNoticesCount = computed(() => visibleNotifications.value.filter((n) => !n.read).length)

const initials = computed(() => {
  const parts = (userName.value || '').trim().split(/\s+/).filter(Boolean)
  const a = parts[0]?.[0] || '?'
  const b = parts[1]?.[0] || ''
  return (a + b).toUpperCase()
})

function toast(title) {
  uni.showToast({ title, icon: 'none' })
}

function pressCard() {
  pressedKey.value = 'greeting'
  setTimeout(() => (pressedKey.value = ''), 160)
}

function viewAllNotices() {
  uni.navigateTo({ url: '/pages/notifications/index' })
}

function openNotice(n) {
  uni.navigateTo({ url: `/pages/notice/detail?id=${encodeURIComponent(n.id)}` })
}

function openTask(t) {
  uni.navigateTo({ url: `/pages/task/detail?id=${encodeURIComponent(t.id)}` })
}

function toggleTask(t) {
  toggleTaskDone(t.id)
}

function openPlanner() {
  uni.navigateTo({ url: '/pages/tasks/index' })
}

function openPost(p) {
  uni.navigateTo({ url: '/pages/community/post-detail?id=p1', animationType: 'slide-in-right', animationDuration: 220 })
}

function exploreCommunity() {
  uni.navigateTo({ url: '/pages/community/index', animationType: 'slide-in-right', animationDuration: 220 })
}


onLoad(() => {
  fetchCurrentUser()
})

onShow(() => {
  fetchCurrentUser()
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
  transition: transform 180ms ease, box-shadow 180ms ease;
}

.t-dark .brand {
  background: rgba(22, 28, 44, 0.55);
  border-color: rgba(255, 255, 255, 0.10);
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
  font-weight: 720;
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

.topTitle {
  opacity: 0.72;
}

.topTitleText {
  font-size: 22rpx;
  color: rgba(16, 24, 40, 0.62);
}

.t-dark .topTitleText {
  color: rgba(245, 247, 255, 0.52);
}

.topRight {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.iconBtn {
  width: 68rpx;
  height: 48rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.62);
  border: 1rpx solid rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(12px);
  transition: transform 180ms ease;
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

.avatar {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(46, 99, 255, 0.12);
  border: 1rpx solid rgba(46, 99, 255, 0.18);
  box-shadow: 0 16rpx 40rpx rgba(46, 99, 255, 0.12);
  transition: transform 180ms ease, box-shadow 180ms ease;
}

.t-dark .avatar {
  background: rgba(46, 99, 255, 0.18);
  box-shadow: 0 18rpx 50rpx rgba(0, 0, 0, 0.35);
}

.avatarText {
  font-size: 22rpx;
  font-weight: 760;
  color: rgba(46, 99, 255, 0.98);
}

.scroll {
  position: relative;
  z-index: 1;
  height: calc(100vh - 110rpx);
}

.safe {
  padding: 0 28rpx 180rpx;
}

.card {
  width: 100%;
  border-radius: 34rpx;
  background: rgba(255, 255, 255, 0.74);
  border: 1rpx solid rgba(255, 255, 255, 0.60);
  box-shadow: 0 22rpx 70rpx rgba(12, 20, 40, 0.10);
  backdrop-filter: blur(14px);
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
}

.t-dark .card {
  background: #1a1d21;
  border-color: rgba(255, 255, 255, 0.06);
  box-shadow: 0 22rpx 72rpx rgba(0, 0, 0, 0.4);
}

.pad {
  padding: 22rpx 22rpx;
}

.tap:active {
  transform: scale(0.985);
}

.pressed {
  transform: scale(0.988);
}

.cardHead {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 26rpx 24rpx 16rpx;
}

.h1 {
  font-size: 38rpx;
  font-weight: 780;
  color: rgba(16, 24, 40, 0.92);
  letter-spacing: -0.5rpx;
}

.t-dark .h1 {
  color: rgba(245, 247, 255, 0.92);
}

.sub {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: rgba(16, 24, 40, 0.60);
}

.t-dark .sub {
  color: rgba(245, 247, 255, 0.54);
}

.pill {
  padding: 10rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(16, 24, 40, 0.06);
  border: 1rpx solid rgba(16, 24, 40, 0.08);
}

.t-dark .pill {
  background: rgba(245, 247, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.10);
}

.pillText {
  font-size: 22rpx;
  color: rgba(16, 24, 40, 0.70);
}

.t-dark .pillText {
  color: rgba(245, 247, 255, 0.62);
}

.metrics {
  display: flex;
  gap: 14rpx;
  padding: 0 24rpx 22rpx;
}

.metric {
  flex: 1;
  padding: 18rpx 18rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.62);
  border: 1rpx solid rgba(16, 24, 40, 0.08);
}

.t-dark .metric {
  background: #23272d;
  border-color: rgba(255, 255, 255, 0.04);
}

.metricNum {
  font-size: 34rpx;
  font-weight: 800;
  color: rgba(16, 24, 40, 0.92);
}

.t-dark .metricNum {
  color: rgba(245, 247, 255, 0.92);
}

.metricLabel {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: rgba(16, 24, 40, 0.56);
}

.t-dark .metricLabel {
  color: rgba(245, 247, 255, 0.50);
}

.section {
  margin-top: 22rpx;
}

.sectionHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6rpx 6rpx 12rpx;
}

.sectionTitle {
  font-size: 22rpx;
  color: rgba(16, 24, 40, 0.58);
}

.t-dark .sectionTitle {
  color: rgba(245, 247, 255, 0.50);
}

.sectionLink {
  font-size: 22rpx;
  color: rgba(46, 99, 255, 0.95);
}

.noticeGrid {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}

.noticeItem {
  width: calc(50% - 7rpx);
  padding: 16rpx 16rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.62);
  border: 1rpx solid rgba(16, 24, 40, 0.08);
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
}

.t-dark .noticeItem {
  background: #23272d;
  border-color: rgba(255, 255, 255, 0.04);
}

.noticeTop {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10rpx;
}

.tag {
  padding: 6rpx 10rpx;
  border-radius: 999rpx;
  background: rgba(16, 24, 40, 0.06);
  border: 1rpx solid rgba(16, 24, 40, 0.08);
}

.t-dark .tag {
  background: rgba(245, 247, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.10);
}

.tagText {
  font-size: 18rpx;
  color: rgba(16, 24, 40, 0.70);
}

.t-dark .tagText {
  color: rgba(245, 247, 255, 0.62);
}

.tag-homework {
  border-color: rgba(46, 99, 255, 0.18);
  background: rgba(46, 99, 255, 0.10);
}
.tag-via {
  border-color: rgba(120, 160, 255, 0.18);
  background: rgba(120, 160, 255, 0.10);
}
.tag-general {
  border-color: rgba(16, 24, 40, 0.10);
  background: rgba(16, 24, 40, 0.06);
}

.time {
  font-size: 18rpx;
  color: rgba(16, 24, 40, 0.46);
}

.t-dark .time {
  color: rgba(245, 247, 255, 0.42);
}

.noticeTitle {
  font-size: 24rpx;
  font-weight: 720;
  color: rgba(16, 24, 40, 0.90);
}

.t-dark .noticeTitle {
  color: rgba(245, 247, 255, 0.92);
}

.noticeMeta {
  margin-top: 10rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10rpx;
}

.metaMuted {
  font-size: 20rpx;
  color: rgba(16, 24, 40, 0.52);
}

.t-dark .metaMuted {
  color: rgba(245, 247, 255, 0.48);
}

.ddl {
  font-size: 20rpx;
  color: rgba(46, 99, 255, 0.95);
}

.taskList {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.taskRow {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 14rpx 14rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.62);
  border: 1rpx solid rgba(16, 24, 40, 0.08);
}

.t-dark .taskRow {
  background: #23272d;
  border-color: rgba(255, 255, 255, 0.04);
}

.check {
  width: 42rpx;
  height: 42rpx;
  border-radius: 14rpx;
  background: rgba(16, 24, 40, 0.06);
  border: 1rpx solid rgba(16, 24, 40, 0.10);
  display: flex;
  align-items: center;
  justify-content: center;
}

.t-dark .check {
  background: rgba(245, 247, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.12);
}

.checkDot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 6rpx;
  background: rgba(16, 24, 40, 0.18);
  transition: transform 160ms ease, background 160ms ease;
}

.check.on {
  background: rgba(46, 99, 255, 0.14);
  border-color: rgba(46, 99, 255, 0.18);
}

.check.on .checkDot {
  transform: scale(1.05);
  background: rgba(46, 99, 255, 0.95);
}

.taskMain {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.taskTitle {
  font-size: 24rpx;
  font-weight: 720;
  color: rgba(16, 24, 40, 0.90);
}

.t-dark .taskTitle {
  color: rgba(245, 247, 255, 0.92);
}

.taskTitle.done {
  opacity: 0.5;
  text-decoration: line-through;
}

.taskMeta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.state {
  font-size: 18rpx;
  padding: 6rpx 10rpx;
  border-radius: 999rpx;
  border: 1rpx solid rgba(16, 24, 40, 0.10);
  background: rgba(16, 24, 40, 0.06);
  color: rgba(16, 24, 40, 0.70);
  text-transform: capitalize;
}

.t-dark .state {
  border-color: rgba(255, 255, 255, 0.10);
  background: rgba(245, 247, 255, 0.08);
  color: rgba(245, 247, 255, 0.62);
}

.state-overdue {
  border-color: rgba(255, 90, 90, 0.18);
  background: rgba(255, 90, 90, 0.10);
  color: rgba(210, 60, 60, 0.95);
}

.t-dark .state-overdue {
  color: rgba(255, 170, 170, 0.90);
}

.state-today {
  border-color: rgba(46, 99, 255, 0.18);
  background: rgba(46, 99, 255, 0.10);
  color: rgba(46, 99, 255, 0.95);
}

.postList {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.postRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  padding: 14rpx 14rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.62);
  border: 1rpx solid rgba(16, 24, 40, 0.08);
}

.t-dark .postRow {
  background: #23272d;
  border-color: rgba(255, 255, 255, 0.04);
}

.postMain {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.postTitle {
  font-size: 24rpx;
  font-weight: 720;
  color: rgba(16, 24, 40, 0.90);
}

.t-dark .postTitle {
  color: rgba(245, 247, 255, 0.92);
}

.likes {
  width: 108rpx;
  padding: 10rpx 10rpx;
  border-radius: 20rpx;
  background: rgba(16, 24, 40, 0.05);
  border: 1rpx solid rgba(16, 24, 40, 0.08);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.t-dark .likes {
  background: rgba(245, 247, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.10);
}

.likesNum {
  font-size: 22rpx;
  font-weight: 780;
  color: rgba(16, 24, 40, 0.85);
}

.t-dark .likesNum {
  color: rgba(245, 247, 255, 0.82);
}

.likesLabel {
  font-size: 18rpx;
  color: rgba(16, 24, 40, 0.50);
}

.t-dark .likesLabel {
  color: rgba(245, 247, 255, 0.45);
}

.spacer {
  height: 18rpx;
}

/* tabbar moved to `src/components/BottomNav.vue` */

.overlay {
  position: fixed;
  inset: 0;
  z-index: 20;
  opacity: 0;
  pointer-events: none;
  transition: opacity 220ms ease;
  background: rgba(10, 14, 26, 0.22);
}

.t-dark .overlay {
  background: rgba(0, 0, 0, 0.45);
}

.overlay.show {
  opacity: 1;
  pointer-events: auto;
}

.overlaySheet {
  position: absolute;
  left: 22rpx;
  right: 22rpx;
  top: 88rpx;
  bottom: 22rpx;
  border-radius: 34rpx;
  background: rgba(255, 255, 255, 0.74);
  border: 1rpx solid rgba(255, 255, 255, 0.60);
  backdrop-filter: blur(18px);
  box-shadow: 0 34rpx 100rpx rgba(12, 20, 40, 0.20);
  transform: translateY(14rpx) scale(0.985);
  transition: transform 220ms ease;
  overflow: hidden;
}

.t-dark .overlaySheet {
  background: rgba(18, 24, 40, 0.62);
  border-color: rgba(255, 255, 255, 0.10);
  box-shadow: 0 40rpx 130rpx rgba(0, 0, 0, 0.55);
}

.overlay.show .overlaySheet {
  transform: translateY(0) scale(1);
}

.searchBar {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 18rpx 18rpx;
  margin: 18rpx 18rpx 0;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.66);
  border: 1rpx solid rgba(16, 24, 40, 0.08);
}

.t-dark .searchBar {
  background: rgba(10, 14, 26, 0.55);
  border-color: rgba(255, 255, 255, 0.10);
}

.searchIcon {
  font-size: 22rpx;
  color: rgba(16, 24, 40, 0.55);
}

.t-dark .searchIcon {
  color: rgba(245, 247, 255, 0.50);
}

.searchInput {
  flex: 1;
  font-size: 26rpx;
  color: rgba(16, 24, 40, 0.92);
}

.t-dark .searchInput {
  color: rgba(245, 247, 255, 0.92);
}

.placeholder {
  color: rgba(16, 24, 40, 0.35);
}

.t-dark .placeholder {
  color: rgba(245, 247, 255, 0.28);
}

.clearBtn {
  padding: 8rpx 12rpx;
  border-radius: 999rpx;
  background: rgba(16, 24, 40, 0.06);
  border: 1rpx solid rgba(16, 24, 40, 0.08);
}

.t-dark .clearBtn {
  background: rgba(245, 247, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.10);
}

.clearText {
  font-size: 20rpx;
  color: rgba(16, 24, 40, 0.70);
}

.t-dark .clearText {
  color: rgba(245, 247, 255, 0.62);
}

.overlayBody {
  padding: 16rpx 18rpx 22rpx;
  height: calc(100% - 110rpx);
  overflow: hidden;
}

.overlaySection {
  margin-top: 14rpx;
}

.overlayTitle {
  padding: 8rpx 10rpx 10rpx;
  font-size: 22rpx;
  color: rgba(16, 24, 40, 0.56);
}

.t-dark .overlayTitle {
  color: rgba(245, 247, 255, 0.50);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  padding: 0 10rpx;
}

.chip {
  padding: 10rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(16, 24, 40, 0.06);
  border: 1rpx solid rgba(16, 24, 40, 0.08);
}

.t-dark .chip {
  background: rgba(245, 247, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.10);
}

.chipText {
  font-size: 20rpx;
  color: rgba(16, 24, 40, 0.72);
}

.t-dark .chipText {
  color: rgba(245, 247, 255, 0.62);
}

.resultGroup {
  margin-top: 10rpx;
  padding: 10rpx 10rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.62);
  border: 1rpx solid rgba(16, 24, 40, 0.08);
}

.t-dark .resultGroup {
  background: rgba(10, 14, 26, 0.55);
  border-color: rgba(255, 255, 255, 0.10);
}

.groupTitle {
  font-size: 20rpx;
  color: rgba(16, 24, 40, 0.55);
  padding: 4rpx 6rpx 10rpx;
}

.t-dark .groupTitle {
  color: rgba(245, 247, 255, 0.48);
}

.resultRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  padding: 10rpx 6rpx;
  border-radius: 18rpx;
}

.resultTitle {
  flex: 1;
  min-width: 0;
  font-size: 22rpx;
  font-weight: 680;
  color: rgba(16, 24, 40, 0.90);
}

.t-dark .resultTitle {
  color: rgba(245, 247, 255, 0.90);
}
</style>
