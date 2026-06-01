<template>
  <view class="overlay" :class="[themeClass, { show: open }]" @tap="close">
    <view class="sheet" @tap.stop @touchstart="onTouchStart" @touchend="onTouchEnd">
      <view class="searchBar">
        <view class="searchIcon" aria-hidden="true">
          <view class="searchRing" />
          <view class="searchHandle" />
        </view>
        <input
          class="searchInput"
          :value="safeQuery"
          :focus="open"
          confirm-type="search"
          placeholder="Search tasks, notices, members…"
          placeholder-class="placeholder"
          @input="onInput"
        />
        <view v-if="safeQuery" class="iconBtn" role="button" aria-label="Clear" @tap="clearText">
          <text class="iconBtnText">Clear</text>
        </view>
        <view v-else class="iconBtn" role="button" aria-label="Close" @tap="close">
          <text class="iconBtnText">Close</text>
        </view>
      </view>

      <scroll-view class="body" scroll-y :show-scrollbar="false">
        <view v-if="!safeQuery && recent.length" class="block">
          <view class="blockHead">
            <text class="label">Recent</text>
            <text class="link" role="button" @tap="clearRecent">Clear</text>
          </view>
          <view class="chips">
            <view v-for="item in recent" :key="item" class="chip" role="button" @tap="setQuery(item)">
              <text class="chipText">{{ item }}</text>
            </view>
          </view>
        </view>

        <template v-if="hasResults">
          <view v-if="resultTasks.length" class="block">
            <text class="label">Tasks</text>
            <view v-for="x in resultTasks.slice(0, 4)" :key="x.id" class="row" role="button" @tap="openTask(x)">
              <text class="rowTitle" :number-of-lines="1">{{ x.title }}</text>
              <text class="rowMeta">{{ x.deadline }}</text>
            </view>
          </view>

          <view v-if="resultCommunities.length" class="block">
            <text class="label">Communities</text>
            <view v-for="x in resultCommunities.slice(0, 3)" :key="x.id" class="row" role="button" @tap="openCommunity(x)">
              <text class="rowTitle" :number-of-lines="1">{{ x.name }}</text>
              <text class="rowMeta">{{ x.desc }}</text>
            </view>
          </view>

          <view v-if="resultMembers.length" class="block">
            <text class="label">Members</text>
            <view v-for="x in resultMembers.slice(0, 3)" :key="x.id" class="row" role="button" @tap="openMember(x)">
              <text class="rowTitle">{{ x.name }}</text>
              <text class="rowMeta">{{ x.mbti }}</text>
            </view>
          </view>

          <view v-if="resultNotifications.length" class="block">
            <text class="label">Notifications</text>
            <view v-for="x in resultNotifications.slice(0, 3)" :key="x.id" class="row" role="button" @tap="openNotice(x)">
              <text class="rowTitle" :number-of-lines="1">{{ x.title }}</text>
              <text class="rowMeta">{{ x.type }}</text>
            </view>
          </view>

          <view v-if="resultResources.length" class="block">
            <text class="label">Resources</text>
            <view v-for="x in resultResources.slice(0, 3)" :key="x.id" class="row" role="button" @tap="openResource(x)">
              <text class="rowTitle" :number-of-lines="1">{{ x.title }}</text>
              <text class="rowMeta">{{ x.type }}</text>
            </view>
          </view>
        </template>

        <view v-else-if="safeQuery" class="hint">
          <text class="hintText">No results</text>
        </view>

        <view v-else-if="!recent.length" class="hint">
          <text class="hintText">Type to search</text>
        </view>

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
.overlay {
  position: fixed;
  inset: 0;
  z-index: 110;
  opacity: 0;
  pointer-events: none;
  transition: opacity 240ms ease;
  background: rgba(12, 18, 34, 0.32);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
.overlay.t-dark { background: rgba(0, 0, 0, 0.5); }
.overlay.show { opacity: 1; pointer-events: auto; }

.sheet {
  position: absolute;
  left: 16rpx;
  right: 16rpx;
  top: calc(var(--shell-header-offset, 148rpx) + 12rpx);
  bottom: calc(12rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.92);
  border: 1rpx solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 32rpx 96rpx rgba(8, 12, 24, 0.2);
  transform: translateY(16rpx);
  transition: transform 280ms cubic-bezier(0.2, 0.7, 0.1, 1);
  overflow: hidden;
}
.t-dark .sheet {
  background: #1a1d21;
  border-color: rgba(255, 255, 255, 0.06);
  box-shadow: 0 32rpx 96rpx rgba(0, 0, 0, 0.5);
}
.overlay.show .sheet { transform: translateY(0); }

.searchBar {
  flex-shrink: 0;
  margin: 14rpx 14rpx 10rpx;
  padding: 12rpx 14rpx;
  border-radius: 20rpx;
  background: rgba(16, 24, 40, 0.04);
  border: 1rpx solid rgba(16, 24, 40, 0.06);
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.t-dark .searchBar {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.06);
}

.searchIcon { position: relative; width: 22rpx; height: 22rpx; flex-shrink: 0; }
.searchRing {
  position: absolute;
  top: 0;
  left: 0;
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  border: 1.6rpx solid rgba(16, 24, 40, 0.52);
}
.t-dark .searchRing { border-color: rgba(245, 247, 255, 0.6); }
.searchHandle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 9rpx;
  height: 1.8rpx;
  background: rgba(16, 24, 40, 0.52);
  border-radius: 999rpx;
  transform: rotate(45deg);
}
.t-dark .searchHandle { background: rgba(245, 247, 255, 0.6); }

