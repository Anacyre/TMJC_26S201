<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader />

    <TabPageContent tab-id="study">
      <template #chrome>
      <view class="focusEntry" role="button" @tap="openFocus">
        <view class="focusGlyph">
          <view class="ringO" />
          <view class="ringI" />
          <view class="needle" />
        </view>
        <view class="focusBody">
          <text class="focusTitle">Focus</text>
        </view>
        <view class="focusStat">
          <text class="focusStatNum">{{ focusHoursLabel }}</text>
          <text class="focusStatLabel">focused</text>
        </view>
      </view>
      </template>

    <scroll-view class="scroll" scroll-y :show-scrollbar="false">
      <view class="sectionHead">
        <text class="sectionTitle">Subjects</text>
      </view>
      <view v-if="loading" class="emptyWrap">
        <SkeletonList variant="resources" :count="4" />
      </view>
      <view v-else-if="!subjectsView.length" class="emptyWrap">
        <EmptyState
          variant="resources"
          title="No subjects"
        />
      </view>
      <view v-else class="grid">
        <view v-for="s in subjectsView" :key="s.id" class="card" role="button" @tap="openSubject(s.id)">
          <view class="icon">{{ s.icon }}</view>
          <text class="name">{{ s.name }}</text>
          <text class="meta">{{ s.filesCount }} files · {{ s.updatedLabel }}</text>
        </view>
      </view>

      <view class="sectionHead">
        <text class="sectionTitle">Recent</text>
      </view>
      <view v-if="loading" class="emptyWrap">
        <SkeletonList variant="resources" :count="3" />
      </view>
      <view v-else-if="!latestResourcesView.length" class="emptyWrap">
        <EmptyState
          variant="resources"
          title="No resources"
        />
      </view>
      <view v-else>
        <view v-for="r in latestResourcesView.slice(0,3)" :key="r.id" class="row" role="button" @tap="openResource(r.id)">
          <text class="rTitle">{{ r.title }}</text>
          <text class="rMeta">{{ r.type }} · {{ r.uploaderName }}</text>
        </view>
      </view>
      <view class="gap" />
    </scroll-view>
    </TabPageContent>

    <view v-if="isAdmin" class="addFab" role="button" @tap="showAddSubject = true" aria-label="Add subject">
      <view class="plus">
        <view class="hLine" />
        <view class="vLine" />
      </view>
    </view>

    <view class="overlay" :class="{ show: showAddSubject }" @tap="showAddSubject = false">
      <view class="sheet" @tap.stop>
        <text class="sheetTitle">New subject</text>
        <view class="field"><input class="input" v-model="subjectDraft.name" placeholder="Name" placeholder-class="ph" /></view>
        <view class="field"><input class="input" v-model="subjectDraft.icon" placeholder="Icon" placeholder-class="ph" maxlength="2" /></view>
        <view class="create tap" role="button" @tap="createSubject">{{ savingSubject ? '…' : 'Create' }}</view>
      </view>
    </view>

    <BottomNav active="study" />
    <GlobalSearchOverlay />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import BottomNav from '@/components/BottomNav.vue'
import TabPageContent from '@/components/TabPageContent.vue'
import AppHeader from '@/components/AppHeader.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import EmptyState from '@/components/EmptyState.vue'
import SkeletonList from '@/components/SkeletonList.vue'
import { useTheme } from '@/composables/useTheme'
import { useStudyStore } from '@/composables/useStudyStore'
import { useFocusStore } from '@/composables/useFocusStore'
import { useAdminMode } from '@/composables/useAdminMode'
import { toast } from '@/composables/useToast'
import { navChild, navSibling } from '@/lib/navigation'

const { themeClass } = useTheme()
const { subjects, latestResources, loading, addSubject } = useStudyStore()
const { totalHoursLabel } = useFocusStore()
const { isAdminActive: isAdmin } = useAdminMode()
const showAddSubject = ref(false)
const savingSubject = ref(false)
const subjectDraft = ref({ name: '', icon: '📘' })
const focusHoursLabel = computed(() => totalHoursLabel.value || '0m')

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

const subjectsView = computed(() =>
  subjects.value.map((s) => ({
    ...s,
    updatedLabel: shortTimeLabel(s.updatedAt),
  }))
)

const latestResourcesView = computed(() => latestResources.value)

function openSubject(id) { navChild(`/pages/study/feed?id=${id}`) }
function openResource(id) { navSibling(`/pages/study/detail?id=${id}`) }
function openFocus() { navSibling('/pages/study/focus') }

