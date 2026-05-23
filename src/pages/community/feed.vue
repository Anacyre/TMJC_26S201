<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader :title="community.name" nav-mode="back" :show-avatar="false" />
    <view class="filters">
      <view v-for="f in ['hot','new','top']" :key="f" class="chip" :class="{ on: filter === f }" role="button" @tap="filter = f"><text>{{ f }}</text></view>
    </view>
    <scroll-view class="scroll" scroll-y :show-scrollbar="false">
      <view class="addRow"><view class="addBtn" role="button" @tap="showCreate = true">+ Create Post</view></view>
      <view v-for="p in visiblePostsView" :key="p.id" class="card" role="button" @tap="openPost(p.id)">
        <text class="title">{{ p.title }}</text>
        <text class="meta">{{ p.anonymous ? 'Anonymous' : p.author }} · {{ p.timeLabel }}</text>
        <view class="stats"><text>♥ {{ p.likesCount }}</text><text>💬 {{ p.commentsCount }}</text></view>
      </view>
      <view class="gap" />
    </scroll-view>
    <view class="fab" role="button" @tap="showCreate = true"><text class="fabText">＋</text></view>
    <view class="overlay" :class="{ show: showCreate }" @tap="showCreate = false">
      <view class="sheet" @tap.stop>
        <text class="sheetTitle">Create Post</text>
        <textarea class="input area" v-model="draft.text" placeholder="Share something useful..." placeholder-class="ph" />
        <input class="input" v-model="draft.image" placeholder="Image URL (optional)" placeholder-class="ph" />
        <view class="anonRow" role="button" @tap="draft.anonymous = !draft.anonymous"><text>{{ draft.anonymous ? '☑' : '☐' }} Anonymous Post</text></view>
        <view class="create" role="button" @tap="createPost">Publish</view>
      </view>
    </view>
    <GlobalSearchOverlay />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppHeader from '@/components/AppHeader.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import { useTheme } from '@/composables/useTheme'
import { useCommunityStore } from '@/composables/useCommunityStore'
import { useUserStore } from '@/composables/useUserStore'

const { themeClass } = useTheme()
const { getCommunityById, hotPosts, newPosts, topPosts, addPost } = useCommunityStore()
const { currentUser } = useUserStore()
const id = ref('c1')
const filter = ref('hot')
const showCreate = ref(false)
const draft = ref({ text: '', image: '', anonymous: false })

const community = computed(() => getCommunityById(id.value))
const visiblePosts = computed(() => {
  if (filter.value === 'new') return newPosts.value.filter((x) => x.communityId === id.value)
  if (filter.value === 'top') return topPosts.value.filter((x) => x.communityId === id.value)
  return hotPosts.value.filter((x) => x.communityId === id.value)
})
const visiblePostsView = computed(() =>
  visiblePosts.value.map((p) => ({
    ...p,
    timeLabel: shortTimeLabel(p.createdAt),
  }))
)

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
function back() { uni.navigateBack() }
function openPost(postId) { uni.navigateTo({ url: `/pages/community/post-detail?id=${postId}`, animationType: 'slide-in-right', animationDuration: 220 }) }
function createPost() {
  if (!draft.value.text.trim()) return
  addPost({
    communityId: id.value,
    title: draft.value.text.trim(),
    image: draft.value.image.trim(),
    author: currentUser.value.name,
    anonymous: draft.value.anonymous,
  })
  showCreate.value = false
  draft.value = { text: '', image: '', anonymous: false }
}
onLoad((q) => { id.value = q?.id || 'c1' })
</script>