.searchInput {
  flex: 1;
  min-width: 0;
  font-size: 26rpx;
  color: rgba(16, 24, 40, 0.9);
}
.t-dark .searchInput { color: #f5f7fa; }
.placeholder { color: rgba(16, 24, 40, 0.35); }
.t-dark .placeholder { color: rgba(245, 247, 255, 0.34); }

.iconBtn {
  flex-shrink: 0;
  padding: 6rpx 10rpx;
  border-radius: 12rpx;
}
.iconBtn:active { background: rgba(16, 24, 40, 0.06); }
.t-dark .iconBtn:active { background: rgba(255, 255, 255, 0.06); }
.iconBtnText {
  font-size: 20rpx;
  font-weight: 640;
  color: rgba(46, 99, 255, 0.92);
}
.t-dark .iconBtnText { color: rgba(170, 200, 255, 0.95); }

.body {
  flex: 1;
  min-height: 0;
  height: 0;
  padding: 0 14rpx;
}

.block { margin-top: 14rpx; }
.blockHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}
.label {
  display: block;
  font-size: 20rpx;
  color: rgba(16, 24, 40, 0.5);
  font-weight: 640;
  margin-bottom: 6rpx;
}
.blockHead .label { margin-bottom: 0; }
.t-dark .label { color: rgba(245, 247, 255, 0.5); }
.link {
  font-size: 18rpx;
  color: rgba(46, 99, 255, 0.92);
}
.t-dark .link { color: rgba(170, 200, 255, 0.95); }

.chips { display: flex; flex-wrap: wrap; gap: 8rpx; }
.chip {
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(16, 24, 40, 0.06);
}
.t-dark .chip { background: rgba(255, 255, 255, 0.06); }
.chipText { font-size: 19rpx; color: rgba(16, 24, 40, 0.72); }
.t-dark .chipText { color: rgba(245, 247, 255, 0.7); }

.row {
  padding: 14rpx 4rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  border-bottom: 1rpx solid rgba(16, 24, 40, 0.06);
}
.t-dark .row { border-bottom-color: rgba(255, 255, 255, 0.06); }
.block .row:last-child { border-bottom: none; }

.rowTitle {
  flex: 1;
  min-width: 0;
  font-size: var(--list-title-size);
  font-weight: 680;
  color: rgba(16, 24, 40, 0.9);
}
.t-dark .rowTitle { color: #f5f7fa; }
.rowMeta {
  font-size: var(--list-meta-size);
  color: rgba(16, 24, 40, 0.5);
  flex-shrink: 0;
}
.t-dark .rowMeta { color: #9aa4b2; }

.hint {
  padding: 48rpx 12rpx;
  display: flex;
  justify-content: center;
}
.hintText {
  font-size: 22rpx;
  color: rgba(16, 24, 40, 0.42);
}
.t-dark .hintText { color: rgba(245, 247, 255, 0.4); }

.bottomGap { height: 24rpx; }
</style>
