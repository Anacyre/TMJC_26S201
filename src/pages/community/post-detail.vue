<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader nav-mode="back" />
    <scroll-view class="scroll" scroll-y :show-scrollbar="false">
      <view class="card pad">
        <text class="title">{{ post.title }}</text>
        <text class="meta">{{ post.anonymous ? 'Anonymous' : post.author }} · {{ postTimeLabel }}</text>
        <text class="content">{{ post.content || 'No content yet.' }}</text>
        <view class="actions">
          <view class="btn tap" :class="{ on: post.liked }" role="button" @tap="onToggleLike">
            <text class="btnText">{{ post.liked ? `♥ ${post.likesCount}` : `♥ ${post.likesCount || 0}` }}</text>
          </view>
          <view class="btn tap" :class="{ on: saved }" role="button" @tap="saved = !saved">
            <text class="btnText">{{ saved ? '★ Saved' : '☆ Save' }}</text>
          </view>
        </view>
      </view>
      <view class="card pad">
        <text class="sec">Comments</text>
        <view v-for="c in comments" :key="c.id" class="comment">
          <text class="cAuthor">{{ c.author }}</text>
          <text class="cText">{{ c.text }}</text>
        </view>
        <view class="reply">
          <input class="input" v-model="reply" placeholder="Reply…" placeholder-class="placeholder" />
          <view class="send tap" role="button" @tap="send"><text class="sendText">Send</text></view>
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
import { useTheme } from '@/composables/useTheme'
import { useCommunityStore } from '@/composables/useCommunityStore'
import { toast } from '@/composables/useToast'

const { themeClass } = useTheme()
const { getPostById, getComments, addComment, fetchComments, togglePostLike } = useCommunityStore()
const id = ref('p1')
const saved = ref(false)
const reply = ref('')
const post = computed(() => getPostById(id.value))
const comments = computed(() => getComments(id.value))
const postTimeLabel = computed(() => shortTimeLabel(post.value?.createdAt))

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

function onToggleLike() {
  if (!post.value?.id) return
  togglePostLike(post.value.id)
  toast.updated()
}

function send() {
  if (!reply.value.trim()) return
  addComment(id.value, reply.value)
  toast.added()
  reply.value = ''
}
onLoad((q) => {
  id.value = q?.id || 'p1'
  fetchComments(id.value)
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
  background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(40, 110, 255, 0.16), transparent 60%),
    linear-gradient(180deg, #f8faff, #f1f4fa);
}
.t-dark .bg {
  background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(60, 120, 255, 0.16), transparent 58%),
    linear-gradient(180deg, #111315, #0e1014);
}
.scroll {
  position: relative;
  z-index: 1;
  height: calc(100vh - var(--shell-header-offset, 148rpx));
  padding: 4rpx 28rpx 40rpx;
}
.card {
  margin-top: 10rpx;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.7);
  border: 1rpx solid rgba(16, 24, 40, 0.04);
}
.t-dark .card {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.06);
}
.pad {
  padding: 16rpx 18rpx;
}
.title {
  font-size: 26rpx;
  font-weight: 740;
  color: rgba(16, 24, 40, 0.92);
}
.t-dark .title {
  color: #f5f7fa;
}
.meta {
  display: block;
  margin-top: 8rpx;
  font-size: 20rpx;
  color: rgba(16, 24, 40, 0.56);
}
.t-dark .meta {
  color: #9aa4b2;
}
.content {
  display: block;
  margin-top: 14rpx;
  font-size: 22rpx;
  line-height: 1.5;
  color: rgba(16, 24, 40, 0.74);
}
.t-dark .content {
  color: rgba(245, 247, 255, 0.74);
}
.actions {
  margin-top: 16rpx;
  display: flex;
  gap: 10rpx;
}
.btn {
  height: 56rpx;
  padding: 0 16rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  background: rgba(16, 24, 40, 0.05);
  border: 1rpx solid rgba(16, 24, 40, 0.08);
  transition: background 200ms ease, border-color 200ms ease, transform 160ms ease;
}
.t-dark .btn {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
}
.btn:active {
  transform: scale(0.98);
}
.btn.on {
  background: rgba(46, 99, 255, 0.14);
  border-color: rgba(46, 99, 255, 0.22);
}
.btnText {
  font-size: 20rpx;
  color: rgba(16, 24, 40, 0.78);
}
.t-dark .btnText {
  color: rgba(245, 247, 255, 0.82);
}
.btn.on .btnText {
  color: rgba(46, 99, 255, 0.96);
}
.sec {
  font-size: 22rpx;
  font-weight: 640;
  color: rgba(16, 24, 40, 0.62);
}
.t-dark .sec {
  color: rgba(245, 247, 255, 0.62);
}
.comment {
  margin-top: 12rpx;
  padding: 12rpx 14rpx;
  border-radius: 18rpx;
  background: rgba(16, 24, 40, 0.04);
  border: 1rpx solid rgba(16, 24, 40, 0.04);
}
.t-dark .comment {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.04);
}
.cAuthor {
  font-size: 19rpx;
  color: rgba(46, 99, 255, 0.92);
}
.cText {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: rgba(16, 24, 40, 0.86);
}
.t-dark .cText {
  color: rgba(245, 247, 255, 0.86);
}
.reply {
  margin-top: 14rpx;
  display: flex;
  gap: 8rpx;
}
.input {
  flex: 1;
  height: 74rpx;
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.78);
  border: 1rpx solid rgba(16, 24, 40, 0.06);
  padding: 0 14rpx;
  font-size: 22rpx;
  color: rgba(16, 24, 40, 0.92);
}
.t-dark .input {
  background: #23272d;
  border-color: rgba(255, 255, 255, 0.06);
  color: rgba(245, 247, 255, 0.92);
}
.placeholder {
  color: rgba(16, 24, 40, 0.35);
}
.t-dark .placeholder {
  color: rgba(245, 247, 255, 0.32);
}
.send {
  width: 110rpx;
  height: 74rpx;
  border-radius: 18rpx;
  background: linear-gradient(180deg, #5a8eff, #2e63ff);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 32rpx rgba(46, 99, 255, 0.24);
}
.sendText {
  font-size: 21rpx;
  font-weight: 720;
  color: #fff;
}
.gap {
  height: 24rpx;
}
</style>
