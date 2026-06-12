<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader nav-mode="back" />

    <PageContent>
    <scroll-view class="scroll" scroll-y :show-scrollbar="false">
      <CommunitySpaceProfile
        v-if="community"
        class="spaceHeader"
        compact
        tappable
        :icon="community.icon"
        :name="community.name"
        :desc="community.desc"
        :post-count="spacePostCount"
        :member-count="memberCount"
        @info="openSpaceInfo"
        @tap="openSpaceFeed"
      />

      <SwipeRow
        v-if="showDeleteBtn && post"
        side="right"
        action-style="strip"
        :actions="deleteActions"
        commit-action="delete"
        @action="confirmDelete"
        @commit="confirmDelete"
      >
        <CommunityPostBody
          :post="post"
          :time-label="postTimeLabel"
          :saved="saved"
          @toggle-like="onToggleLike"
          @toggle-save="saved = !saved"
          @open-attachment="openAttachment"
        />
      </SwipeRow>
      <CommunityPostBody
        v-else-if="post"
        :post="post"
        :time-label="postTimeLabel"
        :saved="saved"
        @toggle-like="onToggleLike"
        @toggle-save="saved = !saved"
        @open-attachment="openAttachment"
      />

      <view class="panel commentsPanel">
        <view class="panelHead">
          <text class="panelLabel">Comments</text>
          <text class="panelCount">{{ comments.length }}</text>
        </view>

        <view v-if="!comments.length" class="commentsEmpty">
          <text class="commentsEmptyText">No replies yet. Start the conversation.</text>
        </view>

        <view v-for="c in comments" :key="c.id" class="commentRow">
          <view class="commentAvatar">{{ initials(c.author) }}</view>
          <view class="commentBody">
            <text class="commentAuthor">{{ c.author }}</text>
            <text class="commentText">{{ c.text }}</text>
          </view>
        </view>

        <view class="replyRow">
          <input class="replyInput" v-model="reply" placeholder="Write a reply…" placeholder-class="placeholder" />
          <view class="replySend tap" role="button" @tap="send"><text class="replySendText">Send</text></view>
        </view>
      </view>
      <view class="gap" />
    </scroll-view>
    </PageContent>
    <GlobalSearchOverlay />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppHeader from '@/components/AppHeader.vue'
import PageContent from '@/components/PageContent.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import SwipeRow from '@/components/SwipeRow.vue'
import CommunitySpaceProfile from '@/components/CommunitySpaceProfile.vue'
import CommunityPostBody from '@/components/CommunityPostBody.vue'
import { useTheme } from '@/composables/useTheme'
import { useCommunityStore } from '@/composables/useCommunityStore'
import { useMemberStore } from '@/composables/useMemberStore'
import { usePostDelete } from '@/composables/usePostDelete'
import { navSibling } from '@/lib/navigation'
import { toast } from '@/composables/useToast'

const { themeClass } = useTheme()
const { getPostById, getComments, addComment, fetchComments, togglePostLike, getCommunityById, getPostsByCommunity } = useCommunityStore()
const { visibleMembers } = useMemberStore()
const { canDelete, confirmDeletePost } = usePostDelete()
const id = ref('')
const saved = ref(false)
const reply = ref('')
const deleteActions = [{ id: 'delete', label: 'Delete', icon: 'trash', danger: true }]
const post = computed(() => getPostById(id.value))
const comments = computed(() => getComments(id.value))
const community = computed(() => {
  const cid = post.value?.communityId
  return cid ? getCommunityById(cid) : null
})
const spacePostCount = computed(() => {
  const cid = post.value?.communityId
  return cid ? getPostsByCommunity(cid).length : null
})
const memberCount = computed(() => visibleMembers.value.length)
const postTimeLabel = computed(() => shortTimeLabel(post.value?.createdAt))
const showDeleteBtn = computed(() => canDelete(post.value))

function initials(name) {
  return String(name || '?').split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase()
}

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
}

function openAttachment(url) {
  if (!url) return
  // #ifdef H5
  if (typeof window !== 'undefined') {
    window.open(url, '_blank')
    return
  }
  // #endif
  uni.setClipboardData({
    data: url,
    success: () => toast.show('Link copied'),
  })
}