async function createSubject() {
  if (!subjectDraft.value.name.trim()) {
    toast.show('Name required')
    return
  }
  if (savingSubject.value) return
  savingSubject.value = true
  try {
    const { error } = await addSubject({
      name: subjectDraft.value.name.trim(),
      icon: subjectDraft.value.icon.trim() || '📘',
    })
    if (error) {
      toast.show(error.message || 'Could not create subject')
      return
    }
    showAddSubject.value = false
    subjectDraft.value = { name: '', icon: '📘' }
    toast.subjectCreated()
  } finally {
    savingSubject.value = false
  }
}
</script>

<style scoped>
.page { min-height: 100vh; position: relative; overflow: hidden; display: flex; flex-direction: column; }
.bg { position: absolute; inset: 0; background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(40, 110, 255, 0.16), transparent 60%), linear-gradient(180deg, #f8faff, #f1f4fa); }
.t-dark .bg { background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(60, 120, 255, 0.14), transparent 58%), linear-gradient(180deg, #111315, #0e1014); }

.scroll { position: relative; z-index: 1; height: calc(100vh - var(--shell-header-offset, 148rpx) - 280rpx); min-height: 300rpx; padding: 6rpx 28rpx 200rpx; }

.focusEntry { display: flex; align-items: center; gap: 14rpx; margin: 6rpx 28rpx 0; padding: 20rpx 18rpx; border-radius: 28rpx; background: linear-gradient(135deg, rgba(80, 140, 255, 0.10), rgba(46, 99, 255, 0.04)); border: 1rpx solid rgba(46, 99, 255, 0.16); transition: transform 180ms ease, background 220ms ease; }
.t-dark .focusEntry { background: linear-gradient(135deg, rgba(80, 140, 255, 0.18), rgba(46, 99, 255, 0.08)); border-color: rgba(120, 160, 255, 0.24); }
.focusEntry:active { transform: scale(0.99); }

.focusGlyph { position: relative; width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }
.ringO { position: absolute; inset: 0; border-radius: 50%; border: 1.6rpx solid rgba(46, 99, 255, 0.72); }
.ringI { position: absolute; inset: 16rpx; border-radius: 50%; border: 1.4rpx solid rgba(46, 99, 255, 0.5); }
.needle { position: absolute; top: 50%; left: 50%; width: 20rpx; height: 2rpx; background: rgba(46, 99, 255, 0.95); border-radius: 999rpx; transform-origin: left center; transform: translate(0, -50%) rotate(-32deg); }
.t-dark .ringO { border-color: rgba(170, 200, 255, 0.78); }
.t-dark .ringI { border-color: rgba(170, 200, 255, 0.5); }
.t-dark .needle { background: rgba(170, 200, 255, 0.95); }

.focusBody { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4rpx; }
.focusTitle { font-size: 24rpx; font-weight: 740; color: rgba(16, 24, 40, 0.92); }
.t-dark .focusTitle { color: #f5f7fa; }
.focusStat { display: flex; flex-direction: column; align-items: flex-end; gap: 2rpx; }
.focusStatNum { font-size: 22rpx; font-weight: 740; color: rgba(46, 99, 255, 0.96); letter-spacing: -0.2rpx; }
.t-dark .focusStatNum { color: rgba(170, 200, 255, 0.96); }
.focusStatLabel { font-size: 17rpx; color: rgba(16, 24, 40, 0.48); }
.t-dark .focusStatLabel { color: rgba(245, 247, 255, 0.45); }

.sectionHead { margin-top: 22rpx; padding: 6rpx 4rpx 12rpx; }
.sectionTitle { font-size: 22rpx; color: rgba(16, 24, 40, 0.6); font-weight: 660; }
.t-dark .sectionTitle { color: rgba(245, 247, 255, 0.55); }

.emptyWrap { padding: 16rpx 0; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--list-stack-gap); }
.card { padding: var(--list-card-pad-y) var(--list-card-pad-x); border-radius: var(--list-card-radius); background: rgba(255, 255, 255, 0.7); border: 1rpx solid rgba(16, 24, 40, 0.04); transition: transform 180ms ease, background 220ms ease, border-color 220ms ease; }
.t-dark .card { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.06); }
.card:active { transform: scale(0.985); }
.icon { width: var(--list-icon-size); height: var(--list-icon-size); border-radius: var(--list-icon-radius); background: rgba(46, 99, 255, 0.1); display: flex; align-items: center; justify-content: center; color: rgba(46, 99, 255, 0.95); font-size: var(--list-icon-font); font-weight: 700; }
.t-dark .icon { background: rgba(120, 160, 255, 0.14); color: rgba(170, 200, 255, 0.96); }
.name { display: block; margin-top: 10rpx; font-size: var(--list-title-size); font-weight: 720; color: rgba(16, 24, 40, 0.9); }
.t-dark .name { color: rgba(245, 247, 255, 0.9); }
.meta { display: block; margin-top: 6rpx; font-size: var(--list-meta-size); color: rgba(16, 24, 40, 0.5); }
.t-dark .meta { color: rgba(245, 247, 255, 0.45); }

.row { margin-top: var(--list-stack-gap); padding: var(--list-card-pad-y) var(--list-card-pad-x); border-radius: var(--list-card-radius); background: rgba(255, 255, 255, 0.7); border: 1rpx solid rgba(16, 24, 40, 0.04); transition: background 220ms ease, border-color 220ms ease, transform 180ms ease; }
.t-dark .row { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.06); }
.row:active { transform: scale(0.985); }
.rTitle { font-size: var(--list-title-size); font-weight: 700; color: rgba(16, 24, 40, 0.9); }
.t-dark .rTitle { color: rgba(245, 247, 255, 0.9); }
.rMeta { display: block; margin-top: 6rpx; font-size: var(--list-meta-size); color: rgba(16, 24, 40, 0.5); }
.t-dark .rMeta { color: rgba(245, 247, 255, 0.45); }
.gap { height: 24rpx; }

