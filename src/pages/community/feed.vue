<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader nav-mode="back" />

    <PageContent>
      <template #chrome>
    <CommunitySpaceProfile
      v-if="community"
      class="spaceChrome"
      :icon="community.icon"
      :name="community.name"
      :desc="community.desc"
      :post-count="visiblePostsView.length"
      :member-count="memberCount"
      @info="openInfo"
    >
      <view class="filterSeg">
        <view
          v-for="f in ['hot','new','top']"
          :key="f"
          class="segItem"
          :class="{ on: filter === f }"
          role="button"
          @tap="filter = f"
        >
          <text class="segText">{{ filterLabel(f) }}</text>
        </view>
      </view>
    </CommunitySpaceProfile>
      </template>

    <scroll-view class="scroll" scroll-y :show-scrollbar="false">
      <SkeletonList v-if="loading" variant="feed" :count="3" />

      <view v-else-if="!visiblePostsView.length" class="emptyWrap">
        <EmptyState
          variant="posts"
          title="No posts"
          action-label="Post"
          @action="showCreate = true"
        />
      </view>

      <template v-else>
        <view class="postsPanel">
          <view class="panelHead">
            <text class="panelLabel">Posts</text>
            <text class="panelCount">{{ visiblePostsView.length }}</text>
          </view>

          <view v-for="p in visiblePostsView" :key="p.id" class="postWrap" data-reveal-card>
            <SwipeRow
              v-if="canDelete(p)"
              side="right"
              action-style="strip"
              :actions="deleteActions"
              commit-action="delete"
              @action="onDeletePost(p)"
              @commit="onDeletePost(p)"
            >
              <PostListItem :post="p" @open="openPost(p.id)" />
            </SwipeRow>
            <PostListItem v-else :post="p" @open="openPost(p.id)" />
          </view>
        </view>
      </template>
      <view class="gap" />
    </scroll-view>
    </PageContent>

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
        <view class="field">
          <text class="fieldLabel">Content</text>
          <textarea
            class="input area"
            v-model="draft.text"
            :maxlength="TEXT_AREA_MAX_LENGTH"
            auto-height
            placeholder="Write something…"
            placeholder-class="ph"
          />
        </view>
        <view v-if="showPostOptions" class="optionsBlock">
          <view class="field">
            <text class="fieldLabel">Attachment</text>
            <view class="fileRow tap" role="button" @tap="pickAttachment">
              <text class="fileLabel">{{ draft.fileName || 'Choose file' }}</text>
              <text v-if="draft.fileName" class="fileClear" @tap.stop="clearAttachment">Remove</text>
            </view>
          </view>
          <view v-if="draft.previewUrl && draft.isImage" class="previewWrap">
            <image class="previewImg" :src="draft.previewUrl" mode="widthFix" />
          </view>
          <view class="anonRow tap" role="button" @tap="draft.anonymous = !draft.anonymous">
            <view class="check" :class="{ on: draft.anonymous }"><view class="checkDot" /></view>
            <text class="anonText">Anonymous</text>
          </view>
        </view>
        <view class="optionsToggle tap" role="button" @tap="showPostOptions = !showPostOptions">
          <text class="optionsToggleText">{{ showPostOptions ? 'Hide options' : 'More options' }}</text>
        </view>
        <view class="commit tap" :class="{ busy: posting }" role="button" @tap="createPost">
          <text class="commitText">{{ posting ? '…' : 'Post' }}</text>
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
import PageContent from '@/components/PageContent.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import EmptyState from '@/components/EmptyState.vue'
import SkeletonList from '@/components/SkeletonList.vue'
import SwipeRow from '@/components/SwipeRow.vue'
import CommunitySpaceProfile from '@/components/CommunitySpaceProfile.vue'
import PostListItem from '@/components/CommunityPostListItem.vue'
import { useTheme } from '@/composables/useTheme'
import { useCommunityStore } from '@/composables/useCommunityStore'
import { useMemberStore } from '@/composables/useMemberStore'
import { useUserStore } from '@/composables/useUserStore'
import { usePostDelete } from '@/composables/usePostDelete'
import { navSibling } from '@/lib/navigation'
import { toast } from '@/composables/useToast'
import { TEXT_AREA_MAX_LENGTH } from '@/lib/textInput'
import { choosePostFile, isPostImageFile, uploadFile } from '@/api/upload'

