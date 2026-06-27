<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader nav-mode="back" />

    <PageContent>
      <template #chrome>
        <view v-if="community" class="filterWrap">
          <view class="spaceHead">
            <view class="spaceIcon">{{ community.icon || '◉' }}</view>
            <view class="spaceCopy">
              <text class="spaceName">{{ community.name }}</text>
              <text class="spaceMeta">{{ visiblePostsView.length }} posts · {{ memberCount }} members</text>
            </view>
            <view class="infoBtn tap" role="button" @tap="openInfo"><text class="infoText">i</text></view>
          </view>

          <CommunityRowLink
            title="Materials"
            :count="spaceMaterialCount || ''"
            show-folder-icon
            @open="openMaterials"
          />

          <CommunitySegTabs v-model="contentTab" :options="contentTabOptions" />

          <view v-if="contentTab === 'posts'" class="filterRow">
            <view class="filterDrop tap" role="button" @tap="sortPickerOpen = true">
              <text class="filterDropText">{{ sortDisplayLabel }}</text>
              <text class="filterChev">▾</text>
            </view>
          </view>
        </view>

        <SelectPickerSheet
          :open="sortPickerOpen"
          :options="sortPickerOptions"
          :selected="sortDisplayLabel"
          kind="filter"
          @close="sortPickerOpen = false"
          @pick="onSortPick"
        />
      </template>

      <scroll-view class="scroll" scroll-y :show-scrollbar="false" :enhanced="true">
        <view class="safe">
          <SkeletonList v-if="listLoading" variant="feed" :count="3" />

          <template v-else-if="contentTab === 'notices'">
            <view v-if="!visibleNotices.length" class="emptyWrap">
              <EmptyState variant="notifications" title="No announcements" />
            </view>
            <view v-else class="list">
              <view class="section">
                <view class="sectionHead">
                  <text class="sectionLabel">Announcements</text>
                  <text class="sectionCount">{{ visibleNotices.length }}</text>
                </view>
                <view class="sectionBody">
                  <view v-for="n in visibleNotices" :key="n.id" v-memo="[n.id, n.read, n.important, n.inPlanner]" data-reveal-card>
                    <NoticeCard :notice="n" @open="openNotice(n)" />
                  </view>
                </view>
              </view>
            </view>
          </template>

          <template v-else>
            <view v-if="!visiblePostsView.length" class="emptyWrap">
              <EmptyState variant="posts" title="No posts" action-label="Post" @action="showCreate = true" />
            </view>
            <view v-else class="list">
              <view class="section">
                <view class="sectionHead">
                  <text class="sectionLabel">Posts</text>
                  <text class="sectionCount">{{ visiblePostsView.length }}</text>
                </view>
                <view class="sectionBody">
                  <view
                    v-for="p in visiblePostsView"
                    :key="p.id"
                    v-memo="[p.id, p.likesCount, p.commentsCount, p.timeLabel, deletablePostIds.has(p.id)]"
                    data-reveal-card
                  >
                    <ContextActionWrap
                      v-if="deletablePostIds.has(p.id)"
                      @activate="onDeletePost(p)"
                    >
                      <PostListItem :post="p" @open="openPost(p.id)" />
                    </ContextActionWrap>
                    <PostListItem v-else :post="p" @open="openPost(p.id)" />
                  </view>
                </view>
              </view>
            </view>
          </template>
        </view>
        <view class="gap" />
      </scroll-view>
    </PageContent>

    <view v-if="contentTab === 'posts'" class="fab" role="button" @tap="showCreate = true" aria-label="New post">
      <view class="plus">
        <view class="hLine" />
        <view class="vLine" />
      </view>
    </view>

    <view class="overlay" :class="{ show: showCreate }" @tap="showCreate = false">
      <view class="sheet" @tap.stop>
        <view class="grabber" />
        <text class="sheetTitle">{{ draft.postType === 'material' ? 'Share material' : 'New post' }}</text>

        <CommunitySegTabs
          v-model="draft.postType"
          :options="postTypeOptions"
          class="typeSeg"
        />

        <view class="field">
          <textarea
            class="input area"
            v-model="draft.text"
            :maxlength="TEXT_AREA_MAX_LENGTH"
            auto-height
            :placeholder="draft.postType === 'material' ? 'Describe this file…' : 'Write something…'"
            placeholder-class="ph"
          />
        </view>
        <view class="optionsBlock">
          <view class="field">
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
        <view class="commit tap" :class="{ busy: posting }" role="button" @tap="createPost">
          <text class="commitText">{{ posting ? '…' : (draft.postType === 'material' ? 'Share' : 'Post') }}</text>
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
import ContextActionWrap from '@/components/ContextActionWrap.vue'
import SelectPickerSheet from '@/components/SelectPickerSheet.vue'
import CommunitySegTabs from '@/components/community/CommunitySegTabs.vue'
import CommunityRowLink from '@/components/community/CommunityRowLink.vue'
import NoticeCard from '@/components/NoticeCard.vue'
import PostListItem from '@/components/CommunityPostListItem.vue'
import { POST_TYPE_MATERIAL, POST_TYPE_REGULAR, isMaterialPost } from '@/lib/communityMaterials'
import { shortTimeLabel } from '@/lib/timeLabel'
import { useTheme } from '@/composables/useTheme'
import { useCommunityStore } from '@/composables/useCommunityStore'
import { useNotificationStore } from '@/composables/useNotificationStore'
import { useMemberStore } from '@/composables/useMemberStore'
import { useUserStore } from '@/composables/useUserStore'
import { usePostDelete } from '@/composables/usePostDelete'
import { navChild, navSibling } from '@/lib/navigation'
import { toast } from '@/composables/useToast'
import { TEXT_AREA_MAX_LENGTH } from '@/lib/textInput'
import { choosePostFile, isPostImageFile, uploadFile } from '@/api/upload'

