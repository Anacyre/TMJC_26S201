<template>
  <view class="overlay" :class="[themeClass, { show: open }]" @tap="close">
    <view class="sheet" @tap.stop @touchstart="onTouchStart" @touchend="onTouchEnd">
      <view class="sheetTop">
        <view class="backWrap" role="button" @tap="close">
          <view class="chev">
            <view class="line a" />
            <view class="line b" />
          </view>
        </view>
        <text class="sheetTitle">Search</text>
        <view class="spacer" />
      </view>
      <view class="searchBar">
        <view class="searchIcon">
          <view class="searchRing" />
          <view class="searchHandle" />
        </view>
        <input
          class="searchInput"
          :value="safeQuery"
          :focus="open"
          confirm-type="search"
          placeholder="Search tasks, notices, members..."
          placeholder-class="placeholder"
          @input="onInput"
        />
        <view v-if="safeQuery" class="clearBtn" role="button" @tap="clearText">
          <text class="clearText">Clear</text>
        </view>
      </view>

      <scroll-view class="body" scroll-y :show-scrollbar="false">
        <view v-if="!safeQuery && recent.length" class="section">
          <view class="sectionHead">
            <text class="title">Recent</text>
            <text class="action" role="button" @tap="clearRecent">Clear</text>
          </view>
          <view class="chips">
            <view v-for="item in recent" :key="item" class="chip" role="button" @tap="setQuery(item)">
              <text class="chipText">{{ item }}</text>
            </view>
          </view>
        </view>

        <view v-if="hasResults" class="resultsWrap">
          <view v-if="resultTasks.length" class="section">
            <text class="title">Tasks</text>
            <view v-for="x in resultTasks.slice(0, 4)" :key="x.id" class="row" role="button" @tap="openTask(x)">
              <text class="rowTitle" :number-of-lines="1">{{ x.title }}</text>
              <text class="rowMeta">{{ x.deadline }}</text>
            </view>
          </view>

          <view v-if="resultCommunities.length" class="section">
            <text class="title">Communities</text>
            <view v-for="x in resultCommunities.slice(0, 3)" :key="x.id" class="row" role="button" @tap="openCommunity(x)">
              <text class="rowTitle" :number-of-lines="1">{{ x.name }}</text>
              <text class="rowMeta">{{ x.desc }}</text>
            </view>
          </view>

          <view v-if="resultMembers.length" class="section">
            <text class="title">Members</text>
            <view v-for="x in resultMembers.slice(0, 3)" :key="x.id" class="row" role="button" @tap="openMember(x)">
              <text class="rowTitle">{{ x.name }}</text>
              <text class="rowMeta">{{ x.mbti }}</text>
            </view>
          </view>

          <view v-if="resultNotifications.length" class="section">
            <text class="title">Notifications</text>
            <view v-for="x in resultNotifications.slice(0, 3)" :key="x.id" class="row" role="button" @tap="openNotice(x)">
              <text class="rowTitle" :number-of-lines="1">{{ x.title }}</text>
              <text class="rowMeta">{{ x.type }}</text>
            </view>
          </view>

          <view v-if="resultResources.length" class="section">
            <text class="title">Resources</text>
            <view v-for="x in resultResources.slice(0, 3)" :key="x.id" class="row" role="button" @tap="openResource(x)">
              <text class="rowTitle" :number-of-lines="1">{{ x.title }}</text>
              <text class="rowMeta">{{ x.type }}</text>
            </view>
          </view>
        </view>

        <EmptyState
          v-else-if="safeQuery"
          variant="search"
          title="Nothing found"
          subtitle="Try a different keyword, or check tasks, notices and members."
        />

        <EmptyState
          v-else-if="!recent.length"
          variant="search"
          title="Start typing"
          subtitle="Search across tasks, notices, members, communities and resources."
        />

        <view class="bottomGap" />
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { onHide, onBackPress } from '@dcloudio/uni-app'
import { navTo, pageAnim } from '@/lib/navigation'
import { useGlobalSearch } from '@/composables/useGlobalSearch'
import { useTheme } from '@/composables/useTheme'
import EmptyState from '@/components/EmptyState.vue'

