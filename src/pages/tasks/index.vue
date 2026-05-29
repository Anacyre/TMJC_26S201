<template>
  <view class="page" :class="themeClass">
    <view class="bg" />

    <AppHeader />

    <TabPageContent tab-id="tasks">
      <template #chrome>
        <view class="filterWrap">
          <view class="filterRow">
            <view class="filterDrop tap" role="button" @tap="filterPickerOpen = true">
              <text class="filterDropText">{{ filterDisplayLabel }}</text>
              <text class="filterChev">▾</text>
            </view>
            <view class="filterDrop tap" role="button" @tap="sortPickerOpen = true">
              <text class="filterDropText">{{ sortDisplayLabel }}</text>
              <text class="filterChev">▾</text>
            </view>
          </view>
        </view>

        <SelectPickerSheet
          :open="filterPickerOpen"
          :options="filterPickerOptions"
          :selected="filterDisplayLabel"
          kind="filter"
          @close="filterPickerOpen = false"
          @pick="onFilterPick"
        />
        <SelectPickerSheet
          :open="sortPickerOpen"
          :options="sortPickerOptions"
          :selected="sortDisplayLabel"
          kind="tag"
          @close="sortPickerOpen = false"
          @pick="onSortPick"
        />

        <view class="addFab" role="button" @tap="openCreate" aria-label="Add task">
          <view class="plus">
            <view class="hLine" />
            <view class="vLine" />
          </view>
        </view>
      </template>

    <scroll-view class="scroll" scroll-y :show-scrollbar="false" :enhanced="true">
      <view class="safe">
        <SkeletonList v-if="loading" variant="tasks" :count="4" />

        <view v-else-if="!groupedSections.length" class="emptyWrap">
          <EmptyState
            variant="tasks"
            :title="emptyTitle"
            :action-label="showAddAction ? 'Add' : ''"
            @action="openCreate"
          />
        </view>

        <view v-else class="list">
          <view
            v-for="(section, sectionIndex) in groupedSections"
            :key="section.key"
            class="section"
            :class="{ divided: sectionIndex > 0 }"
          >
            <view class="sectionHead tap" role="button" @tap="toggleSection(section.key)">
              <text class="sectionLabel">{{ section.label }}</text>
              <view class="sectionMeta">
                <text class="sectionCount">{{ section.tasks.length }}</text>
                <text class="sectionChev" :class="{ collapsed: isSectionCollapsed(section.key) }">›</text>
              </view>
            </view>
            <view class="sectionBody" :class="{ collapsed: isSectionCollapsed(section.key) }">
              <view
                v-for="t in section.tasks"
                :key="t.id"
                class="taskRow"
                :class="{ completing: completingAnim.has(t.id), expanded: isTaskExpanded(t.id) }"
              >
                <SwipeRow
                  v-if="t.done && !completingIds.has(t.id)"
                  side="left"
                  :actions="taskSwipeActions"
                  commit-action="delete"
                  :context-items="taskContextItems"
                  @commit="deleteTaskRow(t.id)"
                  @action="onTaskSwipeAction(t.id, $event)"
                >
                  <TaskListCard
                    :task="t"
                    :sort-mode="sortMode"
                    :completing="completingAnim.has(t.id)"
                    :pressed="pressedKey === t.id"
                    :expanded="isTaskExpanded(t.id)"
                    @press-start="pressedKey = t.id"
                    @press-end="pressedKey = ''"
                    @open="openTask(t)"
                    @toggle="toggleDone(t)"
                    @toggle-step="toggleStep(t.id, $event)"
                    @expand-change="onTaskExpand(t.id, $event)"
                  />
                </SwipeRow>
                <TaskListCard
                  v-else
                  :task="t"
                  :sort-mode="sortMode"
                  :completing="completingAnim.has(t.id)"
                  :pressed="pressedKey === t.id"
                  :expanded="isTaskExpanded(t.id)"
                  @press-start="pressedKey = t.id"
                  @press-end="pressedKey = ''"
                  @open="openTask(t)"
                  @toggle="toggleDone(t)"
                  @toggle-step="toggleStep(t.id, $event)"
                  @expand-change="onTaskExpand(t.id, $event)"
                />
              </view>
            </view>
          </view>
        </view>

        <view class="spacer" />
      </view>
    </scroll-view>
    </TabPageContent>

    <BottomNav active="tasks" />
    <TaskEditorSheet ref="createEditorRef" v-model="createOpen" mode="create" :task="emptyTask" @save="createTask" />
    <GlobalSearchOverlay />
  </view>
