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
      <view v-if="loading" class="listPad">
        <SkeletonList variant="notifications" :count="5" />
      </view>

      <template v-else>
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

      <view v-if="!pinnedList.length && !restList.length" class="emptyWrap">
        <EmptyState
          variant="notifications"
          title="No notices yet"
        />
      </view>
      </template>
      <view class="gap" />
    </scroll-view>

    <view v-if="isAdmin" class="addFab" role="button" @tap="openCreate" aria-label="Add notification">
      <view class="plus">
        <view class="hLine" />
        <view class="vLine" />
      </view>
    </view>

    <view class="overlay" :class="{ show: showCreate }" @tap="showCreate = false">
      <view class="sheet" @tap.stop>
        <view class="grabber" />
        <text class="sheetTitle">New notification</text>

        <view class="field">
          <text class="fieldLabel">Type</text>
          <view class="typeRow">
            <view
              v-for="t in noticeTypes"
              :key="t.id"
              class="typeChip"
              :class="['t-' + t.id, { on: draft.type === t.label }]"
              role="button"
              @tap="draft.type = t.label"
            >
              <view class="typeDot" />
              <text class="typeText">{{ t.label }}</text>
            </view>
          </view>
        </view>

        <view class="field">
          <text class="fieldLabel">Title</text>
          <input class="input" v-model="draft.title" placeholder="Title" placeholder-class="placeholder" />
        </view>

        <view class="field">
          <text class="fieldLabel">Subject</text>
          <TagSelect
            v-model="draft.subject"
            :options="tagNames"
            :allow-create="true"
            :can-create="true"
            kind="subject"
            @create="onCreateTag"
            placeholder="Choose subject"
          />
        </view>

        <view class="field">
          <text class="fieldLabel">Deadline</text>
          <DateField v-model="draft.deadlineDate" mode="date" placeholder="Pick a date" />
        </view>

        <view class="field">
          <text class="fieldLabel">Description</text>
          <textarea class="input area" v-model="draft.description" placeholder="Details for the class..." placeholder-class="placeholder" />
        </view>

        <view class="commit" :class="{ busy: publishing }" role="button" @tap="publish">
          <text class="commitText">{{ publishing ? 'Publishing…' : 'Publish' }}</text>
        </view>
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
import EmptyState from '@/components/EmptyState.vue'
import SkeletonList from '@/components/SkeletonList.vue'
import { toast } from '@/composables/useToast'
import TagSelect from '@/components/TagSelect.vue'
import DateField from '@/components/DateField.vue'
import { useTheme } from '@/composables/useTheme'
import { useNotificationStore } from '@/composables/useNotificationStore'
import { useTasksStore } from '@/composables/useTasksStore'
import { useTagStore } from '@/composables/useTagStore'
import { useUserStore } from '@/composables/useUserStore'

const { themeClass } = useTheme()
const {
  visibleNotifications,
  pinnedNotifications,
  loading,
  markRead,
  toggleImportant,
  setInPlanner,
  toggleHidden,
  getNotificationById,
  addNotification,
} = useNotificationStore()
const { addTaskFromNotice } = useTasksStore()
const { tagNames, addTag } = useTagStore()
const { currentUser } = useUserStore()
const isAdmin = computed(() => currentUser.value.role === 'admin')

const typeFilters = ['All', 'Homework', 'General', 'VIA', 'Events', 'Important']
const subjectFilters = computed(() => ['All', ...tagNames.value.filter((n) => n !== 'General')])

const noticeTypes = [
  { id: 'homework', label: 'Homework' },
  { id: 'general', label: 'General' },
  { id: 'via', label: 'VIA' },
  { id: 'events', label: 'Event' },
]

const typeFilter = ref('All')
const subjectFilter = ref('All')
const hidingId = ref('')
const scrollInto = ref('')
const showCreate = ref(false)
const publishing = ref(false)

function emptyDraft() {
  return {
    type: 'Homework',
    title: '',
    subject: '',
    deadlineDate: '',
    description: '',
  }
}

const draft = ref(emptyDraft())

