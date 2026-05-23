<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader :title="subject.name" nav-mode="back" />
    <view v-if="subjectNoticeSlug" class="noticeStrip" role="button" @tap="openSubjectNotices">
      <view class="noticeStripMain">
        <text class="noticeStripLabel">Notices</text>
      </view>
      <text class="noticeStripChev">â€?/text>
    </view>
    <scroll-view class="scroll" scroll-y :show-scrollbar="false">
      <view v-if="!resourcesView.length" class="emptyWrap">
        <EmptyState
          variant="resources"
          title="No resources yet"
        />
      </view>
      <view v-else>
        <view v-for="r in resourcesView" :key="r.id" class="card" role="button" @tap="openDetail(r.id)">
          <view class="head">
            <text class="type">{{ r.type }}</text>
            <text class="tag">{{ subject.name }}</text>
          </view>
          <text class="title">{{ r.title }}</text>
          <text class="meta">{{ r.uploaderName }} Â· {{ r.timeLabel }}</text>
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
.page{min-height:100vh;position:relative;overflow:hidden}.bg{position:absolute;inset:0;background:radial-gradient(1200rpx 800rpx at 40% 0%,rgba(40,110,255,.16),transparent 60%),linear-gradient(180deg,#f8faff,#f1f4fa)}.t-dark .bg{background:radial-gradient(1200rpx 800rpx at 40% 0%,rgba(60,120,255,.14),transparent 58%),linear-gradient(180deg,#111315,#0e1014)}
.noticeStrip{position:relative;z-index:2;margin:8rpx 28rpx 10rpx;padding:14rpx 16rpx;border-radius:20rpx;display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.7);border:1rpx solid rgba(16,24,40,.06)}.t-dark .noticeStrip{background:#1a1d21;border-color:rgba(255,255,255,.06)}.noticeStripLabel{font-size:22rpx;font-weight:720;color:rgba(16,24,40,.9)}.t-dark .noticeStripLabel{color:#f5f7fa}.noticeStripSub{display:block;margin-top:4rpx;font-size:18rpx;color:rgba(16,24,40,.5)}.t-dark .noticeStripSub{color:#9aa4b2}.noticeStripChev{font-size:28rpx;color:rgba(46,99,255,.9);font-weight:300}
.scroll{position:relative;z-index:1;height:calc(100vh - 210rpx);padding:0 28rpx 40rpx}.card{margin-top:12rpx;padding:18rpx;border-radius:24rpx;background:rgba(255,255,255,.74);border:1rpx solid rgba(255,255,255,.6);box-shadow:0 16rpx 50rpx rgba(12,20,40,.08);transition:transform 180ms ease,background 220ms ease,border-color 220ms ease}.t-dark .card{background:#1a1d21;border-color:rgba(255,255,255,.06);box-shadow:0 18rpx 56rpx rgba(0,0,0,.36)}.card:active{transform:scale(.99)}
.head{display:flex;justify-content:space-between;align-items:center;gap:10rpx}.type{font-size:18rpx;padding:4rpx 12rpx;border-radius:999rpx;background:rgba(16,24,40,.06);color:rgba(16,24,40,.7);font-weight:700;letter-spacing:.3rpx}.t-dark .type{background:rgba(255,255,255,.08);color:rgba(245,247,255,.78)}.tag{font-size:18rpx;padding:4rpx 12rpx;border-radius:999rpx;background:rgba(46,99,255,.12);color:rgba(46,99,255,.95)}.t-dark .tag{background:rgba(120,160,255,.16);color:rgba(170,200,255,.95)}
.title{display:block;margin-top:12rpx;font-size:24rpx;font-weight:730;color:rgba(16,24,40,.92)}.t-dark .title{color:#f5f7fa}.meta{display:block;margin-top:8rpx;font-size:19rpx;color:rgba(16,24,40,.54)}.t-dark .meta{color:#9aa4b2}.emptyWrap{padding:40rpx 0}.gap{height:24rpx}
</style>
