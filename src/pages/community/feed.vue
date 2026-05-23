<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader :title="community.name" nav-mode="back" :show-avatar="false" />

    <view class="filters">
      <view v-for="f in ['hot','new','top']" :key="f" class="chip" :class="{ on: filter === f }" role="button" @tap="filter = f">
        <text class="chipText">{{ filterLabel(f) }}</text>
      </view>
    </view>

    <scroll-view class="scroll" scroll-y :show-scrollbar="false">
      <SkeletonList v-if="loading" variant="feed" :count="3" />

      <view v-else-if="!visiblePostsView.length" class="emptyWrap">
        <EmptyState
          variant="posts"
          title="No posts yet"
          action-label="Create post"
          @action="showCreate = true"
        />
      </view>

      <view
        v-else
        v-for="p in visiblePostsView"
        :key="p.id"
        class="card tap"
        role="button"
        @tap="openPost(p.id)"
      >
        <text class="title">{{ p.title }}</text>
        <view class="metaRow">
          <text class="meta">{{ p.anonymous ? 'Anonymous' : p.author }}</text>
          <text class="metaDot">·</text>
          <text class="meta">{{ p.timeLabel }}</text>
        </view>
        <view class="stats">
          <view class="stat">
            <view class="statGlyph heart" />
            <text class="statText">{{ p.likesCount }}</text>
          </view>
          <view class="stat">
            <view class="statGlyph chat" />
            <text class="statText">{{ p.commentsCount }}</text>
          </view>
        </view>
      </view>
      <view class="gap" />
    </scroll-view>

    <view class="fab" role="button" @tap="showCreate = true" aria-label="New post">
      <view class="plus">
        <view class="hLine" />
        <view class="vLine" />
      </view>
    </view>

    <view class="overlay" :class="{ show: showCreate }" @tap="showCreate = false">
      <view class="sheet" @tap.stop>
        <view class="grabber" />
        <text class="sheetTitle">New post</text>
        <textarea class="input area" v-model="draft.text" placeholder="Share something useful…" placeholder-class="ph" />
        <input class="input" v-model="draft.image" placeholder="Image URL (optional)" placeholder-class="ph" />
        <view class="anonRow" role="button" @tap="draft.anonymous = !draft.anonymous">
          <view class="check" :class="{ on: draft.anonymous }"><view class="checkDot" /></view>
          <text class="anonText">Post anonymously</text>
        </view>
        <view class="commit" role="button" @tap="createPost">
          <text class="commitText">Publish</text>
        </view>
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
import EmptyState from '@/components/EmptyState.vue'
import SkeletonList from '@/components/SkeletonList.vue'
import { useTheme } from '@/composables/useTheme'
import { useCommunityStore } from '@/composables/useCommunityStore'
import { useUserStore } from '@/composables/useUserStore'
import { toast } from '@/composables/useToast'

const { themeClass } = useTheme()
const { getCommunityById, hotPosts, newPosts, topPosts, addPost, loading } = useCommunityStore()
const { currentUser } = useUserStore()
const id = ref('c1')
const filter = ref('hot')
const showCreate = ref(false)
const draft = ref({ text: '', image: '', anonymous: false })

const community = computed(() => getCommunityById(id.value) || { name: 'Space' })

function filterLabel(f) {
  if (f === 'hot') return 'Hot'
  if (f === 'new') return 'New'
  return 'Top'
}