const { themeClass } = useTheme()
const { hotPosts, newPosts, topPosts, addPost, loading, getCommunityById } = useCommunityStore()
const { visibleMembers } = useMemberStore()
const { currentUser } = useUserStore()
const { canDelete, confirmDeletePost } = usePostDelete()
const id = ref('')
const community = computed(() => (id.value ? getCommunityById(id.value) : null))
const memberCount = computed(() => visibleMembers.value.length)
const filter = ref('hot')
const showCreate = ref(false)
const showPostOptions = ref(false)
const posting = ref(false)
const deleteActions = [{ id: 'delete', label: 'Delete', icon: 'trash', danger: true }]
const draft = ref({
  text: '',
  anonymous: false,
  file: null,
  fileName: '',
  previewUrl: '',
  isImage: false,
})

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
  navSibling(`/pages/community/post-detail?id=${postId}`)
}

function onDeletePost(p) {
  confirmDeletePost(p)
}

function clearAttachment() {
  draft.value.file = null
  draft.value.fileName = ''
  draft.value.previewUrl = ''
  draft.value.isImage = false
}

async function pickAttachment() {
  try {
    const picked = await choosePostFile()
    draft.value.file = picked
    draft.value.fileName = picked.name || 'file'
    draft.value.isImage = isPostImageFile(picked)
    draft.value.previewUrl = picked.path || ''
  } catch (e) {
    if (String(e?.errMsg || e?.message || '').includes('cancel')) return
    toast.show(e?.message || 'Could not pick file')
  }
}

async function createPost() {
  if (posting.value) return
  if (!draft.value.text.trim()) {
    toast.show('Write something')
    return
  }
  if (!id.value) {
    toast.show('Missing space')
    return
  }

  posting.value = true
  try {
    let image = ''
    let attachment = ''
    let attachmentUrl = ''
    let fileKey = ''

    if (draft.value.file) {
      const up = await uploadFile(draft.value.file, 'post')
      if (up.error) {
        toast.show(up.error.message || 'Upload failed')
        return
      }
      fileKey = up.fileKey || ''
      attachment = up.fileName || draft.value.fileName
      attachmentUrl = up.fileUrl || ''
      if (isPostImageFile(draft.value.file, up.mimeType)) {
        image = up.fileUrl || ''
      }
    }

    const { error } = await addPost({
      communityId: id.value,
      title: draft.value.text.trim(),
      content: draft.value.text.trim(),
      image,
      attachment,
      attachmentUrl,
      fileKey,
      author: currentUser.value.name,
      anonymous: draft.value.anonymous,
    })
    if (error) {
      toast.show(error.message || 'Could not post')
      return
    }
    showCreate.value = false
    showPostOptions.value = false
    draft.value = { text: '', anonymous: false, file: null, fileName: '', previewUrl: '', isImage: false }
    toast.postPublished()
  } finally {
    posting.value = false
  }
}

function openInfo() {
  if (!id.value) return
  navSibling(`/pages/community/info?id=${id.value}`)
}

onLoad((q) => { id.value = q?.id || '' })
</script>

