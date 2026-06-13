<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader nav-mode="back" />

    <PageContent>
      <template #chrome>
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
      </template>

      <scroll-view class="scroll" scroll-y :show-scrollbar="false">
        <SkeletonList v-if="loading" variant="resources" :count="4" />
        <view v-else-if="!resourcesView.length" class="emptyWrap">
          <EmptyState
            variant="resources"
            title="No resources"
            action-label="Upload"
            @action="openUpload"
          />
        </view>
        <view v-else>
          <view v-for="r in resourcesView" :key="r.id" v-memo="[r.id, r.title, r.type, r.timeLabel, r.uploaderName]" class="card tap" role="button" @tap="openDetail(r.id)">
            <view class="head">
              <text class="type">{{ r.type }}</text>
            </view>
            <text class="title">{{ r.title }}</text>
            <text class="meta">{{ r.uploaderName }} · {{ r.timeLabel }}</text>
          </view>
        </view>
        <view class="gap" />
      </scroll-view>
    </PageContent>

    <view class="fab" role="button" @tap="openUpload" aria-label="Upload file">
      <view class="plus">
        <view class="hLine" />
        <view class="vLine" />
      </view>
    </view>

    <view class="overlay" :class="{ show: showUpload }" @tap="showUpload = false">
      <view class="sheet" @tap.stop>
        <view class="grabber" />
        <text class="sheetTitle">Upload resource</text>
        <text class="sheetSub">{{ subject?.name || 'Subject' }}</text>
        <view class="field">
          <input class="input" v-model="uploadDraft.title" placeholder="Title" placeholder-class="ph" />
        </view>
        <view class="pickRow tap" role="button" @tap="pickFile">
          <text class="pickLabel">{{ uploadDraft.fileName || 'Choose file' }}</text>
          <text class="pickAction">Browse</text>
        </view>
        <view class="commit tap" role="button" @tap="submitUpload">
          <text class="commitText">{{ uploading ? 'Uploading…' : 'Upload' }}</text>
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
import { useTheme } from '@/composables/useTheme'
import { useStudyStore } from '@/composables/useStudyStore'
import { shortTimeLabel } from '@/lib/timeLabel'
import { navSibling } from '@/lib/navigation'
import { toast } from '@/composables/useToast'
import { chooseStudyFile, inferResourceType, uploadFile } from '@/api/upload'

const { themeClass } = useTheme()
const { getSubjectById, getResourcesBySubject, loading, uploadResource, ensureResourcesLoaded } = useStudyStore()
const id = ref('')
const showUpload = ref(false)
const uploading = ref(false)
const uploadDraft = ref({ title: '', fileName: '', file: null })
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

function openSubjectNotices() {
  if (!subjectNoticeSlug.value) return
  navSibling(`/pages/notifications/index?subject=${subjectNoticeSlug.value}`)
}

function openDetail(rid) { navSibling(`/pages/study/detail?id=${rid}`) }

function openUpload() {
  uploadDraft.value = {
    title: '',
    fileName: uploadDraft.value.fileName || '',
    file: uploadDraft.value.file || null,
  }
  showUpload.value = true
}

async function pickFile() {
  try {
    const picked = await chooseStudyFile()
    uploadDraft.value.file = picked
    uploadDraft.value.fileName = picked.name || 'Selected file'
    if (!uploadDraft.value.title.trim()) {
      uploadDraft.value.title = (picked.name || 'Untitled').replace(/\.[^.]+$/, '')
    }
  } catch {
    /* cancelled */
  }
}

async function submitUpload() {
  if (!id.value) {
    toast.show('Missing subject')
    return
  }
  if (!uploadDraft.value.title.trim()) {
    toast.show('Title required')
    return
  }
  if (!uploadDraft.value.file) {
    toast.show('Choose a file')
    return
  }
  if (uploading.value) return
  uploading.value = true
  try {
    const upload = await uploadFile(uploadDraft.value.file, 'resource')
    if (upload.error) {
      toast.show(upload.error.message || 'Upload failed')
      return
    }
    const { error } = await uploadResource({
      subjectId: id.value,
      title: uploadDraft.value.title.trim(),
      type: inferResourceType(upload.fileName || uploadDraft.value.fileName),
      fileKey: upload.fileKey,
      fileUrl: upload.fileUrl,
      fileSize: upload.fileSize,
    })
    if (error) {
      toast.show(error.message || 'Could not save resource')
      return
    }
    showUpload.value = false
    uploadDraft.value = { title: '', fileName: '', file: null }
    toast.resourceUploaded()
  } finally {
    uploading.value = false
  }
}

onLoad(async (q) => {
  id.value = q?.id || ''
  await ensureResourcesLoaded()
})
</script>

<style scoped>
.page { min-height: 100vh; position: relative; overflow: hidden; display: flex; flex-direction: column; }
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

.scroll { position: relative; z-index: 1; flex: 1; height: calc(100vh - var(--shell-header-offset, 148rpx) - 108rpx); min-height: 300rpx; padding: 0 28rpx 40rpx; }
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

.fab { position: fixed; right: 28rpx; bottom: calc(60rpx + env(safe-area-inset-bottom)); width: 96rpx; height: 96rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.78); border: 1rpx solid rgba(255, 255, 255, 0.6); backdrop-filter: blur(16px); box-shadow: 0 26rpx 70rpx rgba(12, 20, 40, 0.22); z-index: 35; }
.t-dark .fab { background: rgba(26, 29, 33, 0.86); border-color: rgba(255, 255, 255, 0.08); }
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
.sheetTitle { font-size: 26rpx; font-weight: 740; color: rgba(16, 24, 40, 0.92); }
.t-dark .sheetTitle { color: #f5f7fa; }
.sheetSub { display: block; margin-top: 6rpx; font-size: 20rpx; color: rgba(16, 24, 40, 0.5); }
.t-dark .sheetSub { color: rgba(245, 247, 255, 0.5); }
.field { margin-top: 12rpx; }
.input { width: 100%; min-height: 80rpx; padding: 0 16rpx; border-radius: 20rpx; background: rgba(16, 24, 40, 0.04); border: 1rpx solid rgba(16, 24, 40, 0.06); color: rgba(16, 24, 40, 0.92); font-size: 23rpx; }
.t-dark .input { background: #23272d; border-color: rgba(255, 255, 255, 0.06); color: #f5f7fa; }
.ph { color: rgba(16, 24, 40, 0.35); }
.pickRow { margin-top: 12rpx; min-height: 80rpx; padding: 0 16rpx; border-radius: 20rpx; background: rgba(16, 24, 40, 0.04); border: 1rpx solid rgba(16, 24, 40, 0.06); display: flex; align-items: center; justify-content: space-between; gap: 12rpx; }
.t-dark .pickRow { background: #23272d; border-color: rgba(255, 255, 255, 0.06); }
.pickLabel { flex: 1; min-width: 0; font-size: 23rpx; color: rgba(16, 24, 40, 0.72); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.t-dark .pickLabel { color: rgba(245, 247, 255, 0.72); }
.pickAction { font-size: 21rpx; font-weight: 700; color: rgba(46, 99, 255, 0.96); }
.commit { margin-top: 18rpx; height: 84rpx; border-radius: 22rpx; display: flex; align-items: center; justify-content: center; background: linear-gradient(180deg, #5a8eff, #2e63ff); }
.commitText { color: #fff; font-size: 23rpx; font-weight: 720; }
</style>
