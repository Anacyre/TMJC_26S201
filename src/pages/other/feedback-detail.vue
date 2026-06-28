<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader nav-mode="back" />

    <PageContent>
      <scroll-view class="scroll" scroll-y :show-scrollbar="false" :scroll-into-view="scrollInto">
        <view class="safe">
          <ContextActionWrap v-if="thread && canDeleteThread(thread)" @activate="onDeleteThread">
            <view class="head">
              <text class="headTitle">{{ isMaintainer ? thread.userName : 'Your feedback' }}</text>
              <text class="headMeta">{{ shortTimeLabel(thread.createdAt) }} · {{ thread.status === 'resolved' ? 'Resolved' : 'Open' }}</text>
            </view>
          </ContextActionWrap>
          <view v-else-if="thread" class="head">
            <text class="headTitle">{{ isMaintainer ? thread.userName : 'Your feedback' }}</text>
            <text class="headMeta">{{ shortTimeLabel(thread.createdAt) }} · {{ thread.status === 'resolved' ? 'Resolved' : 'Open' }}</text>
          </view>

          <view v-if="!messages.length" class="empty">
            <text class="emptyText">No messages yet.</text>
          </view>

          <view v-else class="thread">
            <view
              v-for="m in messages"
              :key="m.id"
              :id="'msg-' + m.id"
              class="bubbleRow"
              :class="{ mine: m.senderId === currentUserId }"
            >
              <view class="bubble">
                <text v-if="isMaintainer || m.senderId !== currentUserId" class="author">{{ m.senderName }}</text>
                <text class="body">{{ m.body }}</text>
                <text class="time">{{ shortTimeLabel(m.createdAt, { compact: true }) }}</text>
              </view>
            </view>
          </view>
          <view id="thread-end" class="gap" />
        </view>
      </scroll-view>

      <view class="composer">
        <input
          class="input"
          v-model="reply"
          :placeholder="composerPlaceholder"
          placeholder-class="placeholder"
          confirm-type="send"
          @confirm="sendReply"
        />
        <view class="send tap" :class="{ disabled: !canSend }" role="button" @tap="sendReply">
          <text class="sendText">Send</text>
        </view>
      </view>

      <view v-if="isMaintainer && thread?.status === 'open'" class="resolveBar">
        <view class="resolveBtn tap" role="button" @tap="markResolved">
          <text class="resolveText">Mark resolved</text>
        </view>
      </view>
    </PageContent>

    <GlobalSearchOverlay />
  </view>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppHeader from '@/components/AppHeader.vue'
import PageContent from '@/components/PageContent.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import ContextActionWrap from '@/components/ContextActionWrap.vue'
import { useTheme } from '@/composables/useTheme'
import { useFeedbackStore } from '@/composables/useFeedbackStore'
import { currentUser } from '@/composables/useUserStore'
import { toast } from '@/composables/useToast'
import { deleteConfirm } from '@/composables/useConfirmDelete'
import { navBack } from '@/lib/navigation'
import { shortTimeLabel } from '@/lib/timeLabel'

const { themeClass } = useTheme()
const {
  isMaintainer,
  fetchThreads,
  fetchMessages,
  replyFeedback,
  resolveThread,
  deleteThread,
  canDeleteThread,
  getThreadById,
  getMessages,
} = useFeedbackStore()

const threadId = ref('')
const reply = ref('')
const sending = ref(false)
const scrollInto = ref('')

const thread = computed(() => getThreadById(threadId.value))
const messages = computed(() => getMessages(threadId.value))
const currentUserId = computed(() => currentUser.value.id)
const canSend = computed(() => !!reply.value.trim() && !sending.value && thread.value?.status !== 'resolved')
const composerPlaceholder = computed(() => (
  thread.value?.status === 'resolved' ? 'This thread is resolved' : 'Write a reply…'
))

onLoad((q) => {
  threadId.value = String(q?.id || '')
})

onShow(async () => {
  if (!threadId.value) return
  await fetchThreads({ force: true })
  await fetchMessages(threadId.value, { force: true })
  scrollToEnd()
})

function scrollToEnd() {
  nextTick(() => {
    scrollInto.value = ''
    nextTick(() => { scrollInto.value = 'thread-end' })
  })
}

async function sendReply() {
  const body = reply.value.trim()
  if (!body || sending.value || thread.value?.status === 'resolved') return
  sending.value = true
  const { error } = await replyFeedback(threadId.value, body)
  sending.value = false
  if (error) {
    toast.show(error.message || 'Could not send')
    return
  }
  reply.value = ''
  scrollToEnd()
}

async function markResolved() {
  const { error } = await resolveThread(threadId.value)
  if (error) {
    toast.show(error.message || 'Could not resolve')
    return
  }
  toast.show('Marked resolved')
}