</template>

<script setup>
import { computed, ref, nextTick } from 'vue'
import BottomNav from '@/components/BottomNav.vue'
import TabPageContent from '@/components/TabPageContent.vue'
import AppHeader from '@/components/AppHeader.vue'
import TaskEditorSheet from '@/components/TaskEditorSheet.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import EmptyState from '@/components/EmptyState.vue'
import SwipeRow from '@/components/SwipeRow.vue'
import TaskListCard from '@/components/TaskListCard.vue'
import SkeletonList from '@/components/SkeletonList.vue'
import SelectPickerSheet from '@/components/SelectPickerSheet.vue'
import { useTheme } from '@/composables/useTheme'
import { useTasksStore } from '@/composables/useTasksStore'
import { buildTaskSections, taskDueBucket } from '@/lib/taskDueDate'
import { navChild } from '@/lib/navigation'
import { toast } from '@/composables/useToast'

const { themeClass } = useTheme()
const { tasks, loading, toggleTaskDone, toggleChecklist, addTask, deleteTask, archiveTask, getTaskById } = useTasksStore()

const taskSwipeActions = [
  { id: 'delete', icon: 'trash' },
  { id: 'archive', icon: 'archive' },
]
const taskContextItems = [
  { id: 'delete', label: 'Delete', icon: 'trash', danger: true },
  { id: 'archive', label: 'Archive', icon: 'archive' },
]

const tabItems = [
  { id: '', label: 'All tasks' },
  { id: 'recent', label: 'Recent' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'no-deadline', label: 'No deadline' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'completed', label: 'Done' },
]

const filterPickerOptions = tabItems.map((x) => x.label)
const sortPickerOptions = ['Due date', 'Priority']
const filterLabelById = Object.fromEntries(tabItems.map((x) => [x.id, x.label]))
const filterIdByLabel = Object.fromEntries(tabItems.map((x) => [x.label, x.id]))
const sortLabelByMode = { 'due-date': 'Due date', priority: 'Priority' }
const sortModeByLabel = { 'Due date': 'due-date', Priority: 'priority' }

const COMPLETE_ANIM_MS = 500

const filterTab = ref('')
const filterPickerOpen = ref(false)
const sortPickerOpen = ref(false)
const sortMode = ref('due-date')
const pressedKey = ref('')
const completingIds = ref(new Set())
const completingAnim = ref(new Set())
const completingBuckets = ref(new Map())
const createOpen = ref(false)
const createEditorRef = ref(null)
const collapsedSections = ref(new Set())
const expandedTaskIds = ref({})
const emptyTask = ref({ title: '', description: '', deadline: '', subject: '', priority: 'P2', reminder: '', checklist: [] })

const filterDisplayLabel = computed(() => filterLabelById[filterTab.value] || 'All tasks')
const sortDisplayLabel = computed(() => sortLabelByMode[sortMode.value] || 'Due date')

const tabTasks = computed(() => {
  const pool = tasks.value.filter((x) => x.status !== 'archived')
  return pool.filter((x) => {
    if (completingIds.value.has(x.id)) return true
    if (!filterTab.value) return !x.done
    return taskDueBucket(x) === filterTab.value
  })
})

const groupedSections = computed(() => {
  const items = tabTasks.value
  if (!items.length) return []

  let displayItems = items
  if (completingBuckets.value.size) {
    displayItems = items.map((t) => {
      const bucket = completingBuckets.value.get(t.id)
      if (!bucket || bucket === 'completed') return t
      return {
        ...t,
        done: false,
        status: bucket === 'no-deadline' ? 'recent' : bucket,
      }
    })
  }

  return buildTaskSections(displayItems, sortMode.value)
})

const showAddAction = computed(() => {
  if (!filterTab.value) return true
  return filterTab.value !== 'completed'
})

const emptyTitle = computed(() => {
  if (!filterTab.value) return 'No tasks'
  if (filterTab.value === 'no-deadline') return 'No tasks without deadline'
  if (filterTab.value === 'overdue') return 'Nothing overdue'
  if (filterTab.value === 'completed') return 'No completed tasks'
  if (filterTab.value === 'upcoming') return 'Nothing upcoming'
  if (filterTab.value === 'recent') return 'Nothing recent'
  return 'No matching tasks'
})

function onFilterPick(label) {
  filterTab.value = filterIdByLabel[label] ?? ''
  filterPickerOpen.value = false
}

