<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader nav-mode="back" />

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
              @tap="toggleTypeFilter(f)"
            >
              <text>{{ f }}</text>
            </view>
          </view>
        </scroll-view>
        <view class="hiddenPill" role="button" @tap="openHidden">
          <text class="hiddenPillText">Hidden</text>
        </view>
      </view>
      <scroll-view
        v-if="showSubjectFilter"
        class="chipScroll sub"
        scroll-x
        :show-scrollbar="false"
        enhanced
      >
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

    <scroll-view
      class="scroll"
      :class="{ withSubject: showSubjectFilter }"
      scroll-y
      :show-scrollbar="false"
      :scroll-into-view="scrollInto"
    >
      <view v-if="loading" class="listPad">
        <SkeletonList variant="notifications" :count="5" />
      </view>

      <template v-else>
      <view v-if="pinnedList.length" class="pinSection">
        <text class="pinLabel">Important</text>
        <SwipeRow
          v-for="n in pinnedList"
          :key="'p-' + n.id"
          side="left"
          :actions="[{ id: 'hide', icon: 'hide' }]"
          commit-action="hide"
          :context-items="noticeContextItems(n)"
          @commit="onHide(n)"
          @action="onNoticeAction(n, $event)"
        >
          <NoticeCard
            :notice="n"
            :hiding="hidingId === n.id"
            @open="onOpenCard(n)"
            @planner="onPlanner(n)"
            @important="onImportant(n)"
          />
        </SwipeRow>
      </view>

      <view v-if="restList.length" class="feedSection">
        <text v-if="pinnedList.length" class="pinLabel dim">All</text>
        <SwipeRow
          v-for="n in restList"
          :key="n.id"
          side="left"
          :actions="[{ id: 'hide', icon: 'hide' }]"
          commit-action="hide"
          :context-items="noticeContextItems(n)"
          @commit="onHide(n)"
          @action="onNoticeAction(n, $event)"
        >
          <NoticeCard
            :id="'n-' + n.id"
            :notice="n"
            :hiding="hidingId === n.id"
            @open="onOpenCard(n)"
            @planner="onPlanner(n)"
            @important="onImportant(n)"
          />
        </SwipeRow>
      </view>

      <view v-if="!pinnedList.length && !restList.length" class="emptyWrap">
        <EmptyState
          variant="notifications"
          title="No notices"
        />
      </view>
      </template>
      <view class="gap" />
    </scroll-view>

    <view v-if="isAdminActive" class="addFab" role="button" @tap="openCreate" aria-label="Add notification">
      <view class="plus">
        <view class="hLine" />
        <view class="vLine" />
      </view>
    </view>

    <view class="noticeEditorRoot">
      <view class="overlay" :class="[themeClass, { show: showCreate }]" @tap="showCreate = false">
        <view class="sheet" @tap.stop>
          <view class="grabber" />
          <view class="head">
            <text class="sheetTitle">Notice</text>
          </view>

          <scroll-view class="body" scroll-y :show-scrollbar="false">
            <view class="field">
              <input class="input" v-model="draft.title" placeholder="Title" placeholder-class="placeholder" />
            </view>

            <view class="field collapsible">
              <view class="collapseHead tap notesHead" role="button" @tap="descExpanded = !descExpanded">
                <text class="collapseLabel">{{ descExpanded ? 'Details' : 'Add details' }}</text>
                <text class="collapseChev" :class="{ open: descExpanded }">›</text>
              </view>
              <view class="collapseBody" :class="{ open: descExpanded }">
                <textarea
                  class="input area"
                  v-model="draft.description"
                  placeholder="Optional"
                  placeholder-class="placeholder"
                />
              </view>
            </view>

            <view class="field metaGrid">
              <view class="typeRow inline">
                <view
                  v-for="t in noticeTypes"
                  :key="t.id"
                  class="typeChip"
                  :class="['t-' + t.id, { on: draft.type === t.label }]"
                  role="button"
                  @tap="draft.type = t.label"
                >
                  <text class="typeText">{{ t.label }}</text>
                </view>
              </view>

              <view class="metaRow">
                <view v-if="showDraftSubject" class="metaItem">
                  <TagSelect
                    v-model="draft.subject"
                    :options="tagNames"
                    :allow-create="true"
                    :can-create="true"
                    kind="subject"
                    @create="onCreateTag"
                    placeholder="Subject"
                  />
                </view>
                <view class="metaItem" :class="{ full: !showDraftSubject }">
                  <DateField v-model="draft.deadlineDate" mode="date" placeholder="Deadline" />
                </view>
              </view>
            </view>

            <view class="sheetGap" />
          </scroll-view>

          <view class="footer">
            <view class="save tap" :class="{ busy: publishing }" role="button" @tap="publish">
              <text class="saveText">{{ publishing ? '…' : 'Publish' }}</text>
            </view>
          </view>
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
import SwipeRow from '@/components/SwipeRow.vue'
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
import { useAdminMode } from '@/composables/useAdminMode'

