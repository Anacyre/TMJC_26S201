<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader />

    <TabPageContent tab-id="other" chrome-only>
      <view class="safe">
        <view class="hero">
          <text class="kicker">{{ isMaintainer ? 'Inbox' : 'Feedback' }}</text>
          <text class="title">{{ heroTitle }}</text>
        </view>

        <view v-if="isMaintainer" class="segRow">
          <view
            v-for="tab in filterTabs"
            :key="tab.id"
            class="segBtn"
            :class="{ on: filter === tab.id }"
            role="button"
            @tap="filter = tab.id"
          >
            <text class="segText">{{ tab.label }}</text>
          </view>
        </view>

        <view v-if="!isMaintainer" class="composeCard">
          <textarea
            class="composeInput"
            v-model="draft"
            placeholder="Share a bug, idea, or concern…"
            placeholder-class="placeholder"
            :maxlength="2000"
            auto-height
          />
          <view class="composeFoot">
            <text class="hint">Only maintainers can read this.</text>
            <view class="sendBtn tap" :class="{ disabled: !draft.trim() || sending }" role="button" @tap="submitFeedback">
              <text class="sendText">{{ sending ? 'Sending…' : 'Send' }}</text>
            </view>
          </view>
        </view>

        <view v-if="!filteredThreads.length" class="emptyWrap">
          <EmptyState
            variant="generic"
            :title="emptyTitle"
            :subtitle="emptySubtitle"
          />
        </view>

        <view v-else class="list">
          <ContextActionWrap
            v-for="t in filteredThreads"
            :key="t.id"
            @activate="onDeleteThread(t)"
          >
            <view
              class="row tap"
              role="button"
              @tap="openThread(t.id)"
            >
              <view class="rowMain">
                <view class="rowHead">
                  <text class="rowTitle">{{ isMaintainer ? t.userName : threadLabel(t) }}</text>
                  <text class="rowTime">{{ shortTimeLabel(t.previewAt || t.updatedAt) }}</text>
                </view>
                <text class="rowPreview" :number-of-lines="2">{{ t.preview || 'No message' }}</text>
              </view>
              <view class="rowMeta">
                <text class="badge" :class="t.status">{{ t.status === 'resolved' ? 'Resolved' : 'Open' }}</text>
              </view>
            </view>
          </ContextActionWrap>
        </view>
      </view>
    </TabPageContent>

    <BottomNav active="other" />
    <GlobalSearchOverlay />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import BottomNav from '@/components/BottomNav.vue'
import TabPageContent from '@/components/TabPageContent.vue'
import AppHeader from '@/components/AppHeader.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import EmptyState from '@/components/EmptyState.vue'
import ContextActionWrap from '@/components/ContextActionWrap.vue'
import { useTheme } from '@/composables/useTheme'
import { useFeedbackStore } from '@/composables/useFeedbackStore'
import { navSibling } from '@/lib/navigation'
import { toast } from '@/composables/useToast'
import { deleteConfirm } from '@/composables/useConfirmDelete'
import { shortTimeLabel } from '@/lib/timeLabel'

const { themeClass } = useTheme()
const {
  threads,
  isMaintainer,
  fetchThreads,
  sendFeedback,
  deleteThread,
  canDeleteThread,
} = useFeedbackStore()

const draft = ref('')
const sending = ref(false)
const filter = ref('open')

const filterTabs = [
  { id: 'open', label: 'Open' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'all', label: 'All' },
]

const heroTitle = computed(() => (
  isMaintainer.value
    ? 'Private feedback from classmates'
    : 'Send private feedback to the maintainers'
))

const filteredThreads = computed(() => {
  if (!isMaintainer.value) return threads.value
  if (filter.value === 'open') return threads.value.filter((t) => t.status === 'open')
  if (filter.value === 'resolved') return threads.value.filter((t) => t.status === 'resolved')
  return threads.value
})

const emptyTitle = computed(() => {
  if (isMaintainer.value && filter.value === 'open') return 'No open feedback'
  if (isMaintainer.value && filter.value === 'resolved') return 'Nothing resolved yet'
  return 'No feedback yet'
})

const emptySubtitle = computed(() => {
  if (isMaintainer.value) return 'New messages from classmates will appear here.'
  return 'Your sent feedback will show up below.'
})

onShow(() => {
  fetchThreads({ force: true })
})

function threadLabel(t) {
  return t.status === 'resolved' ? 'Resolved feedback' : 'Your feedback'
}

function openThread(id) {
  navSibling(`/pages/other/feedback-detail?id=${encodeURIComponent(id)}`)
}

async function onDeleteThread(thread) {
  if (!canDeleteThread(thread)) return
  const ok = await deleteConfirm.feedback()
  if (!ok) return
  const { error } = await deleteThread(thread.id)
  if (error) {
    toast.show(error.message || 'Could not delete')
    return
  }
  toast.show('Feedback deleted')
}

async function submitFeedback() {
  const body = draft.value.trim()
  if (!body || sending.value) return
  sending.value = true
  const { data, error } = await sendFeedback(body)
  sending.value = false
  if (error) {
    toast.show(error.message || 'Could not send')
    return
  }
  draft.value = ''
  toast.show('Feedback sent')
  if (data?.id) openThread(data.id)
}
</script>