.addFab { position: fixed; right: 28rpx; bottom: calc(160rpx + env(safe-area-inset-bottom)); width: 96rpx; height: 96rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.78); border: 1rpx solid rgba(255, 255, 255, 0.6); box-shadow: 0 22rpx 60rpx rgba(46, 99, 255, 0.18); backdrop-filter: blur(16px); z-index: 35; transition: transform 200ms ease, box-shadow 200ms ease; }
.t-dark .addFab { background: rgba(26, 29, 33, 0.85); border-color: rgba(255, 255, 255, 0.08); box-shadow: 0 22rpx 70rpx rgba(0, 0, 0, 0.5); }
.addFab:active { transform: scale(0.94); }
.plus { position: relative; width: 26rpx; height: 26rpx; }
.hLine, .vLine { position: absolute; background: rgba(46, 99, 255, 0.95); border-radius: 999rpx; }
.hLine { left: 0; right: 0; top: 50%; height: 2.4rpx; margin-top: -1.2rpx; }
.vLine { top: 0; bottom: 0; left: 50%; width: 2.4rpx; margin-left: -1.2rpx; }

.overlay { position: fixed; inset: 0; z-index: 50; opacity: 0; pointer-events: none; background: rgba(8, 12, 24, 0.4); backdrop-filter: blur(12px); transition: opacity 0.22s ease; }
.overlay.show { opacity: 1; pointer-events: auto; }
.sheet { position: absolute; left: 14rpx; right: 14rpx; bottom: 14rpx; padding: 24rpx 22rpx; border-radius: 32rpx; background: rgba(255, 255, 255, 0.92); border: 1rpx solid rgba(255, 255, 255, 0.6); }
.t-dark .sheet { background: #1a1d21; border-color: rgba(255, 255, 255, 0.06); }
.sheetTitle { font-size: 26rpx; font-weight: 740; color: rgba(16, 24, 40, 0.92); }
.t-dark .sheetTitle { color: #f5f7fa; }
.field { margin-top: 12rpx; }
.input { width: 100%; height: 80rpx; padding: 0 16rpx; border-radius: 18rpx; background: rgba(16, 24, 40, 0.04); border: 1rpx solid rgba(16, 24, 40, 0.08); color: rgba(16, 24, 40, 0.92); font-size: 23rpx; }
.t-dark .input { background: #23272d; border-color: rgba(255, 255, 255, 0.08); color: #f5f7fa; }
.ph { color: rgba(16, 24, 40, 0.35); }
.t-dark .ph { color: rgba(245, 247, 255, 0.35); }
.create { margin-top: 18rpx; height: 84rpx; border-radius: 22rpx; background: linear-gradient(180deg, #5a8eff, #2e63ff); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 23rpx; font-weight: 720; box-shadow: 0 14rpx 36rpx rgba(46, 99, 255, 0.28); }
</style>