function onSortPick(label) {
  sortMode.value = sortModeByLabel[label] || 'due-date'
  sortPickerOpen.value = false
}

function isSectionCollapsed(key) {
  return collapsedSections.value.has(key)
}

function toggleSection(key) {
  const next = new Set(collapsedSections.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  collapsedSections.value = next
}

async function toggleStep(taskId, stepId) {
  const before = getTaskById(taskId)
  const wasDone = !!before?.done
  const { data, error } = await toggleChecklist(taskId, stepId)
  if (error) {
    toast.show(error.message || 'Could not update step')
    return
  }
  if (data?.done && !wasDone && willHideOnComplete(data)) {
    beginCompleteHide(before || data)
    delete expandedTaskIds.value[taskId]
    expandedTaskIds.value = { ...expandedTaskIds.value }
    await nextTick()
    requestAnimationFrame(() => startCompleteAnim(taskId))
    setTimeout(() => endCompleteHide(taskId), COMPLETE_ANIM_MS)
  }
}

function isTaskExpanded(id) {
  return !!expandedTaskIds.value[id]
}

function onTaskExpand(taskId, open) {
  const next = { ...expandedTaskIds.value }
  if (open) next[taskId] = true
  else delete next[taskId]
  expandedTaskIds.value = next
}

function willHideOnComplete(task) {
  if (task.done) return false
  if (!filterTab.value) return true
  return filterTab.value !== 'completed'
}

function beginCompleteHide(task) {
  const buckets = new Map(completingBuckets.value)
  buckets.set(task.id, taskDueBucket(task))
  completingBuckets.value = buckets
  completingIds.value = new Set([...completingIds.value, task.id])
}

function startCompleteAnim(id) {
  completingAnim.value = new Set([...completingAnim.value, id])
}

function endCompleteHide(id) {
  const buckets = new Map(completingBuckets.value)
  buckets.delete(id)
  completingBuckets.value = buckets
  const ids = new Set(completingIds.value)
  ids.delete(id)
  completingIds.value = ids
  const anim = new Set(completingAnim.value)
  anim.delete(id)
  completingAnim.value = anim
}

async function toggleDone(t) {
  const willHide = willHideOnComplete(t)
  if (willHide) beginCompleteHide(t)

  const { error } = await toggleTaskDone(t.id)
  if (error) {
    if (willHide) endCompleteHide(t.id)
    toast.show(error.message || 'Could not update task')
    return
  }

  if (willHide) {
    await nextTick()
    requestAnimationFrame(() => startCompleteAnim(t.id))
    setTimeout(() => endCompleteHide(t.id), COMPLETE_ANIM_MS)
  }
}

function openTask(t) {
  navChild(`/pages/task/detail?id=${encodeURIComponent(t.id)}`)
}

function openCreate() {
  createOpen.value = true
}

async function createTask(payload) {
  const { data, error } = await addTask(payload)
  if (!data) {
    toast.show(error?.message || 'Could not create task')
    createEditorRef.value?.resetSaving?.()
    return
  }
  toast.added()
  createOpen.value = false
}

function deleteTaskRow(id) {
  deleteTask(id)
  toast.taskDeleted()
}

function archiveTaskRow(id) {
  archiveTask(id)
  toast.taskArchived()
}

function onTaskSwipeAction(id, actionId) {
  if (actionId === 'archive') archiveTaskRow(id)
  else deleteTaskRow(id)
}
</script>

<style scoped>
.page { min-height: 100vh; position: relative; overflow: hidden; display: flex; flex-direction: column; }
.bg { position: absolute; inset: 0; z-index: 0; background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(40, 110, 255, 0.18), transparent 60%), radial-gradient(900rpx 700rpx at 70% 30%, rgba(120, 180, 255, 0.14), transparent 65%), linear-gradient(180deg, rgba(248, 250, 255, 1), rgba(241, 244, 250, 1)); }
.t-dark .bg { background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(60, 120, 255, 0.14), transparent 58%), radial-gradient(900rpx 700rpx at 70% 30%, rgba(100, 160, 255, 0.08), transparent 62%), linear-gradient(180deg, #111315, #0e1014); }

.scroll { position: relative; z-index: 1; height: calc(100vh - var(--shell-header-offset, 148rpx) - 260rpx); min-height: 300rpx; }
.safe { padding: 0 28rpx 200rpx; }

.filterWrap { padding: 8rpx 28rpx 14rpx; }
.filterRow { display: flex; gap: 10rpx; align-items: stretch; }
.filterDrop {
  flex: 1;
  min-width: 0;
  min-height: 68rpx;
  padding: 0 16rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.72);
  border: 1rpx solid rgba(16, 24, 40, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10rpx;
  transition: transform 150ms ease, background 180ms ease, border-color 180ms ease;
}
.t-dark .filterDrop {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.08);
}
.filterDrop:active { transform: scale(0.985); background: rgba(46, 99, 255, 0.06); border-color: rgba(46, 99, 255, 0.14); }
.filterDropText {
  flex: 1;
  min-width: 0;
  font-size: 22rpx;
  font-weight: 660;
  color: rgba(16, 24, 40, 0.82);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.t-dark .filterDropText { color: rgba(245, 247, 255, 0.82); }
.filterChev {
  flex-shrink: 0;
  font-size: 18rpx;
  color: rgba(16, 24, 40, 0.42);
  line-height: 1;
}
.t-dark .filterChev { color: rgba(245, 247, 255, 0.42); }

.emptyWrap { padding: 24rpx 0 0; }
.list { display: flex; flex-direction: column; }

.section { padding-top: 2rpx; }
.section.divided {
  margin-top: 22rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid rgba(16, 24, 40, 0.08);
}
.t-dark .section.divided { border-top-color: rgba(255, 255, 255, 0.08); }

.sectionHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  padding: 0 4rpx 12rpx;
  min-height: 44rpx;
}
.sectionHead.tap:active { opacity: 0.72; }