const { themeClass } = useTheme()
const { posts, getPostsByCommunity, getMaterialPostCount, addPost, loading, getCommunityById, ensurePostsLoaded } = useCommunityStore()
const { loading: noticesLoading, getVisibleNoticesForCommunity, getVisibleNoticeCountForCommunity } = useNotificationStore()
const { visibleMemberCount } = useMemberStore()
const { currentUser } = useUserStore()
const { canDelete, confirmDeletePost } = usePostDelete()

const id = ref('')
const community = computed(() => (id.value ? getCommunityById(id.value) : null))
const memberCount = visibleMemberCount
const filter = ref('hot')
const contentTab = ref('posts')
const sortPickerOpen = ref(false)
const showCreate = ref(false)
const posting = ref(false)
const draft = ref({
  text: '',
  postType: POST_TYPE_REGULAR,
  anonymous: false,
  file: null,
  fileName: '',
  previewUrl: '',
  isImage: false,
})

const sortPickerOptions = ['Hot', 'New', 'Top']
const sortDisplayLabel = computed(() => {
  if (filter.value === 'new') return 'New'
  if (filter.value === 'top') return 'Top'
  return 'Hot'
})

const spaceMaterialCount = computed(() => getMaterialPostCount(id.value))

const noticeCountForTab = computed(() => getVisibleNoticeCountForCommunity(id.value))

const contentTabOptions = computed(() => [
  { id: 'notices', label: 'Notices', count: noticeCountForTab.value || '' },
  { id: 'posts', label: 'Posts', count: visiblePostsView.value.length || '' },
])

const postTypeOptions = [
  { id: POST_TYPE_REGULAR, label: 'Post' },
  { id: POST_TYPE_MATERIAL, label: 'Material' },
]

const visibleNotices = computed(() => {
  if (contentTab.value !== 'notices') return []
  const list = getVisibleNoticesForCommunity(id.value)
  return [...list].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
})

const listLoading = computed(() =>
  contentTab.value === 'notices' ? noticesLoading.value : loading.value
)

const visiblePosts = computed(() => {
  const cid = id.value
  if (!cid) return []
  // Track posts ref so list updates immediately after publish.
  posts.value
  let items = getPostsByCommunity(cid).filter((p) => !isMaterialPost(p))
  if (filter.value === 'hot') {
    items = [...items].sort((a, b) => b.likesCount - a.likesCount)
  } else if (filter.value === 'top') {
    items = [...items].sort((a, b) => b.commentsCount - a.commentsCount)
  }
  return items
})

const visiblePostsView = computed(() =>
  visiblePosts.value.map((p) => ({ ...p, timeLabel: shortTimeLabel(p.createdAt) }))
)

const deletablePostIds = computed(() => {
  const set = new Set()
  for (const p of visiblePosts.value) {
    if (canDelete(p)) set.add(p.id)
  }
  return set
})

function onSortPick(label) {
  const map = { Hot: 'hot', New: 'new', Top: 'top' }
  filter.value = map[label] || 'hot'
  sortPickerOpen.value = false
}

function openPost(postId) {
  navSibling(`/pages/community/post-detail?id=${postId}`)
}