const { themeClass } = useTheme()
const {
  visibleNotifications,
  pinnedNotifications,
  loading,
  markRead,
  toggleImportant,
  setInPlanner,
  setHidden,
  getNotificationById,
  addNotification,
  removeNotification,
} = useNotificationStore()
const { addTaskFromNotice } = useTasksStore()
const { tagNames, addTag } = useTagStore()
const { currentUser } = useUserStore()
const { isAdminActive, isRealAdmin } = useAdminMode()

const typeFilters = ['Homework', 'General', 'VIA', 'Events', 'Important']
const subjectFilters = computed(() => ['All', ...tagNames.value.filter((n) => n !== 'General')])

const noticeTypes = [
  { id: 'homework', label: 'Homework' },
  { id: 'general', label: 'General' },
  { id: 'via', label: 'VIA' },
  { id: 'events', label: 'Event' },
]

const typeFilter = ref('')
const subjectFilter = ref('All')
const showSubjectFilter = computed(() => typeFilter.value === 'Homework')
const hidingId = ref('')
const scrollInto = ref('')
const showCreate = ref(false)
const publishing = ref(false)
const descExpanded = ref(false)

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
const showDraftSubject = computed(() => draft.value.type === 'Homework')

function subjectMatches(n, chip) {
  if (chip === 'All') return true
  const s = (n.subject || '').toLowerCase()
  if (chip === 'GP') return s.includes('general paper') || s === 'gp'
  return s.includes(chip.toLowerCase())
}

function toggleTypeFilter(f) {
  typeFilter.value = typeFilter.value === f ? '' : f
}

function typeMatches(n, chip) {
  if (!chip) return true
  if (chip === 'Important') return n.important
  if (chip === 'Events') return n.type === 'Event'
  return n.type === chip
}

const filtered = computed(() =>
  visibleNotifications.value.filter((n) => {
    if (!typeMatches(n, typeFilter.value)) return false
    if (typeFilter.value === 'Homework' && !subjectMatches(n, subjectFilter.value)) return false
    return true
  })
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
    toast.show('Already in planner')
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
  Promise.all([
    setInPlanner(n.id, true),
    setHidden(n.id, true),
  ]).then(() => {
    toast.addedToPlanner()
  })
}

function onImportant(n) {
  toggleImportant(n.id)
}

const noticeDeleteContextItem = { id: 'delete', label: 'Delete', icon: 'trash', danger: true }

function canDeleteNotice(n) {
  const userId = currentUser.value?.id
  if (!userId || !n?.id) return false
  return isAdminActive.value || n.createdBy === userId
}

function noticeContextItems(n) {
  return canDeleteNotice(n) ? [noticeDeleteContextItem] : []
}

function onNoticeAction(n, actionId) {
  if (actionId === 'delete') {
    confirmDeleteNotice(n)
    return
  }
  if (actionId === 'hide') onHide(n)
}

function confirmDeleteNotice(n) {
  if (!canDeleteNotice(n)) return
  uni.showModal({
    title: 'Delete notice?',
    content: 'This permanently removes the notice for everyone.',
    confirmText: 'Delete',
    confirmColor: '#dc5050',
    success: async (res) => {
      if (!res.confirm) return
      const { error } = await removeNotification(n.id)
      if (error) {
        toast.show('Could not delete')
        return
      }
      toast.removed()
    },
  })
}

function onHide(n) {
  hidingId.value = n.id
  setTimeout(async () => {
    await setHidden(n.id, true)
    hidingId.value = ''
    toast.noticeHidden()
  }, 280)
}

function openHidden() {
  uni.navigateTo({ url: '/pages/notifications/hidden' })
}