const visiblePosts = computed(() => {
  if (filter.value === 'new') return newPosts.value.filter((x) => x.communityId === id.value)
  if (filter.value === 'top') return topPosts.value.filter((x) => x.communityId === id.value)
  return hotPosts.value.filter((x) => x.communityId === id.value)
})
const visiblePostsView = computed(() =>
  visiblePosts.value.map((p) => ({ ...p, timeLabel: shortTimeLabel(p.createdAt) }))
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

function openPost(postId) {
  uni.navigateTo({ url: `/pages/community/post-detail?id=${postId}`, animationType: 'slide-in-right', animationDuration: 220 })
}

function createPost() {
  if (!draft.value.text.trim()) {
    toast.show('Write something')
    return
  }
  addPost({
    communityId: id.value,
    title: draft.value.text.trim(),
    image: draft.value.image.trim(),
    author: currentUser.value.name,
    anonymous: draft.value.anonymous,
  })
  showCreate.value = false
  draft.value = { text: '', image: '', anonymous: false }
  toast.published()
}

onLoad((q) => { id.value = q?.id || 'c1' })
</script>

<style scoped>
.page { min-height: 100vh; position: relative; overflow: hidden; }
.bg { position: absolute; inset: 0; background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(40, 110, 255, 0.16), transparent 60%), linear-gradient(180deg, #f8faff, #f1f4fa); }
.t-dark .bg { background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(60, 120, 255, 0.14), transparent 58%), linear-gradient(180deg, #111315, #0e1014); }

.filters { position: relative; z-index: 2; display: flex; gap: 8rpx; padding: 0 28rpx 14rpx; }
.chip { padding: 10rpx 18rpx; border-radius: 999rpx; background: transparent; border: 1rpx solid transparent; opacity: 0.62; transition: background 220ms ease, border-color 220ms ease, opacity 220ms ease, transform 180ms ease; }
.chip.on { background: rgba(46, 99, 255, 0.12); border-color: rgba(46, 99, 255, 0.2); opacity: 1; }
.chipText { font-size: 21rpx; font-weight: 660; color: rgba(16, 24, 40, 0.7); }
.t-dark .chipText { color: rgba(245, 247, 255, 0.7); }
.chip.on .chipText { color: rgba(46, 99, 255, 0.96); font-weight: 720; }
.t-dark .chip.on .chipText { color: rgba(170, 200, 255, 0.96); }

.scroll { position: relative; z-index: 1; height: calc(100vh - 200rpx); padding: 0 28rpx 60rpx; }
.emptyWrap { padding: 40rpx 0; }
.card { margin-top: 12rpx; padding: 18rpx 18rpx 14rpx; border-radius: 24rpx; background: rgba(255, 255, 255, 0.7); border: 1rpx solid rgba(16, 24, 40, 0.04); transition: transform 180ms ease, background 220ms ease, border-color 220ms ease; }
.t-dark .card { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.06); }
.tap:active { transform: scale(0.99); }
.title { font-size: 24rpx; font-weight: 720; color: rgba(16, 24, 40, 0.92); }
.t-dark .title { color: #f5f7fa; }
.metaRow { margin-top: 8rpx; display: flex; align-items: center; gap: 8rpx; }
.meta { font-size: 19rpx; color: rgba(16, 24, 40, 0.52); }
.t-dark .meta { color: rgba(245, 247, 255, 0.5); }
.metaDot { font-size: 18rpx; color: rgba(16, 24, 40, 0.3); }
.t-dark .metaDot { color: rgba(245, 247, 255, 0.3); }

.stats { margin-top: 14rpx; display: flex; gap: 18rpx; }
.stat { display: flex; align-items: center; gap: 6rpx; }
.statGlyph { width: 18rpx; height: 18rpx; }
.statGlyph.heart { background: transparent; border: 1.4rpx solid rgba(16, 24, 40, 0.55); transform: rotate(45deg); border-top-left-radius: 9rpx; border-top-right-radius: 9rpx; }
.t-dark .statGlyph.heart { border-color: rgba(245, 247, 255, 0.55); }
.statGlyph.chat { border-radius: 6rpx; border: 1.4rpx solid rgba(16, 24, 40, 0.55); position: relative; }
.t-dark .statGlyph.chat { border-color: rgba(245, 247, 255, 0.55); }
.statGlyph.chat::after { content: ''; position: absolute; bottom: -4rpx; left: 4rpx; width: 4rpx; height: 4rpx; background: rgba(16, 24, 40, 0.55); transform: rotate(45deg); }
.t-dark .statGlyph.chat::after { background: rgba(245, 247, 255, 0.55); }
.statText { font-size: 19rpx; font-weight: 660; color: rgba(16, 24, 40, 0.62); }
.t-dark .statText { color: rgba(245, 247, 255, 0.6); }
.gap { height: 24rpx; }

.fab { position: fixed; right: 28rpx; bottom: calc(60rpx + env(safe-area-inset-bottom)); width: 96rpx; height: 96rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.78); border: 1rpx solid rgba(255, 255, 255, 0.6); backdrop-filter: blur(16px); box-shadow: 0 26rpx 70rpx rgba(12, 20, 40, 0.22); z-index: 35; transition: transform 200ms ease, box-shadow 200ms ease; }
.t-dark .fab { background: rgba(26, 29, 33, 0.86); border-color: rgba(255, 255, 255, 0.08); box-shadow: 0 24rpx 70rpx rgba(0, 0, 0, 0.5); }
.fab:active { transform: scale(0.94); }
.plus { position: relative; width: 26rpx; height: 26rpx; }
.hLine, .vLine { position: absolute; background: rgba(46, 99, 255, 0.95); border-radius: 999rpx; }
.hLine { left: 0; right: 0; top: 50%; height: 2.4rpx; margin-top: -1.2rpx; }
.vLine { top: 0; bottom: 0; left: 50%; width: 2.4rpx; margin-left: -1.2rpx; }

.overlay { position: fixed; inset: 0; z-index: 50; opacity: 0; pointer-events: none; background: rgba(8, 12, 24, 0.4); backdrop-filter: blur(12px); transition: opacity 0.22s ease; }
.overlay.show { opacity: 1; pointer-events: auto; }
.sheet { position: absolute; left: 14rpx; right: 14rpx; bottom: 14rpx; padding: 0 22rpx 22rpx; border-radius: 32rpx; background: rgba(255, 255, 255, 0.94); border: 1rpx solid rgba(255, 255, 255, 0.6); }
.t-dark .sheet { background: #1a1d21; border-color: rgba(255, 255, 255, 0.06); }
.grabber { margin: 12rpx auto; width: 72rpx; height: 8rpx; border-radius: 999rpx; background: rgba(16,24,40,.18); }
.t-dark .grabber { background: rgba(245,247,255,.2); }
.sheetTitle { font-size: 26rpx; font-weight: 740; color: rgba(16, 24, 40, 0.92); }
.t-dark .sheetTitle { color: #f5f7fa; }
.sheetSub { display: block; margin-top: 6rpx; font-size: 20rpx; color: rgba(16, 24, 40, 0.5); }
.t-dark .sheetSub { color: rgba(245, 247, 255, 0.5); }
.input { width: 100%; min-height: 80rpx; margin-top: 12rpx; padding: 0 16rpx; border-radius: 20rpx; background: rgba(16, 24, 40, 0.04); border: 1rpx solid rgba(16, 24, 40, 0.06); color: rgba(16, 24, 40, 0.92); font-size: 23rpx; }
.t-dark .input { background: #23272d; border-color: rgba(255, 255, 255, 0.06); color: #f5f7fa; }
.area { min-height: 140rpx; padding-top: 14rpx; }
.ph { color: rgba(16, 24, 40, 0.35); }
.t-dark .ph { color: rgba(245, 247, 255, 0.32); }
.anonRow { margin-top: 14rpx; display: flex; align-items: center; gap: 10rpx; }
.check { width: 32rpx; height: 32rpx; border-radius: 10rpx; background: rgba(16, 24, 40, 0.06); border: 1rpx solid rgba(16, 24, 40, 0.08); display: flex; align-items: center; justify-content: center; }
.t-dark .check { background: rgba(255, 255, 255, 0.06); border-color: rgba(255, 255, 255, 0.08); }
.check.on { background: rgba(46, 99, 255, 0.14); border-color: rgba(46, 99, 255, 0.24); }
.checkDot { width: 12rpx; height: 12rpx; border-radius: 50%; background: rgba(16, 24, 40, 0.2); transition: background 180ms ease, transform 180ms ease; }
.check.on .checkDot { background: rgba(46, 99, 255, 0.95); transform: scale(1.05); }
.anonText { font-size: 21rpx; color: rgba(16, 24, 40, 0.7); }
.t-dark .anonText { color: rgba(245, 247, 255, 0.7); }
.commit { margin-top: 18rpx; height: 84rpx; border-radius: 22rpx; display: flex; align-items: center; justify-content: center; background: linear-gradient(180deg, #5a8eff, #2e63ff); box-shadow: 0 16rpx 40rpx rgba(46, 99, 255, 0.28); }
.commitText { color: #fff; font-size: 23rpx; font-weight: 720; }
</style>