<style scoped>
.page { min-height: 100vh; position: relative; overflow: hidden; display: flex; flex-direction: column; }
.bg { position: absolute; inset: 0; background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(40, 110, 255, 0.16), transparent 60%), linear-gradient(180deg, #f8faff, #f1f4fa); }
.t-dark .bg { background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(60, 120, 255, 0.14), transparent 58%), linear-gradient(180deg, #111315, #0e1014); }

.spaceChrome { margin: 0 28rpx 12rpx; }
.filterSeg {
  display: flex; gap: 6rpx; padding: 4rpx; margin-top: 14rpx;
  background: rgba(16, 24, 40, 0.04); border-radius: 16rpx;
}
.t-dark .filterSeg { background: rgba(255, 255, 255, 0.04); }
.segItem { flex: 1; height: 52rpx; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; }
.segItem.on { background: rgba(255, 255, 255, 0.92); box-shadow: 0 2rpx 8rpx rgba(16, 24, 40, 0.06); }
.t-dark .segItem.on { background: rgba(255, 255, 255, 0.08); box-shadow: none; }
.segText { font-size: 21rpx; font-weight: 660; color: rgba(16, 24, 40, 0.5); }
.segItem.on .segText { color: rgba(46, 99, 255, 0.96); font-weight: 720; }
.t-dark .segText { color: rgba(245, 247, 255, 0.45); }
.t-dark .segItem.on .segText { color: rgba(170, 200, 255, 0.96); }

.scroll { position: relative; z-index: 1; height: calc(100vh - 200rpx); padding: 0 28rpx 60rpx; }
.emptyWrap { padding: 32rpx 0; }
.postsPanel {
  padding: 16rpx 18rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.78);
  border: 1rpx solid rgba(16, 24, 40, 0.05);
}
.t-dark .postsPanel {
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
.postWrap { margin-top: 10rpx; }
.postWrap:first-of-type { margin-top: 0; }
.tap:active { transform: scale(0.985); }
.field { margin-top: 14rpx; }
.fieldLabel {
  display: block;
  margin-bottom: 6rpx;
  font-size: 19rpx;
  font-weight: 680;
  color: rgba(16, 24, 40, 0.45);
}
.t-dark .fieldLabel { color: rgba(245, 247, 255, 0.4); }
.optionsBlock { margin-top: 10rpx; }
.optionsToggle { margin-top: 10rpx; padding: 8rpx 0; }
.optionsToggleText { font-size: 20rpx; font-weight: 660; color: rgba(46, 99, 255, 0.82); }
.t-dark .optionsToggleText { color: rgba(170, 200, 255, 0.82); }
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
.input { width: 100%; min-height: 80rpx; margin-top: 12rpx; padding: 0 16rpx; border-radius: 20rpx; background: rgba(16, 24, 40, 0.04); border: 1rpx solid rgba(16, 24, 40, 0.06); color: rgba(16, 24, 40, 0.92); font-size: 23rpx; box-sizing: border-box; }
.t-dark .input { background: #23272d; border-color: rgba(255, 255, 255, 0.06); color: #f5f7fa; }
.area { min-height: 220rpx; padding-top: 14rpx; }
.ph { color: rgba(16, 24, 40, 0.35); }
.t-dark .ph { color: rgba(245, 247, 255, 0.32); }
.fileRow {
  margin-top: 12rpx;
  min-height: 72rpx;
  padding: 0 16rpx;
  border-radius: 20rpx;
  background: rgba(46, 99, 255, 0.06);
  border: 1rpx dashed rgba(46, 99, 255, 0.22);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}
.fileLabel { flex: 1; font-size: 22rpx; color: rgba(46, 99, 255, 0.9); }
.t-dark .fileLabel { color: rgba(170, 200, 255, 0.92); }
.fileClear { font-size: 20rpx; color: rgba(16, 24, 40, 0.5); }
.t-dark .fileClear { color: rgba(245, 247, 255, 0.5); }
.previewWrap { margin-top: 10rpx; border-radius: 16rpx; overflow: hidden; }
.previewImg { width: 100%; display: block; }
.anonRow { margin-top: 14rpx; display: flex; align-items: center; gap: 10rpx; }
.check { width: 32rpx; height: 32rpx; border-radius: 10rpx; background: rgba(16, 24, 40, 0.06); border: 1rpx solid rgba(16, 24, 40, 0.08); display: flex; align-items: center; justify-content: center; }
.t-dark .check { background: rgba(255, 255, 255, 0.06); border-color: rgba(255, 255, 255, 0.08); }
.check.on { background: rgba(46, 99, 255, 0.14); border-color: rgba(46, 99, 255, 0.24); }
.checkDot { width: 12rpx; height: 12rpx; border-radius: 50%; background: rgba(16, 24, 40, 0.2); transition: background 180ms ease, transform 180ms ease; }
.check.on .checkDot { background: rgba(46, 99, 255, 0.95); transform: scale(1.05); }
.anonText { font-size: 21rpx; color: rgba(16, 24, 40, 0.7); }
.t-dark .anonText { color: rgba(245, 247, 255, 0.7); }
.commit { margin-top: 18rpx; height: 84rpx; border-radius: 22rpx; display: flex; align-items: center; justify-content: center; background: linear-gradient(180deg, #5a8eff, #2e63ff); box-shadow: 0 16rpx 40rpx rgba(46, 99, 255, 0.28); }
.commit.busy { opacity: 0.7; }
.commitText { color: #fff; font-size: 23rpx; font-weight: 720; }
</style>