function openNotice(n) {
  navChild(`/pages/notice/detail?id=${encodeURIComponent(n.id)}`)
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
  const isMaterial = draft.value.postType === POST_TYPE_MATERIAL
  if (!isMaterial && !draft.value.text.trim()) {
    toast.show('Write something')
    return
  }
  if (isMaterial && !draft.value.file) {
    toast.show('Choose a file')
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
    let fileSize = 0

    if (draft.value.file) {
      const up = await uploadFile(draft.value.file, 'post')
      if (up.error) {
        toast.show(up.error.message || 'Upload failed')
        return
      }
      fileKey = up.fileKey || ''
      attachment = up.fileName || draft.value.fileName
      attachmentUrl = up.fileUrl || ''
      fileSize = up.fileSize || 0
      if (isPostImageFile(draft.value.file, up.mimeType)) {
        image = up.fileUrl || ''
      }
    }

    const title = draft.value.text.trim() || attachment || 'Material'
    const { error } = await addPost({
      communityId: id.value,
      title,
      content: draft.value.text.trim() || title,
      image,
      attachment,
      attachmentUrl,
      fileKey,
      fileSize,
      postType: isMaterial ? POST_TYPE_MATERIAL : POST_TYPE_REGULAR,
      author: currentUser.value.name,
      anonymous: draft.value.anonymous,
    })
    if (error) {
      toast.show(error.message || 'Could not post')
      return
    }
    showCreate.value = false
    draft.value = {
      text: '',
      postType: POST_TYPE_REGULAR,
      anonymous: false,
      file: null,
      fileName: '',
      previewUrl: '',
      isImage: false,
    }
    if (isMaterial) {
      toast.show('Material shared')
      openMaterials()
    } else {
      toast.postPublished()
    }
  } finally {
    posting.value = false
  }
}

function openMaterials() {
  if (!id.value) return
  navSibling(`/pages/community/materials?communityId=${encodeURIComponent(id.value)}`)
}

function openInfo() {
  if (!id.value) return
  navSibling(`/pages/community/info?id=${id.value}`)
}