<style scoped>
.page{min-height:100vh;position:relative;overflow:hidden}.bg{position:absolute;inset:0;background:radial-gradient(1200rpx 800rpx at 40% 0%,rgba(40,110,255,.16),transparent 60%),linear-gradient(180deg,#f8faff,#f1f4fa)}.t-dark .bg{background:radial-gradient(1200rpx 800rpx at 40% 0%,rgba(60,120,255,.14),transparent 58%),linear-gradient(180deg,#111315,#0e1014)}
.filters{position:relative;z-index:2;display:flex;gap:10rpx;padding:0 28rpx 12rpx}.chip{padding:10rpx 16rpx;border-radius:999rpx;background:rgba(255,255,255,.62);border:1rpx solid rgba(16,24,40,.06);font-size:20rpx;color:rgba(16,24,40,.7);transition:background 220ms ease,color 220ms ease,border-color 220ms ease}.t-dark .chip{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.06);color:rgba(245,247,255,.7)}.chip.on{background:rgba(46,99,255,.14);border-color:rgba(46,99,255,.2);color:rgba(46,99,255,.96)}.t-dark .chip.on{background:rgba(120,160,255,.16);border-color:rgba(120,160,255,.24);color:rgba(170,200,255,.96)}
.scroll{position:relative;z-index:1;height:calc(100vh - 184rpx);padding:0 28rpx 40rpx}.addRow{display:flex;justify-content:flex-end;padding:0 0 6rpx}.addBtn{height:56rpx;padding:0 14rpx;border-radius:16rpx;background:rgba(46,99,255,.14);color:rgba(46,99,255,.95);display:flex;align-items:center}
.card{padding:18rpx;border-radius:26rpx;background:rgba(255,255,255,.74);border:1rpx solid rgba(255,255,255,.6);box-shadow:0 16rpx 50rpx rgba(12,20,40,.08);margin-top:12rpx;transition:background 220ms ease,border-color 220ms ease,transform 160ms ease}.t-dark .card{background:#1a1d21;border-color:rgba(255,255,255,.06);box-shadow:0 18rpx 56rpx rgba(0,0,0,.36)}.card:active{transform:scale(.99)}
.title{font-size:24rpx;font-weight:730;color:rgba(16,24,40,.92)}.t-dark .title{color:#f5f7fa}.meta{display:block;margin-top:8rpx;font-size:20rpx;color:rgba(16,24,40,.54)}.t-dark .meta{color:#9aa4b2}.stats{margin-top:14rpx;display:flex;gap:18rpx;font-size:19rpx;color:rgba(16,24,40,.6)}.t-dark .stats{color:rgba(245,247,255,.6)}.gap{height:24rpx}
.fab{position:fixed;right:28rpx;bottom:162rpx;width:92rpx;height:92rpx;border-radius:50%;background:rgba(255,255,255,.78);border:1rpx solid rgba(255,255,255,.6);display:flex;align-items:center;justify-content:center;z-index:25;box-shadow:0 22rpx 60rpx rgba(46,99,255,.18)}.t-dark .fab{background:#1a1d21;border-color:rgba(255,255,255,.08);box-shadow:0 22rpx 70rpx rgba(0,0,0,.5)}.fabText{font-size:40rpx;color:rgba(46,99,255,.95);font-weight:300}
.overlay{position:fixed;inset:0;z-index:40;opacity:0;pointer-events:none;background:rgba(8,12,24,.32);backdrop-filter:blur(12px);transition:opacity .22s ease}.overlay.show{opacity:1;pointer-events:auto}.sheet{position:absolute;left:14rpx;right:14rpx;bottom:14rpx;padding:18rpx;border-radius:28rpx;background:rgba(255,255,255,.86);border:1rpx solid rgba(255,255,255,.6);box-shadow:0 30rpx 90rpx rgba(8,12,24,.22)}.t-dark .sheet{background:#1a1d21;border-color:rgba(255,255,255,.08);box-shadow:0 36rpx 100rpx rgba(0,0,0,.55)}
.sheetTitle{font-size:24rpx;font-weight:740;color:rgba(16,24,40,.92)}.t-dark .sheetTitle{color:#f5f7fa}.input{height:74rpx;margin-top:10rpx;padding:0 14rpx;border-radius:16rpx;background:rgba(16,24,40,.04);border:1rpx solid rgba(16,24,40,.06);color:rgba(16,24,40,.92)}.t-dark .input{background:#23272d;border-color:rgba(255,255,255,.06);color:#f5f7fa}.area{height:140rpx;padding-top:14rpx}.ph{color:rgba(16,24,40,.35)}.t-dark .ph{color:rgba(245,247,255,.32)}.anonRow{margin-top:10rpx;height:60rpx;display:flex;align-items:center;color:rgba(16,24,40,.78);font-size:21rpx}.t-dark .anonRow{color:rgba(245,247,255,.82)}.create{margin-top:12rpx;height:74rpx;border-radius:18rpx;background:linear-gradient(180deg,#5a8eff,#2e63ff);display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 14rpx 36rpx rgba(46,99,255,.28)}
</style>