function openSpaceInfo() {
  const cid = post.value?.communityId
  if (!cid) return
  navSibling(`/pages/community/info?id=${cid}`)
}

function openSpaceFeed() {
  const cid = post.value?.communityId
  if (!cid) return
  navSibling(`/pages/community/feed?id=${cid}`)
}

function confirmDelete() {
  confirmDeletePost(post.value, {
    onDeleted: () => setTimeout(() => uni.navigateBack({ delta: 1 }), 180),
  })
}

function send() {
  if (!reply.value.trim()) return
  addComment(id.value, reply.value)
  toast.commentAdded()
  reply.value = ''
}

onLoad((q) => {
  id.value = q?.id || ''
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
  padding: 12rpx 28rpx 40rpx;
}

.spaceHeader { margin-bottom: 12rpx; }

.panel {
  margin-top: 12rpx;
  padding: 16rpx 18rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.78);
  border: 1rpx solid rgba(16, 24, 40, 0.05);
}
.t-dark .panel {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.06);
}
.panelHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}
.panelLabel {
  font-size: 20rpx;
  font-weight: 700;
  color: rgba(16, 24, 40, 0.42);
  letter-spacing: 0.3rpx;
}
.t-dark .panelLabel { color: rgba(245, 247, 255, 0.38); }
.panelCount {
  min-width: 36rpx;
  height: 36rpx;
  padding: 0 10rpx;
  border-radius: 999rpx;
  background: rgba(46, 99, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18rpx;
  font-weight: 720;
  color: rgba(46, 99, 255, 0.92);
}
.t-dark .panelCount {
  background: rgba(120, 160, 255, 0.12);
  color: rgba(170, 200, 255, 0.92);
}

.commentsEmpty { padding: 20rpx 0 8rpx; }
.commentsEmptyText {
  font-size: 21rpx;
  color: rgba(16, 24, 40, 0.45);
  line-height: 1.45;
}
.t-dark .commentsEmptyText { color: rgba(245, 247, 255, 0.4); }

.commentRow {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  padding: 12rpx 0;
  border-bottom: 1rpx solid rgba(16, 24, 40, 0.05);
}
.commentRow:last-of-type { border-bottom: none; }
.t-dark .commentRow { border-bottom-color: rgba(255, 255, 255, 0.05); }
.commentAvatar {
  width: 52rpx; height: 52rpx; border-radius: 50%; flex-shrink: 0;
  background: rgba(46, 99, 255, 0.14);
  display: flex; align-items: center; justify-content: center;
  color: rgba(46, 99, 255, 0.96); font-size: 18rpx; font-weight: 760;
}
.t-dark .commentAvatar {
  background: rgba(120, 160, 255, 0.16);
  color: rgba(170, 200, 255, 0.96);
}
.commentBody { flex: 1; min-width: 0; }
.commentAuthor {
  font-size: 19rpx;
  font-weight: 720;
  color: rgba(46, 99, 255, 0.92);
  display: block;
}
.commentText {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  line-height: 1.45;
  color: rgba(16, 24, 40, 0.82);
}
.t-dark .commentText { color: rgba(245, 247, 255, 0.82); }

.replyRow {
  margin-top: 14rpx;
  display: flex;
  gap: 8rpx;
}
.replyInput {
  flex: 1;
  height: 74rpx;
  border-radius: 18rpx;
  background: rgba(16, 24, 40, 0.04);
  border: 1rpx solid rgba(16, 24, 40, 0.06);
  padding: 0 14rpx;
  font-size: 22rpx;
  color: rgba(16, 24, 40, 0.92);
}
.t-dark .replyInput {
  background: #23272d;
  border-color: rgba(255, 255, 255, 0.06);
  color: rgba(245, 247, 255, 0.92);
}
.placeholder { color: rgba(16, 24, 40, 0.35); }
.t-dark .placeholder { color: rgba(245, 247, 255, 0.32); }
.replySend {
  width: 110rpx;
  height: 74rpx;
  border-radius: 18rpx;
  background: linear-gradient(180deg, #5a8eff, #2e63ff);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 32rpx rgba(46, 99, 255, 0.24);
}
.replySendText {
  font-size: 21rpx;
  font-weight: 720;
  color: #fff;
}
.gap { height: 24rpx; }
</style>
