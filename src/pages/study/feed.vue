<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader nav-mode="back" />
    <view v-if="subjectNoticeSlug" class="noticeStrip tap" role="button" @tap="openSubjectNotices">
      <view class="noticeStripGlyph">
        <view class="ring" />
        <view class="bell" />
      </view>
      <view class="noticeStripMain">
        <text class="noticeStripLabel">Notices</text>
        <text class="noticeStripSub">{{ subject?.name || 'Subject' }}</text>
      </view>
      <text class="noticeStripChev">&gt;</text>
    </view>
    <scroll-view class="scroll" scroll-y :show-scrollbar="false">
      <view v-if="!resourcesView.length" class="emptyWrap">
        <EmptyState
          variant="resources"
          title="No resources"
        />
      </view>
      <view v-else>
        <view v-for="r in resourcesView" :key="r.id" class="card tap" role="button" @tap="openDetail(r.id)">
          <view class="head">
            <text class="type">{{ r.type }}</text>
          </view>
          <text class="title">{{ r.title }}</text>
          <text class="meta">{{ r.uploaderName }} · {{ r.timeLabel }}</text>
        </view>
      </view>
      <view class="gap" />
    </scroll-view>
    <GlobalSearchOverlay />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppHeader from '@/components/AppHeader.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useTheme } from '@/composables/useTheme'
import { useStudyStore } from '@/composables/useStudyStore'
const { themeClass } = useTheme()
const { getSubjectById, getResourcesBySubject } = useStudyStore()
const id = ref('s1')
const subject = computed(() => getSubjectById(id.value))
const resources = computed(() => getResourcesBySubject(id.value))
const resourcesView = computed(() =>
  resources.value.map((r) => ({
    ...r,
    timeLabel: shortTimeLabel(r.createdAt),
  }))
)

const subjectNoticeSlug = computed(() => {
  const n = String(subject.value?.name || '').toLowerCase()
  if (n.includes('math')) return 'math'
  if (n.includes('physics')) return 'physics'
  if (n.includes('chem')) return 'chemistry'
  if (n.includes('econ')) return 'economics'
  if (n === 'gp' || n.includes('general paper')) return 'gp'
  return ''
})

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

function openSubjectNotices() {
  if (!subjectNoticeSlug.value) return
  uni.navigateTo({
    url: `/pages/notifications/index?subject=${subjectNoticeSlug.value}`,
    animationType: 'slide-in-right',
    animationDuration: 220,
  })
}

function openDetail(rid) { uni.navigateTo({ url: `/pages/study/detail?id=${rid}`, animationType: 'slide-in-right', animationDuration: 220 }) }
onLoad((q) => { id.value = q?.id || 's1' })
</script>

<style scoped>
.page { min-height: 100vh; position: relative; overflow: hidden; }
.bg { position: absolute; inset: 0; background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(40, 110, 255, 0.16), transparent 60%), linear-gradient(180deg, #f8faff, #f1f4fa); }
.t-dark .bg { background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(60, 120, 255, 0.14), transparent 58%), linear-gradient(180deg, #111315, #0e1014); }

.noticeStrip { position: relative; z-index: 2; margin: 8rpx 28rpx 12rpx; padding: 20rpx 18rpx; border-radius: 26rpx; display: flex; align-items: center; gap: 14rpx; background: linear-gradient(135deg, rgba(80, 140, 255, 0.14), rgba(46, 99, 255, 0.06)); border: 1rpx solid rgba(46, 99, 255, 0.22); transition: transform 180ms ease, background 220ms ease; }
.t-dark .noticeStrip { background: linear-gradient(135deg, rgba(80, 140, 255, 0.22), rgba(46, 99, 255, 0.10)); border-color: rgba(120, 160, 255, 0.28); }
.noticeStrip:active { transform: scale(0.985); }
.noticeStripGlyph { width: 48rpx; height: 48rpx; flex-shrink: 0; display: flex; align-items: center; justify-content: center; position: relative; }
.noticeStripGlyph .ring { position: absolute; inset: 0; border-radius: 50%; background: rgba(46, 99, 255, 0.18); }
.noticeStripGlyph .bell { width: 16rpx; height: 16rpx; border-radius: 16rpx 16rpx 4rpx 4rpx; background: rgba(46, 99, 255, 0.95); position: relative; }
.noticeStripGlyph .bell::after { content: ''; position: absolute; bottom: -4rpx; left: 50%; width: 4rpx; height: 4rpx; margin-left: -2rpx; border-radius: 50%; background: rgba(46, 99, 255, 0.95); }
.noticeStripMain { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2rpx; }
.noticeStripLabel { font-size: 26rpx; font-weight: 740; color: rgba(16, 24, 40, 0.92); }
.t-dark .noticeStripLabel { color: rgba(245, 247, 255, 0.92); }
.noticeStripSub { font-size: 18rpx; color: rgba(46, 99, 255, 0.78); font-weight: 660; }
.t-dark .noticeStripSub { color: rgba(170, 200, 255, 0.78); }
.noticeStripChev { font-size: 26rpx; color: rgba(46, 99, 255, 0.6); font-weight: 300; }

.scroll { position: relative; z-index: 1; height: calc(100vh - var(--shell-header-offset, 148rpx) - 108rpx); padding: 0 28rpx 40rpx; }
.card { margin-top: var(--list-stack-gap); padding: var(--list-card-pad-y) var(--list-card-pad-x); border-radius: var(--list-card-radius); background: rgba(255, 255, 255, 0.7); border: 1rpx solid rgba(16, 24, 40, 0.04); transition: transform 180ms ease, background 220ms ease, border-color 220ms ease; }
.t-dark .card { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.06); }
.card:active { transform: scale(0.985); }
.head { display: flex; justify-content: space-between; align-items: center; gap: 10rpx; }
.type { font-size: var(--list-meta-size); padding: 4rpx 12rpx; border-radius: 999rpx; background: rgba(16, 24, 40, 0.06); color: rgba(16, 24, 40, 0.65); font-weight: 700; }
.t-dark .type { background: rgba(255, 255, 255, 0.08); color: rgba(245, 247, 255, 0.72); }
.title { display: block; margin-top: 10rpx; font-size: var(--list-title-size); font-weight: 720; color: rgba(16, 24, 40, 0.92); }
.t-dark .title { color: rgba(245, 247, 255, 0.92); }
.meta { display: block; margin-top: 8rpx; font-size: var(--list-meta-size); color: rgba(16, 24, 40, 0.5); }
.t-dark .meta { color: rgba(245, 247, 255, 0.45); }
.emptyWrap { padding: 32rpx 0; }
.gap { height: 24rpx; }
</style>
