<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader title="Notifications" nav-mode="back" :show-avatar="false" />

    <view class="filterWrap">
      <view class="filtersTop">
        <scroll-view class="chipScroll grow" scroll-x :show-scrollbar="false" enhanced>
        <view class="chipRow">
          <view
            v-for="f in typeFilters"
            :key="f"
            class="chip"
            :class="{ on: typeFilter === f }"
            role="button"
            @tap="typeFilter = f"
          >
            <text>{{ f }}</text>
          </view>
        </view>
      </scroll-view>
        <view class="hiddenPill" role="button" @tap="openHidden">
          <text class="hiddenPillText">Hidden</text>
        </view>
      </view>
      <scroll-view class="chipScroll sub" scroll-x :show-scrollbar="false" enhanced>
        <view class="chipRow">
          <view
            v-for="s in subjectFilters"
            :key="s"
            class="chip sm"
            :class="{ on: subjectFilter === s }"
            role="button"
            @tap="subjectFilter = s"
          >
            <text>{{ s }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <scroll-view class="scroll" scroll-y :show-scrollbar="false" :scroll-into-view="scrollInto">
      <view v-if="pinnedList.length" class="pinSection">
        <text class="pinLabel">Important</text>
        <NoticeCard
          v-for="n in pinnedList"
          :key="'p-' + n.id"
          :notice="n"
          :hiding="hidingId === n.id"
          @open="onOpenCard(n)"
          @planner="onPlanner(n)"
          @important="onImportant(n)"
          @hide="onHide(n)"
        />
      </view>

      <view v-if="restList.length" class="feedSection">
        <text v-if="pinnedList.length" class="pinLabel dim">All</text>
        <NoticeCard
          v-for="n in restList"
          :key="n.id"
          :id="'n-' + n.id"
          :notice="n"
          :hiding="hidingId === n.id"
          @open="onOpenCard(n)"
          @planner="onPlanner(n)"
          @important="onImportant(n)"
          @hide="onHide(n)"
        />
      </view>

      <view v-if="!pinnedList.length && !restList.length" class="empty">
        <text class="emptyText">No notices match these filters.</text>
      </view>
      <view class="gap" />
    </scroll-view>

    <view class="addFab" role="button" @tap="showCreate = true">
      <text class="addFabText">＋</text>
    </view>

    <view class="overlay" :class="{ show: showCreate }" @tap="showCreate = false">
      <view class="sheet" @tap.stop>
        <text class="sheetTitle">Add Notification</text>
        <input class="input" v-model="draft.type" placeholder="Type (Homework / VIA / Event / General)" placeholder-class="placeholder" />
        <input class="input" v-model="draft.title" placeholder="Title" placeholder-class="placeholder" />
        <input class="input" v-model="draft.subject" placeholder="Subject" placeholder-class="placeholder" />
        <input class="input" v-model="draft.deadline" placeholder="Deadline" placeholder-class="placeholder" />
        <textarea class="input area" v-model="draft.description" placeholder="Description" placeholder-class="placeholder" />
        <view class="create" role="button" @tap="createNotice">Publish</view>
      </view>
    </view>

    <GlobalSearchOverlay />
  </view>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppHeader from '@/components/AppHeader.vue'
import NoticeCard from '@/components/NoticeCard.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import { useTheme } from '@/composables/useTheme'
import { useNotificationStore } from '@/composables/useNotificationStore'
import { useTasksStore } from '@/composables/useTasksStore'

const { themeClass } = useTheme()
const {
  visibleNotifications,
  pinnedNotifications,
  markRead,
  toggleImportant,
  setInPlanner,
  toggleHidden,
  getNotificationById,
  addNotification,
} = useNotificationStore()
const { addTaskFromNotice } = useTasksStore()

const typeFilters = ['All', 'Homework', 'General', 'VIA', 'Events', 'Important']
const subjectFilters = ['All', 'Math', 'Physics', 'Chemistry', 'Economics', 'GP']

const typeFilter = ref('All')
const subjectFilter = ref('All')
const hidingId = ref('')
const scrollInto = ref('')
const showCreate = ref(false)
const draft = ref({
  type: 'General',
  title: '',
  subject: '',
  deadline: '',
  description: '',
})

function subjectMatches(n, chip) {
  if (chip === 'All') return true
  const s = (n.subject || '').toLowerCase()
  if (chip === 'GP') return s.includes('general paper') || s === 'gp'
  if (chip === 'Economics') return s.includes('economics')
  return s.includes(chip.toLowerCase())
}

function typeMatches(n, chip) {
  if (chip === 'All') return true
  if (chip === 'Important') return n.important
  if (chip === 'Events') return n.type === 'Event'
  return n.type === chip
}

const filtered = computed(() =>
  visibleNotifications.value.filter(
    (n) => typeMatches(n, typeFilter.value) && subjectMatches(n, subjectFilter.value)
  )
)

const pinnedList = computed(() => {
  const ids = new Set(pinnedNotifications.value.map((x) => x.id))
  return filtered.value.filter((n) => ids.has(n.id) && n.important)
})

const restList = computed(() => {
  const pinIds = new Set(pinnedList.value.map((x) => x.id))
  return filtered.value.filter((n) => !pinIds.has(n.id))
})

function onOpenCard(n) {
  markRead(n.id)
  uni.navigateTo({
    url: `/pages/notice/detail?id=${encodeURIComponent(n.id)}`,
    animationType: 'slide-in-right',
    animationDuration: 220,
  })
}

function onPlanner(n) {
  if (n.inPlanner) {
    uni.showToast({ title: 'Already in planner', icon: 'none' })
    return
  }
  addTaskFromNotice({
    noticeId: n.id,
    title: n.title,
    subject: n.subject,
    deadline: n.deadline,
    description: n.description,
    noticeTitle: n.title,
  })
  setInPlanner(n.id, true)
  uni.showToast({ title: 'Added to Tasks', icon: 'none' })
}

function onImportant(n) {
  toggleImportant(n.id)
}

function onHide(n) {
  hidingId.value = n.id
  setTimeout(() => {
    toggleHidden(n.id)
    hidingId.value = ''
  }, 320)
}

function openHidden() {
  uni.navigateTo({ url: '/pages/notifications/hidden' })
}

function createNotice() {
  if (!draft.value.title.trim()) {
    uni.showToast({ title: 'Title is required', icon: 'none' })
    return
  }
  addNotification({
    type: String(draft.value.type || 'General').trim() || 'General',
    title: draft.value.title.trim(),
    subject: draft.value.subject.trim(),
    deadline: draft.value.deadline.trim(),
    description: draft.value.description.trim(),
    by: 'Admin',
    important: false,
  })
  showCreate.value = false
  draft.value = { type: 'General', title: '', subject: '', deadline: '', description: '' }
  uni.showToast({ title: 'Notification added', icon: 'none' })
}

onLoad((q) => {
  if (q?.subject) {
    const map = { math: 'Math', physics: 'Physics', chemistry: 'Chemistry', economics: 'Economics', gp: 'GP' }
    subjectFilter.value = map[String(q.subject).toLowerCase()] || 'All'
  }
  if (q?.id) {
    scrollInto.value = 'n-' + q.id
    const n = getNotificationById(q.id)
    if (n) markRead(n.id)
  }
})

watch([typeFilter, subjectFilter], () => {
  scrollInto.value = ''
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  position: relative;
}
.bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(40, 110, 255, 0.18), transparent 60%),
    linear-gradient(180deg, #f8faff, #f1f4fa);
}
.t-dark .bg {
  background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(60, 120, 255, 0.14), transparent 58%),
    linear-gradient(180deg, #111315, #0e1014);
}
.filterWrap {
  position: relative;
  z-index: 2;
  padding: 0 0 8rpx;
}
.filtersTop {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 0 24rpx 6rpx;
}
.chipScroll.grow {
  flex: 1;
  min-width: 0;
}
.hiddenPill {
  flex-shrink: 0;
  padding: 10rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.62);
  border: 1rpx solid rgba(16, 24, 40, 0.08);
}
.t-dark .hiddenPill {
  background: #1a1d21;
  border-color: rgba(255, 255, 255, 0.06);
}
.hiddenPillText {
  font-size: 19rpx;
  color: rgba(16, 24, 40, 0.55);
}
.t-dark .hiddenPillText {
  color: rgba(245, 247, 255, 0.52);
}
.chipScroll {
  width: 100%;
  white-space: nowrap;
  margin-bottom: 6rpx;
}
.chipScroll.sub {
  margin-bottom: 0;
}
.chipRow {
  display: inline-flex;
  gap: 8rpx;
  padding: 0 24rpx 4rpx;
}
.chip {
  display: inline-flex;
  align-items: center;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  color: rgba(16, 24, 40, 0.62);
  background: rgba(255, 255, 255, 0.62);
  border: 1rpx solid rgba(16, 24, 40, 0.08);
  transition: background 0.22s ease, color 0.22s ease, transform 0.18s ease;
}
.t-dark .chip {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.06);
  color: rgba(245, 247, 255, 0.7);
}
.chip.sm {
  padding: 8rpx 14rpx;
  font-size: 19rpx;
}
.chip.on {
  background: rgba(46, 99, 255, 0.16);
  color: rgba(46, 99, 255, 0.96);
  border-color: rgba(46, 99, 255, 0.22);
  transform: scale(1.02);
}
.t-dark .chip.on {
  background: rgba(120, 160, 255, 0.18);
  color: rgba(170, 200, 255, 0.96);
  border-color: rgba(120, 160, 255, 0.26);
}
.scroll {
  position: relative;
  z-index: 1;
  height: calc(100vh - 248rpx);
  padding: 0 24rpx 32rpx;
}
.pinSection,
.feedSection {
  margin-top: 8rpx;
}
.pinLabel {
  display: block;
  font-size: 20rpx;
  font-weight: 650;
  color: rgba(16, 24, 40, 0.48);
  padding: 8rpx 4rpx 10rpx;
}
.t-dark .pinLabel {
  color: rgba(245, 247, 255, 0.45);
}
.pinLabel.dim {
  margin-top: 10rpx;
}
.empty {
  padding: 60rpx 20rpx;
  text-align: center;
}
.emptyText {
  font-size: 22rpx;
  color: rgba(16, 24, 40, 0.45);
}
.t-dark .emptyText {
  color: rgba(245, 247, 255, 0.4);
}
.gap {
  height: 24rpx;
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
  background: rgba(255, 255, 255, 0.7);
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
.addFab:active { transform: scale(0.96); }
.addFabText {
  font-size: 42rpx;
  color: rgba(46, 99, 255, 0.95);
  font-weight: 500;
}

.overlay {
  position: fixed;
  inset: 0;
  z-index: 45;
  opacity: 0;
  pointer-events: none;
  background: rgba(8, 12, 24, 0.32);
  backdrop-filter: blur(12px);
  transition: opacity 0.22s ease;
}
.overlay.show { opacity: 1; pointer-events: auto; }
.sheet {
  position: absolute;
  left: 14rpx;
  right: 14rpx;
  bottom: 14rpx;
  padding: 18rpx;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.86);
  border: 1rpx solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 30rpx 90rpx rgba(8, 12, 24, 0.22);
}
.t-dark .sheet {
  background: #1a1d21;
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 36rpx 100rpx rgba(0, 0, 0, 0.55);
}
.sheetTitle {
  font-size: 24rpx;
  font-weight: 740;
  color: rgba(16, 24, 40, 0.92);
}
.t-dark .sheetTitle { color: #f5f7fa; }
.input {
  height: 74rpx;
  margin-top: 10rpx;
  padding: 0 14rpx;
  border-radius: 16rpx;
  background: rgba(16, 24, 40, 0.04);
  border: 1rpx solid rgba(16, 24, 40, 0.06);
  color: rgba(16, 24, 40, 0.92);
}
.t-dark .input {
  background: #23272d;
  border-color: rgba(255, 255, 255, 0.06);
  color: #f5f7fa;
}
.area { height: 120rpx; padding-top: 12rpx; }
.placeholder { color: rgba(16, 24, 40, 0.35); }
.t-dark .placeholder { color: rgba(245, 247, 255, 0.32); }
.create {
  margin-top: 12rpx;
  height: 74rpx;
  border-radius: 18rpx;
  background: linear-gradient(180deg, #5a8eff, #2e63ff);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 14rpx 36rpx rgba(46, 99, 255, 0.28);
}
</style>