<style scoped>
.page { min-height: 100vh; position: relative; overflow: hidden; display: flex; flex-direction: column; }
.bg { position: absolute; inset: 0; z-index: 0;
  background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(40, 110, 255, 0.18), transparent 60%),
    radial-gradient(900rpx 700rpx at 70% 30%, rgba(120, 180, 255, 0.14), transparent 65%),
    linear-gradient(180deg, rgba(248, 250, 255, 1), rgba(241, 244, 250, 1));
}
.t-dark .bg {
  background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(60, 120, 255, 0.14), transparent 58%),
    radial-gradient(900rpx 700rpx at 70% 30%, rgba(100, 160, 255, 0.08), transparent 62%),
    linear-gradient(180deg, #111315, #0e1014);
}

.safe { position: relative; z-index: 1; padding: 10rpx 28rpx 200rpx; }
.hero { display: flex; flex-direction: column; gap: 8rpx; padding: 16rpx 4rpx 22rpx; }
.kicker { font-size: 18rpx; font-weight: 720; color: rgba(46, 99, 255, 0.78); letter-spacing: 1rpx; text-transform: uppercase; }
.t-dark .kicker { color: rgba(170, 200, 255, 0.85); }
.title { font-size: 30rpx; font-weight: 720; color: rgba(16, 24, 40, 0.9); letter-spacing: -0.4rpx; max-width: 620rpx; line-height: 1.35; }
.t-dark .title { color: rgba(245, 247, 255, 0.9); }

.segRow { display: flex; gap: 10rpx; margin-bottom: 18rpx; }
.segBtn { flex: 1; padding: 14rpx 0; border-radius: 999rpx; background: rgba(255,255,255,0.55); border: 1rpx solid rgba(16,24,40,0.05); text-align: center; }
.t-dark .segBtn { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.06); }
.segBtn.on { background: rgba(46,99,255,0.12); border-color: rgba(46,99,255,0.22); }
.segText { font-size: 22rpx; font-weight: 680; color: rgba(16,24,40,0.72); }
.t-dark .segText { color: rgba(245,247,255,0.72); }
.segBtn.on .segText { color: rgba(46,99,255,0.95); }
.t-dark .segBtn.on .segText { color: rgba(170,200,255,0.96); }

.composeCard {
  margin-bottom: 22rpx;
  padding: 22rpx;
  border-radius: var(--list-card-radius);
  background: rgba(255,255,255,0.72);
  border: 1rpx solid rgba(16,24,40,0.05);
}
.t-dark .composeCard { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.06); }
.composeInput { width: 100%; min-height: 140rpx; font-size: 28rpx; line-height: 1.45; color: rgba(16,24,40,0.88); }
.t-dark .composeInput { color: rgba(245,247,255,0.9); }
.placeholder { color: rgba(16,24,40,0.35); }
.t-dark .placeholder { color: rgba(245,247,255,0.35); }
.composeFoot { margin-top: 16rpx; display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }
.hint { font-size: 20rpx; color: rgba(16,24,40,0.45); flex: 1; }
.t-dark .hint { color: rgba(245,247,255,0.42); }
.sendBtn { padding: 14rpx 24rpx; border-radius: 999rpx; background: rgba(46,99,255,0.92); }
.sendBtn.disabled { opacity: 0.45; }
.sendText { font-size: 24rpx; font-weight: 720; color: #fff; }

.emptyWrap { padding-top: 20rpx; }
.list { display: flex; flex-direction: column; gap: var(--list-stack-gap); }
.row {
  display: flex; align-items: flex-start; gap: 16rpx;
  padding: var(--list-card-pad-y) var(--list-card-pad-x);
  border-radius: var(--list-card-radius);
  background: rgba(255,255,255,0.7);
  border: 1rpx solid rgba(16,24,40,0.04);
}
.t-dark .row { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.06); }
.rowMain { flex: 1; min-width: 0; }
.rowHead { display: flex; align-items: baseline; justify-content: space-between; gap: 12rpx; margin-bottom: 8rpx; }
.rowTitle { font-size: var(--list-title-size); font-weight: 720; color: rgba(16,24,40,0.9); }
.t-dark .rowTitle { color: rgba(245,247,255,0.92); }
.rowTime { font-size: 20rpx; color: rgba(16,24,40,0.42); flex-shrink: 0; }
.t-dark .rowTime { color: rgba(245,247,255,0.42); }
.rowPreview { font-size: 24rpx; line-height: 1.45; color: rgba(16,24,40,0.62); }
.t-dark .rowPreview { color: rgba(245,247,255,0.62); }
.badge { font-size: 18rpx; font-weight: 720; padding: 6rpx 12rpx; border-radius: 999rpx; text-transform: capitalize; }
.badge.open { background: rgba(46,99,255,0.12); color: rgba(46,99,255,0.92); }
.badge.resolved { background: rgba(16,24,40,0.08); color: rgba(16,24,40,0.55); }
.t-dark .badge.open { background: rgba(120,160,255,0.16); color: rgba(170,200,255,0.95); }
.t-dark .badge.resolved { background: rgba(255,255,255,0.08); color: rgba(245,247,255,0.55); }
</style>