onLoad(async (q) => {
  id.value = q?.id || ''
  if (q?.tab === 'notices') contentTab.value = 'notices'
  await ensurePostsLoaded()
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

.filterWrap { padding: 8rpx 28rpx 14rpx; display: flex; flex-direction: column; gap: 10rpx; }
.spaceHead { display: flex; align-items: center; gap: 12rpx; }
.spaceIcon {
  width: 56rpx; height: 56rpx; border-radius: 18rpx; flex-shrink: 0;
  background: rgba(46, 99, 255, 0.1);
  display: flex; align-items: center; justify-content: center;
  font-size: 28rpx; font-weight: 720; color: rgba(46, 99, 255, 0.96);
}
.t-dark .spaceIcon { background: rgba(120, 160, 255, 0.14); color: rgba(170, 200, 255, 0.96); }
.spaceCopy { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2rpx; }
.spaceName {
  font-size: 26rpx; font-weight: 740; color: rgba(16, 24, 40, 0.92);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.t-dark .spaceName { color: rgba(245, 247, 255, 0.92); }
.spaceMeta { font-size: 20rpx; color: rgba(16, 24, 40, 0.48); }
.t-dark .spaceMeta { color: rgba(245, 247, 255, 0.42); }
.infoBtn {
  width: 44rpx; height: 44rpx; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(16, 24, 40, 0.04);
}
.t-dark .infoBtn { background: rgba(255, 255, 255, 0.06); }
.infoText { font-size: 20rpx; font-weight: 760; font-style: italic; color: rgba(16, 24, 40, 0.45); }
.t-dark .infoText { color: rgba(245, 247, 255, 0.45); }

.filterRow { display: flex; gap: 10rpx; }
.filterDrop {
  flex: 1; min-width: 0; min-height: 68rpx; padding: 0 16rpx;
  border-radius: 20rpx; background: rgba(255, 255, 255, 0.72);
  border: 1rpx solid rgba(16, 24, 40, 0.06);
  display: flex; align-items: center; gap: 10rpx;
}
.t-dark .filterDrop { background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.08); }
.filterDrop:active { transform: scale(0.985); background: rgba(46, 99, 255, 0.06); }
.filterDropText { flex: 1; min-width: 0; font-size: 22rpx; font-weight: 660; color: rgba(16, 24, 40, 0.82); }
.t-dark .filterDropText { color: rgba(245, 247, 255, 0.82); }
.filterChev { font-size: 18rpx; color: rgba(16, 24, 40, 0.38); flex-shrink: 0; }
.t-dark .filterChev { color: rgba(245, 247, 255, 0.38); }

.scroll { position: relative; z-index: 1; flex: 1; min-height: 0; }
.safe { padding: 0 28rpx 80rpx; }
.list { display: flex; flex-direction: column; }
.section { padding-top: 2rpx; }
.sectionHead { display: flex; align-items: center; justify-content: space-between; padding: 0 4rpx 12rpx; }
.sectionLabel { font-size: 22rpx; font-weight: 700; color: rgba(16, 24, 40, 0.58); }
.t-dark .sectionLabel { color: rgba(245, 247, 255, 0.52); }
.sectionCount { font-size: 20rpx; font-weight: 700; color: rgba(16, 24, 40, 0.38); }
.sectionBody { display: flex; flex-direction: column; gap: var(--list-stack-gap); }
.emptyWrap { padding: 32rpx 0; }
.gap { height: 24rpx; }

.fab {
  position: fixed; right: 28rpx; bottom: calc(60rpx + env(safe-area-inset-bottom));
  width: 96rpx; height: 96rpx; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, 0.78); border: 1rpx solid rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(16px); box-shadow: 0 26rpx 70rpx rgba(12, 20, 40, 0.22); z-index: 35;
}
.t-dark .fab { background: rgba(26, 29, 33, 0.86); border-color: rgba(255, 255, 255, 0.08); }
.fab:active { transform: scale(0.94); }
.plus { position: relative; width: 26rpx; height: 26rpx; }
.hLine, .vLine { position: absolute; background: rgba(46, 99, 255, 0.95); border-radius: 999rpx; }
.hLine { left: 0; right: 0; top: 50%; height: 2.4rpx; margin-top: -1.2rpx; }
.vLine { top: 0; bottom: 0; left: 50%; width: 2.4rpx; margin-left: -1.2rpx; }

.overlay { position: fixed; inset: 0; z-index: 50; opacity: 0; pointer-events: none; background: rgba(8, 12, 24, 0.4); backdrop-filter: blur(12px); transition: opacity 0.22s ease; }
.overlay.show { opacity: 1; pointer-events: auto; }
.sheet { position: absolute; left: 14rpx; right: 14rpx; bottom: 14rpx; padding: 20rpx 22rpx 24rpx; border-radius: 32rpx; background: rgba(255, 255, 255, 0.94); border: 1rpx solid rgba(255, 255, 255, 0.6); }
.t-dark .sheet { background: #1a1d21; border-color: rgba(255, 255, 255, 0.06); }
.grabber { width: 56rpx; height: 6rpx; border-radius: 999rpx; background: rgba(16, 24, 40, 0.12); margin: 0 auto 14rpx; }
.sheetTitle { font-size: 26rpx; font-weight: 740; color: rgba(16, 24, 40, 0.92); }
.t-dark .sheetTitle { color: #f5f7fa; }
.typeSeg { margin-top: 14rpx; }
.field { margin-top: 14rpx; }
.input { width: 100%; min-height: 80rpx; padding: 0 16rpx; border-radius: 20rpx; background: rgba(16, 24, 40, 0.04); border: 1rpx solid rgba(16, 24, 40, 0.06); color: rgba(16, 24, 40, 0.92); font-size: 23rpx; box-sizing: border-box; }
.t-dark .input { background: #23272d; border-color: rgba(255, 255, 255, 0.06); color: #f5f7fa; }
.area { min-height: 220rpx; padding-top: 14rpx; }
.ph { color: rgba(16, 24, 40, 0.35); }
.optionsBlock { margin-top: 10rpx; }
.optionsToggle { margin-top: 10rpx; padding: 8rpx 0; }
.optionsToggleText { font-size: 20rpx; font-weight: 660; color: rgba(46, 99, 255, 0.82); }
.fileRow {
  min-height: 72rpx; padding: 0 16rpx; border-radius: 20rpx;
  background: rgba(46, 99, 255, 0.06); border: 1rpx dashed rgba(46, 99, 255, 0.22);
  display: flex; align-items: center; justify-content: space-between; gap: 12rpx;
}
.fileLabel { flex: 1; font-size: 22rpx; color: rgba(46, 99, 255, 0.9); }
.fileClear { font-size: 20rpx; color: rgba(16, 24, 40, 0.5); }
.previewWrap { margin-top: 10rpx; border-radius: 16rpx; overflow: hidden; }
.previewImg { width: 100%; display: block; }
.anonRow { margin-top: 14rpx; display: flex; align-items: center; gap: 10rpx; }
.check { width: 32rpx; height: 32rpx; border-radius: 10rpx; background: rgba(16, 24, 40, 0.06); border: 1rpx solid rgba(16, 24, 40, 0.08); display: flex; align-items: center; justify-content: center; }
.check.on { background: rgba(46, 99, 255, 0.14); border-color: rgba(46, 99, 255, 0.24); }
.checkDot { width: 12rpx; height: 12rpx; border-radius: 50%; background: rgba(16, 24, 40, 0.2); }
.check.on .checkDot { background: rgba(46, 99, 255, 0.95); }
.anonText { font-size: 21rpx; color: rgba(16, 24, 40, 0.7); }
.commit { margin-top: 18rpx; height: 84rpx; border-radius: 22rpx; display: flex; align-items: center; justify-content: center; background: linear-gradient(180deg, #5a8eff, #2e63ff); box-shadow: 0 16rpx 40rpx rgba(46, 99, 255, 0.28); }
.commit.busy { opacity: 0.7; }
.commitText { color: #fff; font-size: 23rpx; font-weight: 720; }
</style>