async function onDeleteThread() {
  const thread = getThreadById(threadId.value)
  if (!canDeleteThread(thread)) return
  const ok = await deleteConfirm.feedback()
  if (!ok) return
  const { error } = await deleteThread(threadId.value)
  if (error) {
    toast.show(error.message || 'Could not delete')
    return
  }
  toast.show('Feedback deleted')
  navBack()
}
</script>

<style scoped>
.page { min-height: 100vh; position: relative; overflow: hidden; display: flex; flex-direction: column; }
.bg { position: absolute; inset: 0; z-index: 0;
  background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(40, 110, 255, 0.18), transparent 60%),
    linear-gradient(180deg, rgba(248, 250, 255, 1), rgba(241, 244, 250, 1));
}
.t-dark .bg {
  background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(60, 120, 255, 0.14), transparent 58%),
    linear-gradient(180deg, #111315, #0e1014);
}

.scroll { height: calc(100vh - 220rpx); }
.safe { padding: 10rpx 28rpx 28rpx; }
.head { padding: 8rpx 4rpx 24rpx; display: flex; flex-direction: column; gap: 6rpx; }
.headTitle { font-size: 32rpx; font-weight: 720; color: rgba(16,24,40,0.9); }
.t-dark .headTitle { color: rgba(245,247,255,0.92); }
.headMeta { font-size: 22rpx; color: rgba(16,24,40,0.48); }
.t-dark .headMeta { color: rgba(245,247,255,0.45); }

.empty { padding: 40rpx 0; text-align: center; }
.emptyText { font-size: 24rpx; color: rgba(16,24,40,0.45); }
.t-dark .emptyText { color: rgba(245,247,255,0.42); }

.thread { display: flex; flex-direction: column; gap: 18rpx; }
.bubbleRow { display: flex; }
.bubbleRow.mine { justify-content: flex-end; }
.bubble {
  max-width: 82%;
  padding: 18rpx 20rpx;
  border-radius: 22rpx;
  background: rgba(255,255,255,0.78);
  border: 1rpx solid rgba(16,24,40,0.05);
  display: flex; flex-direction: column; gap: 8rpx;
}
.t-dark .bubble { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.06); }
.bubbleRow.mine .bubble { background: rgba(46,99,255,0.12); border-color: rgba(46,99,255,0.18); }
.t-dark .bubbleRow.mine .bubble { background: rgba(120,160,255,0.16); border-color: rgba(120,160,255,0.22); }
.author { font-size: 20rpx; font-weight: 720; color: rgba(46,99,255,0.88); }
.t-dark .author { color: rgba(170,200,255,0.92); }
.body { font-size: 28rpx; line-height: 1.45; color: rgba(16,24,40,0.88); white-space: pre-wrap; }
.t-dark .body { color: rgba(245,247,255,0.9); }
.time { font-size: 18rpx; color: rgba(16,24,40,0.38); align-self: flex-end; }
.t-dark .time { color: rgba(245,247,255,0.38); }

.composer {
  position: fixed;
  left: 28rpx; right: 28rpx;
  bottom: calc(24rpx + env(safe-area-inset-bottom));
  display: flex; align-items: center; gap: 12rpx;
  padding: 12rpx 12rpx 12rpx 20rpx;
  border-radius: 999rpx;
  background: rgba(255,255,255,0.88);
  border: 1rpx solid rgba(16,24,40,0.06);
  box-shadow: 0 20rpx 60rpx rgba(12,20,40,0.08);
  z-index: 5;
}
.t-dark .composer { background: rgba(26,29,33,0.92); border-color: rgba(255,255,255,0.06); }
.input { flex: 1; font-size: 28rpx; color: rgba(16,24,40,0.88); min-height: 48rpx; }
.t-dark .input { color: rgba(245,247,255,0.9); }
.placeholder { color: rgba(16,24,40,0.35); }
.send { padding: 14rpx 22rpx; border-radius: 999rpx; background: rgba(46,99,255,0.92); }
.send.disabled { opacity: 0.45; }
.sendText { font-size: 24rpx; font-weight: 720; color: #fff; }

.resolveBar {
  position: fixed;
  left: 28rpx; right: 28rpx;
  bottom: calc(120rpx + env(safe-area-inset-bottom));
  z-index: 4;
}
.resolveBtn {
  padding: 16rpx 0;
  border-radius: 999rpx;
  background: rgba(16,24,40,0.06);
  text-align: center;
}
.t-dark .resolveBtn { background: rgba(255,255,255,0.06); }
.resolveText { font-size: 24rpx; font-weight: 680; color: rgba(16,24,40,0.72); }
.t-dark .resolveText { color: rgba(245,247,255,0.72); }

.gap { height: 180rpx; }
</style>
