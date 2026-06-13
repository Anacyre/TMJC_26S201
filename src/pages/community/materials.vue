<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader nav-mode="back" />

    <PageContent>
      <template #chrome>
        <view class="filterWrap">
          <view class="filterRow">
            <view class="filterDrop tap" role="button" @tap="communityPickerOpen = true">
              <text class="filterDropText">{{ communityFilterLabel }}</text>
              <text class="filterChev">▾</text>
            </view>
            <view class="filterDrop tap" role="button" @tap="sortPickerOpen = true">
              <text class="filterDropText">{{ sortDisplayLabel }}</text>
              <text class="filterChev">▾</text>
            </view>
          </view>
        </view>

        <SelectPickerSheet
          :open="communityPickerOpen"
          :options="communityPickerOptions"
          :selected="communityFilterLabel"
          kind="tag"
          @close="communityPickerOpen = false"
          @pick="onCommunityPick"
        />
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
          <SkeletonList v-if="loading" variant="feed" :count="4" />

          <view v-else-if="!displayItems.length" class="emptyWrap">
            <EmptyState variant="posts" title="No materials yet" />
          </view>

          <view v-else class="list">
            <view class="section">
              <view class="sectionHead">
                <text class="sectionLabel">Files</text>
                <text class="sectionCount">{{ displayItems.length }}</text>
              </view>
              <view class="sectionBody">
                <CommunityMaterialListItem
                  v-for="item in displayItems"
                  :key="item.id"
                  v-memo="[item.id, item.title, item.timeLabel, item.fileSize]"
                  :post="item"
                  :time-label="item.timeLabel"
                  data-reveal-card
                  @open="openPost(item.id)"
                />
              </view>
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
import EmptyState from '@/components/EmptyState.vue'
import SkeletonList from '@/components/SkeletonList.vue'
import SelectPickerSheet from '@/components/SelectPickerSheet.vue'
import CommunityMaterialListItem from '@/components/CommunityMaterialListItem.vue'
import { useTheme } from '@/composables/useTheme'
import { useCommunityStore } from '@/composables/useCommunityStore'
import { filterMaterialPosts, sortMaterialPosts } from '@/lib/communityMaterials'
import { shortTimeLabel } from '@/lib/timeLabel'
import { navSibling } from '@/lib/navigation'

const { themeClass } = useTheme()
const { posts, sortedCommunities, loading, ensurePostsLoaded } = useCommunityStore()

const presetCommunityId = ref('')
const communityFilter = ref('')
const sortBy = ref('time')
const sortOrder = ref('desc')
const communityPickerOpen = ref(false)
const sortPickerOpen = ref(false)

const communityFilterLabel = computed(() => {
  if (!communityFilter.value) return 'All spaces'
  const c = sortedCommunities.value.find((x) => x.id === communityFilter.value)
  return c?.name || 'All spaces'
})

const communityPickerOptions = computed(() => [
  'All spaces',
  ...sortedCommunities.value.map((c) => c.name),
])

const sortPickerOptions = ['Newest', 'Oldest', 'Largest', 'Smallest']
const sortDisplayLabel = computed(() => {
  if (sortBy.value === 'time') return sortOrder.value === 'desc' ? 'Newest' : 'Oldest'
  return sortOrder.value === 'desc' ? 'Largest' : 'Smallest'
})

const displayItems = computed(() => {
  let items = filterMaterialPosts(posts.value, {
    communityId: communityFilter.value,
  })
  const sorted = sortMaterialPosts(items, {
    sortBy: sortBy.value,
    order: sortOrder.value,
  })
  return sorted.map((p) => ({ ...p, timeLabel: shortTimeLabel(p.createdAt, { compact: true }) }))
})

function onCommunityPick(label) {
  if (label === 'All spaces') {
    communityFilter.value = ''
  } else {
    const c = sortedCommunities.value.find((x) => x.name === label)
    communityFilter.value = c?.id || ''
  }
  communityPickerOpen.value = false
}

function onSortPick(label) {
  const map = {
    Newest: ['time', 'desc'],
    Oldest: ['time', 'asc'],
    Largest: ['size', 'desc'],
    Smallest: ['size', 'asc'],
  }
  const [by, order] = map[label] || ['time', 'desc']
  sortBy.value = by
  sortOrder.value = order
  sortPickerOpen.value = false
}

function openPost(postId) {
  navSibling(`/pages/community/post-detail?id=${postId}`)
}

onLoad(async (q) => {
  presetCommunityId.value = q?.communityId || ''
  communityFilter.value = presetCommunityId.value
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

.filterWrap { padding: 8rpx 28rpx 14rpx; }
.filterRow { display: flex; gap: 10rpx; align-items: stretch; }
.filterDrop {
  flex: 1; min-width: 0; min-height: 68rpx; padding: 0 16rpx;
  border-radius: 20rpx; background: rgba(255, 255, 255, 0.72);
  border: 1rpx solid rgba(16, 24, 40, 0.06);
  display: flex; align-items: center; gap: 10rpx;
}
.t-dark .filterDrop { background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.08); }
.filterDrop:active { transform: scale(0.985); background: rgba(46, 99, 255, 0.06); }
.filterDropText { flex: 1; min-width: 0; font-size: 22rpx; font-weight: 660; color: rgba(16, 24, 40, 0.82); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.t-dark .filterDropText { color: rgba(245, 247, 255, 0.82); }
.filterChev { font-size: 18rpx; color: rgba(16, 24, 40, 0.38); flex-shrink: 0; }
.t-dark .filterChev { color: rgba(245, 247, 255, 0.38); }

.scroll { position: relative; z-index: 1; flex: 1; min-height: 0; }
.safe { padding: 0 28rpx 60rpx; }
.list { display: flex; flex-direction: column; }
.section { padding-top: 2rpx; }
.sectionHead { display: flex; align-items: center; justify-content: space-between; padding: 0 4rpx 12rpx; }
.sectionLabel { font-size: 22rpx; font-weight: 700; color: rgba(16, 24, 40, 0.58); }
.t-dark .sectionLabel { color: rgba(245, 247, 255, 0.52); }
.sectionCount { font-size: 20rpx; font-weight: 700; color: rgba(16, 24, 40, 0.38); }
.sectionBody { display: flex; flex-direction: column; gap: var(--list-stack-gap); }
.emptyWrap { padding: 48rpx 0; }
.gap { height: 32rpx; }
</style>
