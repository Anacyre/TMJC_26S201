<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader />
    <scroll-view class="scroll" scroll-y :show-scrollbar="false">
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
      <view v-if="!latestResourcesView.length" class="emptyWrap">
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
    <BottomNav active="study" />
    <GlobalSearchOverlay />
  </view>
</template>

<script setup>
import { computed } from 'vue'
import BottomNav from '@/components/BottomNav.vue'
import AppHeader from '@/components/AppHeader.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import EmptyState from '@/components/EmptyState.vue'
import SkeletonList from '@/components/SkeletonList.vue'
import { useTheme } from '@/composables/useTheme'
import { useStudyStore } from '@/composables/useStudyStore'
import { useFocusStore } from '@/composables/useFocusStore'

const { themeClass } = useTheme()
const { subjects, latestResources, loading } = useStudyStore()
const { totalHoursLabel } = useFocusStore()
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

function openSubject(id) { uni.navigateTo({ url: `/pages/study/feed?id=${id}`, animationType: 'pop-in', animationDuration: 240 }) }
function openResource(id) { uni.navigateTo({ url: `/pages/study/detail?id=${id}`, animationType: 'slide-in-right', animationDuration: 220 }) }
function openFocus() { uni.navigateTo({ url: '/pages/study/focus', animationType: 'slide-in-right', animationDuration: 220 }) }
</script>

<style scoped>
.page { min-height: 100vh; position: relative; overflow: hidden; }
.bg { position: absolute; inset: 0; background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(40, 110, 255, 0.16), transparent 60%), linear-gradient(180deg, #f8faff, #f1f4fa); }
.t-dark .bg { background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(60, 120, 255, 0.14), transparent 58%), linear-gradient(180deg, #111315, #0e1014); }

.scroll { position: relative; z-index: 1; height: calc(100vh - var(--shell-header-offset, 148rpx)); padding: 6rpx 28rpx 200rpx; }

.focusEntry { display: flex; align-items: center; gap: 14rpx; padding: 20rpx 18rpx; border-radius: 28rpx; background: linear-gradient(135deg, rgba(80, 140, 255, 0.10), rgba(46, 99, 255, 0.04)); border: 1rpx solid rgba(46, 99, 255, 0.16); transition: transform 180ms ease, background 220ms ease; }
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
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10rpx; }
.card { padding: 16rpx; border-radius: 22rpx; background: rgba(255, 255, 255, 0.7); border: 1rpx solid rgba(16, 24, 40, 0.04); transition: transform 180ms ease, background 220ms ease, border-color 220ms ease; }
.t-dark .card { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.06); }
.card:active { transform: scale(0.985); }
.icon { width: 44rpx; height: 44rpx; border-radius: 14rpx; background: rgba(46, 99, 255, 0.1); display: flex; align-items: center; justify-content: center; color: rgba(46, 99, 255, 0.95); font-size: 20rpx; font-weight: 700; }
.t-dark .icon { background: rgba(120, 160, 255, 0.14); color: rgba(170, 200, 255, 0.96); }
.name { display: block; margin-top: 10rpx; font-size: 22rpx; font-weight: 720; color: rgba(16, 24, 40, 0.9); }
.t-dark .name { color: rgba(245, 247, 255, 0.9); }
.meta { display: block; margin-top: 4rpx; font-size: 18rpx; color: rgba(16, 24, 40, 0.5); }
.t-dark .meta { color: rgba(245, 247, 255, 0.45); }

.row { margin-top: 10rpx; padding: 14rpx 16rpx; border-radius: 22rpx; background: rgba(255, 255, 255, 0.7); border: 1rpx solid rgba(16, 24, 40, 0.04); transition: background 220ms ease, border-color 220ms ease, transform 180ms ease; }
.t-dark .row { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.06); }
.row:active { transform: scale(0.99); }
.rTitle { font-size: 22rpx; font-weight: 700; color: rgba(16, 24, 40, 0.9); }
.t-dark .rTitle { color: rgba(245, 247, 255, 0.9); }
.rMeta { display: block; margin-top: 4rpx; font-size: 18rpx; color: rgba(16, 24, 40, 0.5); }
.t-dark .rMeta { color: rgba(245, 247, 255, 0.45); }
.gap { height: 24rpx; }
</style>