const {
  open,
  query,
  recent,
  resultTasks,
  resultCommunities,
  resultMembers,
  resultNotifications,
  resultResources,
  closeSearch,
  clearRecent,
  setQuery,
} = useGlobalSearch()

const { themeClass } = useTheme()
const touchY = ref(0)

const safeQuery = computed(() => (typeof query.value === 'string' ? query.value : ''))
const hasResults = computed(
  () =>
    resultTasks.value.length ||
    resultCommunities.value.length ||
    resultMembers.value.length ||
    resultNotifications.value.length ||
    resultResources.value.length
)

function close() {
  closeSearch()
}

function onInput(e) {
  setQuery(e.detail?.value || '')
}

function clearText() {
  setQuery('')
}

function openTask(x) {
  close()
  navTo(`/pages/task/detail?id=${encodeURIComponent(x.id)}`, pageAnim.slide)
}

function openNotice(x) {
  close()
  navTo(`/pages/notice/detail?id=${encodeURIComponent(x.id)}`, pageAnim.slide)
}
function openCommunity(x) {
  close()
  navTo(`/pages/community/feed?id=${encodeURIComponent(x.id)}`, pageAnim.slide)
}
function openMember(x) {
  close()
  navTo(`/pages/member/profile?id=${encodeURIComponent(x.id)}`, pageAnim.slide)
}
function openResource(x) {
  close()
  navTo(`/pages/study/detail?id=${encodeURIComponent(x.id)}`, pageAnim.slide)
}
function onTouchStart(e) {
  touchY.value = e.changedTouches?.[0]?.clientY || 0
}
function onTouchEnd(e) {
  const endY = e.changedTouches?.[0]?.clientY || 0
  if (endY - touchY.value > 120) close()
}

onBackPress(() => {
  if (!open.value) return false
  close()
  return true
})

onHide(() => {
  if (open.value) close()
})

function onEsc(event) {
  if (event?.key !== 'Escape') return
  if (!open.value) return
  close()
}

onMounted(() => {
  if (typeof window !== 'undefined') window.addEventListener('keydown', onEsc)
})

onUnmounted(() => {
  if (typeof window !== 'undefined') window.removeEventListener('keydown', onEsc)
})
</script>

