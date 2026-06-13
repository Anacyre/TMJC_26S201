<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader nav-mode="back" />

    <PageContent>
      <scroll-view class="scroll" scroll-y :show-scrollbar="false" :enhanced="true">
        <view class="safe">
          <view v-if="community" class="spaceHead tap" role="button" @tap="openSpaceFeed">
            <view class="spaceIcon">{{ community.icon || '◉' }}</view>
            <view class="spaceCopy">
              <text class="spaceName">{{ community.name }}</text>
              <text class="spaceMeta">{{ spacePostCount }} posts · {{ memberCount }} members</text>
            </view>
            <view class="infoBtn tap" role="button" @tap.stop="openSpaceInfo">
              <text class="infoText">i</text>
            </view>
          </view>

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

          <view class="section divided">
            <view class="sectionHead">
              <text class="sectionLabel">Comments</text>
              <text class="sectionCount">{{ comments.length }}</text>
            </view>

            <view v-if="!comments.length" class="commentsEmpty">
              <text class="commentsEmptyText">No replies yet.</text>
            </view>

            <view v-else class="commentList">
              <view
                v-for="c in commentsView"
                :key="c.id"
                v-memo="[c.id, c.text, c.author]"
                class="commentRow"
              >
                <view class="commentAvatar">{{ c.avatarInitials }}</view>
                <view class="commentBody">
                  <text class="commentAuthor">{{ c.author }}</text>
                  <text class="commentText">{{ c.text }}</text>
                </view>
              </view>
            </view>

            <view class="replyRow">
              <input class="replyInput" v-model="reply" placeholder="Write a reply…" placeholder-class="placeholder" />
              <view class="replySend tap" role="button" @tap="send"><text class="replySendText">Send</text></view>
            </view>
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
import CommunityPostBody from '@/components/CommunityPostBody.vue'
import { useTheme } from '@/composables/useTheme'
import { useCommunityStore } from '@/composables/useCommunityStore'
import { useMemberStore } from '@/composables/useMemberStore'
import { usePostDelete } from '@/composables/usePostDelete'
import { navSibling } from '@/lib/navigation'
import { toast } from '@/composables/useToast'
import { personInitials } from '@/lib/personDisplay'
import { shortTimeLabel } from '@/lib/timeLabel'

const { themeClass } = useTheme()
const { getPostById, getComments, addComment, fetchComments, togglePostLike, getCommunityById, getRegularPostCount, ensurePostsLoaded } = useCommunityStore()
const { visibleMemberCount } = useMemberStore()
const { canDelete, confirmDeletePost } = usePostDelete()
const id = ref('')
const saved = ref(false)
const reply = ref('')
const deleteActions = [{ id: 'delete', label: 'Delete', icon: 'trash', danger: true }]
const post = computed(() => getPostById(id.value))
const comments = computed(() => getComments(id.value))
const commentsView = computed(() =>
  comments.value.map((c) => ({
    ...c,
    avatarInitials: personInitials(c.author),
  }))
)
const community = computed(() => {
  const cid = post.value?.communityId
  return cid ? getCommunityById(cid) : null
})
const spacePostCount = computed(() => {
  const cid = post.value?.communityId
  return cid ? getRegularPostCount(cid) : null
})
const memberCount = visibleMemberCount
const postTimeLabel = computed(() => shortTimeLabel(post.value?.createdAt))
const showDeleteBtn = computed(() => canDelete(post.value))

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

onLoad(async (q) => {
  id.value = q?.id || ''
  await ensurePostsLoaded()
  fetchComments(id.value)
})
</script>

<style scoped>
.page { min-height: 100vh; position: relative; overflow: hidden; display: flex; flex-direction: column; }
.bg {
  position: absolute; inset: 0;
  background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(40, 110, 255, 0.16), transparent 60%),
    linear-gradient(180deg, #f8faff, #f1f4fa);
}
.t-dark .bg {
  background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(60, 120, 255, 0.14), transparent 58%),
    linear-gradient(180deg, #111315, #0e1014);
}

.scroll { position: relative; z-index: 1; flex: 1; min-height: 0; }
.safe { padding: 12rpx 28rpx 40rpx; }