function subjectMatches(n, chip) {
  if (chip === 'All') return true
  const s = (n.subject || '').toLowerCase()
  if (chip === 'GP') return s.includes('general paper') || s === 'gp'
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
    toast.show('Already added')
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
  toast.added()
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

function openCreate() {
  draft.value = emptyDraft()
  showCreate.value = true
}

function onCreateTag(name) {
  addTag(name)
}

function formatDeadline(value) {
  if (!value) return ''
  const [y, m, d] = value.split('-')
  if (!y) return value
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  if (Number.isNaN(date.getTime())) return value
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return `${weekdays[date.getDay()]} ${months[date.getMonth()]} ${date.getDate()}`
}

async function publish() {
  if (publishing.value) return
  if (!draft.value.title.trim()) {
    toast.show('Title required')
    return
  }
  if (!draft.value.type) {
    toast.show('Pick a type')
    return
  }
  publishing.value = true
  try {
    await addNotification({
      type: String(draft.value.type).trim(),
      title: String(draft.value.title).trim(),
      subject: String(draft.value.subject || '').trim(),
      deadline: formatDeadline(draft.value.deadlineDate),
      description: String(draft.value.description || '').trim(),
      by: currentUser.value?.name || 'Admin',
      important: false,
    })
    showCreate.value = false
    draft.value = emptyDraft()
    toast.published()
  } catch (err) {
    toast.show('Could not publish')
  } finally {
    publishing.value = false
  }
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
.page { min-height: 100vh; position: relative; }
.bg { position: absolute; inset: 0; background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(40, 110, 255, 0.18), transparent 60%), linear-gradient(180deg, #f8faff, #f1f4fa); }
.t-dark .bg { background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(60, 120, 255, 0.14), transparent 58%), linear-gradient(180deg, #111315, #0e1014); }

.filterWrap { position: relative; z-index: 2; padding: 0 0 8rpx; }
.filtersTop { display: flex; align-items: center; gap: 10rpx; padding: 0 24rpx 6rpx; }
.chipScroll.grow { flex: 1; min-width: 0; }
.hiddenPill { flex-shrink: 0; padding: 10rpx 14rpx; border-radius: 999rpx; background: rgba(255, 255, 255, 0.62); border: 1rpx solid rgba(16, 24, 40, 0.08); }
.t-dark .hiddenPill { background: #1a1d21; border-color: rgba(255, 255, 255, 0.06); }
.hiddenPillText { font-size: 19rpx; color: rgba(16, 24, 40, 0.55); }
.t-dark .hiddenPillText { color: rgba(245, 247, 255, 0.52); }
.chipScroll { width: 100%; white-space: nowrap; margin-bottom: 6rpx; }
.chipScroll.sub { margin-bottom: 0; }
.chipRow { display: inline-flex; gap: 8rpx; padding: 0 24rpx 4rpx; }
.chip { display: inline-flex; align-items: center; padding: 10rpx 18rpx; border-radius: 999rpx; font-size: 20rpx; color: rgba(16, 24, 40, 0.62); background: rgba(255, 255, 255, 0.62); border: 1rpx solid rgba(16, 24, 40, 0.08); transition: background 0.22s ease, color 0.22s ease, transform 0.18s ease; }
.t-dark .chip { background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.06); color: rgba(245, 247, 255, 0.7); }
.chip.sm { padding: 8rpx 14rpx; font-size: 19rpx; }
.chip.on { background: rgba(46, 99, 255, 0.16); color: rgba(46, 99, 255, 0.96); border-color: rgba(46, 99, 255, 0.22); transform: scale(1.02); }
.t-dark .chip.on { background: rgba(120, 160, 255, 0.18); color: rgba(170, 200, 255, 0.96); border-color: rgba(120, 160, 255, 0.26); }
.scroll { position: relative; z-index: 1; height: calc(100vh - 248rpx); padding: 0 24rpx 32rpx; }
.pinSection, .feedSection { margin-top: 8rpx; }
.pinLabel { display: block; font-size: 20rpx; font-weight: 650; color: rgba(16, 24, 40, 0.48); padding: 8rpx 4rpx 10rpx; }
.t-dark .pinLabel { color: rgba(245, 247, 255, 0.45); }
.pinLabel.dim { margin-top: 10rpx; }
.emptyWrap { padding: 32rpx 0 40rpx; }
.gap { height: 24rpx; }

.addFab { position: fixed; right: 28rpx; bottom: calc(160rpx + env(safe-area-inset-bottom)); width: 96rpx; height: 96rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.78); border: 1rpx solid rgba(255, 255, 255, 0.6); backdrop-filter: blur(16px); box-shadow: 0 26rpx 70rpx rgba(12, 20, 40, 0.22); z-index: 35; transition: transform 200ms ease, box-shadow 200ms ease; }
.t-dark .addFab { background: rgba(26, 29, 33, 0.86); border-color: rgba(255, 255, 255, 0.08); box-shadow: 0 24rpx 70rpx rgba(0, 0, 0, 0.5); }
.addFab:active { transform: scale(0.94); }
.plus { position: relative; width: 26rpx; height: 26rpx; }
.hLine, .vLine { position: absolute; background: rgba(46, 99, 255, 0.95); border-radius: 999rpx; }
.hLine { left: 0; right: 0; top: 50%; height: 2.4rpx; margin-top: -1.2rpx; }
.vLine { top: 0; bottom: 0; left: 50%; width: 2.4rpx; margin-left: -1.2rpx; }

.overlay { position: fixed; inset: 0; z-index: 50; opacity: 0; pointer-events: none; background: rgba(8, 12, 24, 0.4); backdrop-filter: blur(12px); transition: opacity 0.22s ease; }
.overlay.show { opacity: 1; pointer-events: auto; }
.sheet { position: absolute; left: 12rpx; right: 12rpx; bottom: 12rpx; max-height: 92vh; padding: 0 22rpx 22rpx; border-radius: 34rpx; background: rgba(255, 255, 255, 0.94); border: 1rpx solid rgba(255, 255, 255, 0.6); overflow: hidden; }
.t-dark .sheet { background: #1a1d21; border-color: rgba(255, 255, 255, 0.06); }
.grabber { margin: 12rpx auto; width: 72rpx; height: 8rpx; border-radius: 999rpx; background: rgba(16,24,40,.18); }
.t-dark .grabber { background: rgba(245,247,255,.2); }
.sheetTitle { font-size: 28rpx; font-weight: 760; color: rgba(16, 24, 40, 0.92); }
.t-dark .sheetTitle { color: #f5f7fa; }
.sheetSub { display: block; margin-top: 4rpx; font-size: 20rpx; color: rgba(16, 24, 40, 0.5); }
.t-dark .sheetSub { color: rgba(245, 247, 255, 0.5); }

.field { margin-top: 16rpx; display: flex; flex-direction: column; gap: 8rpx; }
.fieldLabel { font-size: 20rpx; color: rgba(16, 24, 40, 0.56); font-weight: 660; }
.t-dark .fieldLabel { color: rgba(245, 247, 255, 0.6); }
.input { min-height: 84rpx; padding: 0 16rpx; border-radius: 22rpx; background: rgba(255, 255, 255, 0.78); border: 1rpx solid rgba(16, 24, 40, 0.08); color: rgba(16, 24, 40, 0.92); font-size: 24rpx; }
.t-dark .input { background: #23272d; border-color: rgba(255, 255, 255, 0.08); color: #f5f7fa; }
.area { min-height: 140rpx; padding-top: 16rpx; }
.placeholder { color: rgba(16, 24, 40, 0.35); }
.t-dark .placeholder { color: rgba(245, 247, 255, 0.35); }

.typeRow { display: flex; gap: 8rpx; flex-wrap: wrap; }
.typeChip { display: flex; align-items: center; gap: 10rpx; padding: 12rpx 18rpx; border-radius: 999rpx; background: rgba(255, 255, 255, 0.62); border: 1rpx solid rgba(16, 24, 40, 0.06); transition: background 220ms ease, border-color 220ms ease, transform 180ms ease; }
.t-dark .typeChip { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.06); }
.typeChip:active { transform: scale(0.97); }
.typeChip.on { background: rgba(46, 99, 255, 0.12); border-color: rgba(46, 99, 255, 0.24); }
.typeDot { width: 10rpx; height: 10rpx; border-radius: 50%; background: rgba(16, 24, 40, 0.4); }
.t-dark .typeDot { background: rgba(245, 247, 255, 0.4); }
.typeChip.t-homework .typeDot { background: rgba(46, 99, 255, 0.95); }
.typeChip.t-general .typeDot { background: rgba(16, 24, 40, 0.62); }
.t-dark .typeChip.t-general .typeDot { background: rgba(245, 247, 255, 0.7); }
.typeChip.t-via .typeDot { background: rgba(36, 160, 110, 0.95); }
.typeChip.t-events .typeDot { background: rgba(220, 140, 30, 0.95); }
.typeText { font-size: 21rpx; font-weight: 700; color: rgba(16, 24, 40, 0.78); }
.t-dark .typeText { color: rgba(245, 247, 255, 0.78); }
.typeChip.on .typeText { color: rgba(46, 99, 255, 0.96); font-weight: 720; }
.t-dark .typeChip.on .typeText { color: rgba(170, 200, 255, 0.96); }

.commit { margin-top: 22rpx; height: 92rpx; border-radius: 22rpx; display: flex; align-items: center; justify-content: center; background: linear-gradient(180deg, #5a8eff, #2e63ff); color: #fff; box-shadow: 0 18rpx 50rpx rgba(46, 99, 255, 0.28); transition: transform 180ms ease, box-shadow 180ms ease; }
.commit:active { transform: scale(0.985); }
.commit.busy { opacity: 0.7; pointer-events: none; }
.commitText { font-size: 23rpx; font-weight: 760; color: #fff; }
</style>