<style scoped>
.overlay { position: fixed; inset: 0; z-index: 80; opacity: 0; pointer-events: none; transition: opacity 240ms ease; background: rgba(12, 18, 34, 0.32); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);}
.overlay.t-dark { background: rgba(0,0,0,.5);}
.overlay.show { opacity: 1; pointer-events: auto; }
.sheet { position: absolute; left: 10rpx; right: 10rpx; top: 84rpx; bottom: 10rpx; border-radius: 34rpx; background: rgba(255,255,255,0.84); border:1rpx solid rgba(255,255,255,0.6); box-shadow: 0 40rpx 120rpx rgba(8,12,24,.22); transform: scale(.985) translateY(24rpx); transition: transform 320ms cubic-bezier(.2,.7,.1,1); overflow: hidden; padding-bottom: env(safe-area-inset-bottom);}
.t-dark .sheet { background: #1a1d21; border-color: rgba(255,255,255,.06); box-shadow: 0 40rpx 120rpx rgba(0,0,0,.55);}
.overlay.show .sheet { transform: scale(1) translateY(0);}
.sheetTop{padding:10rpx 18rpx 0;display:flex;align-items:center;gap:8rpx;}
.backWrap{width:64rpx;height:52rpx;display:flex;align-items:center;justify-content:center;border-radius:14rpx;transition:transform 180ms ease, background 180ms ease;}
.backWrap:active{transform:scale(.94);background:rgba(16,24,40,.06);}
.t-dark .backWrap:active{background:rgba(255,255,255,.06);}
.chev{position:relative;width:22rpx;height:26rpx;}
.line{position:absolute;left:4rpx;width:18rpx;height:2.4rpx;border-radius:999rpx;background:rgba(16,24,40,.78);}
.line.a{top:6rpx;transform:rotate(-42deg);transform-origin:left center;}
.line.b{bottom:6rpx;transform:rotate(42deg);transform-origin:left center;}
.t-dark .line{background:rgba(245,247,255,.82);}
.sheetTitle{font-size:21rpx;font-weight:700;color:rgba(16,24,40,.7);letter-spacing:0.3rpx;}
.t-dark .sheetTitle{color:rgba(245,247,255,.7);}
.spacer{width:64rpx;}
.searchBar { margin: 14rpx 18rpx 18rpx; padding: 14rpx 16rpx; border-radius: 22rpx; background: rgba(255,255,255,.7); border: 1rpx solid rgba(18,24,40,.08); display:flex; align-items:center; gap: 12rpx;}
.t-dark .searchBar { background: #23272d; border-color: rgba(255,255,255,.06);}
.searchIcon{position:relative;width:22rpx;height:22rpx;flex-shrink:0;}
.searchRing{position:absolute;top:0;left:0;width:16rpx;height:16rpx;border-radius:50%;border:1.6rpx solid rgba(16,24,40,.52);}
.t-dark .searchRing{border-color:rgba(245,247,255,.6);}
.searchHandle{position:absolute;bottom:0;right:0;width:9rpx;height:1.8rpx;background:rgba(16,24,40,.52);border-radius:999rpx;transform:rotate(45deg);}
.t-dark .searchHandle{background:rgba(245,247,255,.6);}
.searchInput { flex:1; font-size: 26rpx; color: rgba(16,24,40,.9);}
.t-dark .searchInput { color: #f5f7fa;}
.placeholder { color: rgba(16,24,40,.35);}
.t-dark .placeholder { color: rgba(245,247,255,.34);}
.clearBtn { padding: 8rpx 12rpx; border-radius: 999rpx; background: rgba(16,24,40,.06);}
.t-dark .clearBtn { background: rgba(255,255,255,.06);}
.clearText { font-size: 20rpx; color: rgba(16,24,40,.68);}
.t-dark .clearText { color: rgba(245,247,255,.7);}
.body { height: calc(100% - 102rpx); padding: 0 18rpx; }
.resultsWrap{display:flex;flex-direction:column;}
.section { margin-top: 12rpx; padding: 14rpx; border-radius: 22rpx; background: rgba(255,255,255,.62); border: 1rpx solid rgba(16,24,40,.06);}
.t-dark .section { background: rgba(255,255,255,.04); border-color: rgba(255,255,255,.06);}
.sectionHead{display:flex;align-items:center;justify-content:space-between;}
.title { font-size: 20rpx; color: rgba(16,24,40,.56); font-weight:640;}
.t-dark .title { color: rgba(245,247,255,.6);}
.action{font-size:18rpx;color:rgba(46,99,255,.92);}
.t-dark .action{color:rgba(170,200,255,.95);}
.chips { display: flex; flex-wrap: wrap; gap: 8rpx; margin-top: 8rpx;}
.chip { padding: 8rpx 14rpx; border-radius: 999rpx; background: rgba(16,24,40,.06);}
.t-dark .chip { background: rgba(255,255,255,.06);}
.chipText { font-size: 19rpx; color: rgba(16,24,40,.72);}
.t-dark .chipText { color: rgba(245,247,255,.7);}
.row { padding: 10rpx 6rpx; display: flex; align-items: center; justify-content: space-between; gap: 12rpx;}
.rowTitle { flex: 1; min-width: 0; font-size: 22rpx; font-weight: 680; color: rgba(16,24,40,.9);}
.t-dark .rowTitle { color: #f5f7fa;}
.rowMeta { font-size: 19rpx; color: rgba(16,24,40,.52);}
.t-dark .rowMeta { color: #9aa4b2;}
.bottomGap { height: 28rpx; }
</style>