.sectionLabel {
  flex: 1;
  min-width: 0;
  font-size: 22rpx;
  font-weight: 700;
  color: rgba(16, 24, 40, 0.58);
  letter-spacing: 0.2rpx;
}
.t-dark .sectionLabel { color: rgba(245, 247, 255, 0.52); }

.sectionMeta {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-shrink: 0;
}
.sectionCount {
  font-size: 20rpx;
  font-weight: 700;
  color: rgba(16, 24, 40, 0.38);
  min-width: 28rpx;
  text-align: right;
}
.t-dark .sectionCount { color: rgba(245, 247, 255, 0.38); }
.sectionChev {
  font-size: 26rpx;
  line-height: 1;
  color: rgba(16, 24, 40, 0.42);
  transform: rotate(-90deg);
  transition: transform 280ms cubic-bezier(0.4, 0, 0.2, 1);
}
.t-dark .sectionChev { color: rgba(245, 247, 255, 0.42); }
.sectionChev.collapsed { transform: rotate(90deg); }

.sectionBody {
  display: flex;
  flex-direction: column;
  gap: var(--list-stack-gap);
  overflow: visible;
  opacity: 1;
  transition:
    max-height 320ms cubic-bezier(0.4, 0, 0.2, 1),
    opacity 260ms ease,
    margin-top 260ms ease;
}
.sectionBody.collapsed {
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  margin-top: 0;
  pointer-events: none;
}

.taskRow {
  overflow: visible;
  transition:
    max-height 500ms cubic-bezier(0.4, 0, 0.2, 1),
    opacity 500ms ease,
    transform 500ms cubic-bezier(0.4, 0, 0.2, 1);
}
.taskRow.completing {
  overflow: hidden;
  max-height: 0;
  opacity: 0;
  transform: scale(0.97) translateY(-6rpx);
  pointer-events: none;
}

.spacer { height: 18rpx; }

.addFab { position: fixed; right: 28rpx; bottom: calc(160rpx + env(safe-area-inset-bottom)); width: 96rpx; height: 96rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.78); border: 1rpx solid rgba(255, 255, 255, 0.6); backdrop-filter: blur(16px); box-shadow: 0 26rpx 70rpx rgba(12, 20, 40, 0.22); z-index: 35; transition: transform 200ms ease, box-shadow 200ms ease; }
.t-dark .addFab { background: rgba(26, 29, 33, 0.86); border-color: rgba(255, 255, 255, 0.08); box-shadow: 0 24rpx 70rpx rgba(0, 0, 0, 0.52); }
.addFab:active { transform: scale(0.94); box-shadow: 0 14rpx 40rpx rgba(12, 20, 40, 0.16); }
.plus { position: relative; width: 26rpx; height: 26rpx; }
.hLine, .vLine { position: absolute; background: rgba(46, 99, 255, 0.95); border-radius: 999rpx; }
.hLine { left: 0; right: 0; top: 50%; height: 2.4rpx; margin-top: -1.2rpx; }
.vLine { top: 0; bottom: 0; left: 50%; width: 2.4rpx; margin-left: -1.2rpx; }
</style>