.spaceHead {
  display: flex; align-items: center; gap: 12rpx; margin-bottom: 14rpx;
}
.spaceIcon {
  width: 52rpx; height: 52rpx; border-radius: 16rpx; flex-shrink: 0;
  background: rgba(46, 99, 255, 0.1);
  display: flex; align-items: center; justify-content: center;
  font-size: 26rpx; font-weight: 720; color: rgba(46, 99, 255, 0.96);
}
.spaceCopy { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2rpx; }
.spaceName { font-size: 24rpx; font-weight: 740; color: rgba(16, 24, 40, 0.92); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.t-dark .spaceName { color: rgba(245, 247, 255, 0.92); }
.spaceMeta { font-size: 19rpx; color: rgba(16, 24, 40, 0.48); }
.t-dark .spaceMeta { color: rgba(245, 247, 255, 0.42); }
.infoBtn {
  width: 40rpx; height: 40rpx; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(16, 24, 40, 0.04);
}
.infoText { font-size: 18rpx; font-weight: 760; font-style: italic; color: rgba(16, 24, 40, 0.45); }

.section { padding-top: 2rpx; }
.section.divided { margin-top: 22rpx; padding-top: 20rpx; border-top: 1rpx solid rgba(16, 24, 40, 0.08); }
.t-dark .section.divided { border-top-color: rgba(255, 255, 255, 0.08); }
.sectionHead { display: flex; align-items: center; justify-content: space-between; padding: 0 4rpx 12rpx; }
.sectionLabel { font-size: 22rpx; font-weight: 700; color: rgba(16, 24, 40, 0.58); }
.t-dark .sectionLabel { color: rgba(245, 247, 255, 0.52); }
.sectionCount { font-size: 20rpx; font-weight: 700; color: rgba(16, 24, 40, 0.38); }

.commentsEmpty { padding: 8rpx 4rpx 12rpx; }
.commentsEmptyText { font-size: 21rpx; color: rgba(16, 24, 40, 0.45); }
.t-dark .commentsEmptyText { color: rgba(245, 247, 255, 0.4); }

.commentList { display: flex; flex-direction: column; gap: 0; margin-bottom: 12rpx; }
.commentRow {
  display: flex; align-items: flex-start; gap: 12rpx;
  padding: 12rpx 0; border-bottom: 1rpx solid rgba(16, 24, 40, 0.05);
}
.commentRow:last-child { border-bottom: none; }
.t-dark .commentRow { border-bottom-color: rgba(255, 255, 255, 0.05); }
.commentAvatar {
  width: 48rpx; height: 48rpx; border-radius: 50%; flex-shrink: 0;
  background: rgba(46, 99, 255, 0.14);
  display: flex; align-items: center; justify-content: center;
  color: rgba(46, 99, 255, 0.96); font-size: 17rpx; font-weight: 760;
}
.commentBody { flex: 1; min-width: 0; }
.commentAuthor { font-size: 19rpx; font-weight: 720; color: rgba(46, 99, 255, 0.92); display: block; }
.commentText { display: block; margin-top: 4rpx; font-size: 22rpx; line-height: 1.45; color: rgba(16, 24, 40, 0.82); }
.t-dark .commentText { color: rgba(245, 247, 255, 0.82); }

.replyRow { display: flex; gap: 8rpx; }
.replyInput {
  flex: 1; height: 74rpx; border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.7); border: 1rpx solid rgba(16, 24, 40, 0.06);
  padding: 0 14rpx; font-size: 22rpx; color: rgba(16, 24, 40, 0.92);
}
.t-dark .replyInput { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.06); color: rgba(245, 247, 255, 0.92); }
.placeholder { color: rgba(16, 24, 40, 0.35); }
.replySend {
  width: 110rpx; height: 74rpx; border-radius: 18rpx;
  background: linear-gradient(180deg, #5a8eff, #2e63ff);
  display: flex; align-items: center; justify-content: center;
}
.replySendText { font-size: 21rpx; font-weight: 720; color: #fff; }
.gap { height: 24rpx; }
</style>