function openCreate() {
  if (!isRealAdmin.value) {
    toast.show('Admins only')
    return
  }
  draft.value = emptyDraft()
  descExpanded.value = false
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
  if (!isRealAdmin.value) {
    toast.show('Admins only')
    return
  }
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
      subject: draft.value.type === 'Homework' ? String(draft.value.subject || '').trim() : '',
      deadline: formatDeadline(draft.value.deadlineDate),
      deadlineAt: draft.value.deadlineDate || null,
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
    typeFilter.value = 'Homework'
    subjectFilter.value = map[String(q.subject).toLowerCase()] || 'All'
  }
  if (q?.id) {
    scrollInto.value = 'n-' + q.id
    const n = getNotificationById(q.id)
    if (n) markRead(n.id)
  }
})

watch(typeFilter, (next, prev) => {
  if (prev === 'Homework' && next !== 'Homework') subjectFilter.value = 'All'
})

watch(() => draft.value.type, (next, prev) => {
  if (prev === 'Homework' && next !== 'Homework') draft.value.subject = ''
})

watch([typeFilter, subjectFilter], () => {
  scrollInto.value = ''
})
</script>

<style scoped>
.page { min-height: 100vh; position: relative; }
.bg { position: absolute; inset: 0; background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(40, 110, 255, 0.18), transparent 60%), linear-gradient(180deg, #f8faff, #f1f4fa); }
.t-dark .bg { background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(60, 120, 255, 0.14), transparent 58%), linear-gradient(180deg, #111315, #0e1014); }

.filterWrap { position: relative; z-index: 2; padding: 14rpx 0 8rpx; }
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
.scroll { position: relative; z-index: 1; height: calc(100vh - var(--shell-header-offset, 148rpx) - 72rpx); padding: 0 24rpx 32rpx; }
.scroll.withSubject { height: calc(100vh - var(--shell-header-offset, 148rpx) - 116rpx); }
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

.overlay { position: fixed; inset: 0; z-index: 70; opacity: 0; pointer-events: none; background: rgba(8, 12, 24, 0.32); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); transition: opacity 240ms ease; }
.overlay.t-dark { background: rgba(0, 0, 0, 0.55); }
.overlay.show { opacity: 1; pointer-events: auto; }
.sheet {
  position: absolute;
  left: 8rpx;
  right: 8rpx;
  bottom: 8rpx;
  max-height: 92vh;
  border-radius: 38rpx;
  background: rgba(255, 255, 255, 0.92);
  border: 1rpx solid rgba(255, 255, 255, 0.62);
  box-shadow: 0 40rpx 120rpx rgba(10, 16, 30, 0.22);
  transform: translateY(22rpx);
  transition: transform 320ms cubic-bezier(0.2, 0.7, 0.1, 1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.t-dark .sheet { background: #1a1d21; border-color: rgba(255, 255, 255, 0.06); box-shadow: 0 44rpx 132rpx rgba(0, 0, 0, 0.55); }
.overlay.show .sheet { transform: translateY(0); }
.grabber { margin: 16rpx auto 0; width: 80rpx; height: 9rpx; border-radius: 999rpx; background: rgba(16, 24, 40, 0.18); }
.t-dark .grabber { background: rgba(245, 247, 255, 0.2); }
.head { padding: 12rpx 28rpx 10rpx; display: flex; align-items: center; justify-content: space-between; }
.sheetTitle { font-size: 30rpx; font-weight: 760; color: rgba(16, 24, 40, 0.92); }
.t-dark .sheetTitle { color: #f5f7fa; }
.body { max-height: 72vh; padding: 0 28rpx; box-sizing: border-box; }

.field { margin-top: 16rpx; display: flex; flex-direction: column; gap: 10rpx; }
.collapsible { gap: 0; }
.collapseHead {
  min-height: 64rpx;
  padding: 0 20rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.78);
  border: 1rpx solid rgba(16, 24, 40, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  transition: border-color 200ms ease, background 200ms ease;
}
.t-dark .collapseHead { background: #23272d; border-color: rgba(255, 255, 255, 0.06); }
.collapseLabel { font-size: 26rpx; color: rgba(16, 24, 40, 0.62); font-weight: 660; }
.t-dark .collapseLabel { color: rgba(245, 247, 255, 0.62); }
.collapseChev {
  font-size: 32rpx;
  line-height: 1;
  color: rgba(16, 24, 40, 0.38);
  transform: rotate(90deg);
  transition: transform var(--motion-expand) ease, color var(--motion-expand) ease;
}
.t-dark .collapseChev { color: rgba(245, 247, 255, 0.38); }
.collapseChev.open { transform: rotate(-90deg); color: rgba(46, 99, 255, 0.82); }
.collapseBody {
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  transition: max-height var(--motion-expand) ease, opacity var(--motion-expand) ease, margin-top var(--motion-expand) ease;
  margin-top: 0;
}
.collapseBody.open {
  max-height: 320rpx;
  opacity: 1;
  margin-top: 12rpx;
}
.collapseBody .area { min-height: 180rpx; }
.input {
  min-height: 96rpx;
  padding: 0 20rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.78);
  border: 1rpx solid rgba(16, 24, 40, 0.08);
  color: rgba(16, 24, 40, 0.92);
  font-size: 28rpx;
  transition: border-color 200ms ease, box-shadow 200ms ease, background 200ms ease;
}
.t-dark .input { background: #23272d; border-color: rgba(255, 255, 255, 0.06); color: #f5f7fa; }
.input:focus { border-color: rgba(46, 99, 255, 0.4); box-shadow: 0 0 0 6rpx rgba(46, 99, 255, 0.12); }
.area { min-height: 168rpx; padding-top: 22rpx; }
.placeholder { color: rgba(16, 24, 40, 0.34); }
.t-dark .placeholder { color: rgba(245, 247, 255, 0.32); }

.noticeEditorRoot :deep(.control) {
  min-height: 96rpx;
  padding: 16rpx 20rpx;
  border-radius: 24rpx;
}
.noticeEditorRoot :deep(.value) { font-size: 28rpx; }
.noticeEditorRoot :deep(.label) { font-size: 20rpx; }
.noticeEditorRoot :deep(.chipText) { font-size: 20rpx; }
.noticeEditorRoot :deep(.iconWrap) { width: 46rpx; height: 46rpx; border-radius: 14rpx; }

.metaGrid { gap: 10rpx; }
.metaRow { display: flex; gap: 10rpx; width: 100%; align-items: stretch; }
.metaItem { flex: 1; min-width: 0; }
.metaItem.full { flex: 1; width: 100%; }

.typeRow { display: flex; gap: 8rpx; flex-wrap: wrap; }
.typeRow.inline {
  min-height: 96rpx;
  padding: 8rpx;
  border-radius: 24rpx;
  border: 1rpx solid rgba(16, 24, 40, 0.08);
  background: rgba(255, 255, 255, 0.78);
  gap: 6rpx;
  box-sizing: border-box;
  flex-wrap: nowrap;
}
.t-dark .typeRow.inline {
  border-color: rgba(255, 255, 255, 0.06);
  background: #23272d;
}
.typeChip {
  flex: 1;
  min-width: 0;
  min-height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8rpx;
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.62);
  border: 1rpx solid rgba(16, 24, 40, 0.06);
  transition: background 220ms ease, border-color 220ms ease, transform 180ms ease;
}
.t-dark .typeChip { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.06); }
.typeChip:active { transform: scale(0.97); }
.typeChip.on { background: rgba(46, 99, 255, 0.12); border-color: rgba(46, 99, 255, 0.24); }
.typeText { font-size: 22rpx; font-weight: 700; color: rgba(16, 24, 40, 0.78); text-align: center; }
.t-dark .typeText { color: rgba(245, 247, 255, 0.78); }
.typeChip.on .typeText { color: rgba(46, 99, 255, 0.96); font-weight: 720; }
.t-dark .typeChip.on .typeText { color: rgba(170, 200, 255, 0.96); }

.sheetGap { height: 32rpx; }
.footer { padding: 20rpx 28rpx 28rpx; flex-shrink: 0; }
.save {
  height: 104rpx;
  border-radius: 26rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #5a8eff, #2e63ff);
  box-shadow: 0 20rpx 60rpx rgba(46, 99, 255, 0.3);
  transition: transform 180ms ease, box-shadow 180ms ease;
}
.save:active { transform: scale(0.985); }
.save.busy { opacity: 0.7; pointer-events: none; }
.saveText { font-size: 28rpx; font-weight: 760; color: rgba(255, 255, 255, 0.98); letter-spacing: 0.3rpx; }
</style>
