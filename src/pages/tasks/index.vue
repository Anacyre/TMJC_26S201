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

        <view v-if="showAddAction" class="addFab" role="button" @tap="openCreate" aria-label="Add task">
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
            data-reveal-card
            :class="{ divided: sectionIndex > 0 }"
          >
            <view class="sectionHead tap" role="button" @tap="toggleSection(section.key)">
              <text class="sectionLabel">{{ section.label }}</text>
              <view class="sectionMeta">
                <text class="sectionCount">{{ section.tasks.length }}</text>
                <text class="sectionChev" :class="{ collapsed: isSectionCollapsed(section.key) }">›</text>
              </view>
            </view>
            <TransitionGroup
              :name="isDoneView ? 'doneReflow' : 'listReflow'"
              tag="view"
              class="sectionBody"
              :class="{ collapsed: isSectionCollapsed(section.key) }"
            >
              <view
                v-for="t in section.tasks"
                :key="t.id"
                class="taskRow"
                :class="{
                  completing: completingAnim.has(t.id),
                  completingStrike: completingStrike.has(t.id),
                  doneLeaving: isDoneView && leavingTaskIds.has(t.id),
                  activeLeaving: !isDoneView && exitingActiveTaskIds.has(t.id),
                  expanded: isTaskExpanded(t.id),
                }"
              >
                <TaskSwipeRow
                  v-if="!completingAnim.has(t.id)"
                  :mode="taskSwipeMode(t)"
                  @commit="onTaskSwipeCommit(t.id, $event)"
                  @action="onTaskSwipeAction(t.id, $event)"
                >
                  <TaskListCard
                    :task="t"
                    :sort-mode="sortMode"
                    :completing="completingStrike.has(t.id) || completingAnim.has(t.id)"
                    :completing-fade="completingAnim.has(t.id)"
                    :pressed="pressedKey === t.id"
                    :expanded="isTaskExpanded(t.id)"
                    @press-start="pressedKey = t.id"
                    @press-end="pressedKey = ''"
                    @open="openTask(t)"
                    @toggle="toggleDone(t)"
                    @toggle-step="toggleStep(t.id, $event)"
                    @expand-change="onTaskExpand(t.id, $event)"
                  />
                </TaskSwipeRow>
                <TaskListCard
                  v-else
                  :task="t"
                  :sort-mode="sortMode"
                  :completing="true"
                  :completing-fade="true"
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
            </TransitionGroup>
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
import { computed, ref, nextTick, TransitionGroup } from 'vue'
import BottomNav from '@/components/BottomNav.vue'
import TabPageContent from '@/components/TabPageContent.vue'
import AppHeader from '@/components/AppHeader.vue'
import TaskEditorSheet from '@/components/TaskEditorSheet.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import EmptyState from '@/components/EmptyState.vue'
import TaskSwipeRow from '@/components/TaskSwipeRow.vue'
import TaskListCard from '@/components/TaskListCard.vue'
import SkeletonList from '@/components/SkeletonList.vue'
import SelectPickerSheet from '@/components/SelectPickerSheet.vue'
import { useTheme } from '@/composables/useTheme'
import { useTasksStore } from '@/composables/useTasksStore'
import {
  buildTaskSections,
  taskDueBucket,
  resolveTaskStatusFromForm,
  taskInDonePool,
  taskIsActiveForTab,
} from '@/lib/taskDueDate'
import { TASK_COMPLETE_STRIKE_MS, TASK_COMPLETE_FADE_MS, DONE_LIST_REFLOW_MS } from '@/lib/taskCompleteAnim'
import { navChild } from '@/lib/navigation'
import { toast } from '@/composables/useToast'
import { pushUndoable } from '@/composables/useUndo'
import { deleteConfirm } from '@/composables/useConfirmDelete'

const { themeClass } = useTheme()
const {
  tasks,
  loading,
  toggleTaskDone,
  toggleChecklist,
  addTask,
  deleteTask,
  archiveTask,
  unarchiveTask,
  getTaskById,
  patchTask,
  fetchTasks,
} = useTasksStore()

const tabItems = [
  { id: '', label: 'All tasks' },
  { id: 'recent', label: 'Recent' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'no-deadline', label: 'No deadline' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'done', label: 'Done' },
]

const filterPickerOptions = tabItems.map((x) => x.label)
const sortPickerOptions = ['Due date', 'Priority']
const filterLabelById = Object.fromEntries(tabItems.map((x) => [x.id, x.label]))
const filterIdByLabel = Object.fromEntries(tabItems.map((x) => [x.label, x.id]))
const sortLabelByMode = { 'due-date': 'Due date', priority: 'Priority' }
const sortModeByLabel = { 'Due date': 'due-date', Priority: 'priority' }

const SWIPE_ACTION_MS = 220

const hiddenTaskIds = ref(new Set())
const leavingTaskIds = ref(new Set())
/** Briefly keep row on active tabs while archive/delete leave anim runs */
const exitingActiveTaskIds = ref(new Set())

const filterTab = ref('')
const isDoneView = computed(() => filterTab.value === 'done')

function taskSwipeMode(task) {
  return task?.status === 'archived' ? 'archived' : 'active'
}
const filterPickerOpen = ref(false)
const sortPickerOpen = ref(false)
const sortMode = ref('due-date')
const pressedKey = ref('')
const completingIds = ref(new Set())
const completingStrike = ref(new Set())
const completingAnim = ref(new Set())
const completingBuckets = ref(new Map())
const createOpen = ref(false)
const createEditorRef = ref(null)
const collapsedSections = ref(new Set())
const expandedTaskIds = ref({})
const emptyTask = ref({ title: '', description: '', deadline: '', subject: '', priority: 'P2', reminder: '', checklist: [] })

const filterDisplayLabel = computed(() => filterLabelById[filterTab.value] || 'All tasks')
const sortDisplayLabel = computed(() => sortLabelByMode[sortMode.value] || 'Due date')

function hideTask(id) {
  hiddenTaskIds.value = new Set([...hiddenTaskIds.value, id])
}

function unhideTask(id) {
  const next = new Set(hiddenTaskIds.value)
  next.delete(id)
  hiddenTaskIds.value = next
}

const tabTasks = computed(() => {
  const pool = tasks.value.filter((x) => !hiddenTaskIds.value.has(x.id))
  if (filterTab.value === 'done') {
    return pool.filter(
      (x) =>
        taskInDonePool(x) ||
        completingIds.value.has(x.id) ||
        leavingTaskIds.value.has(x.id)
    )
  }
  return pool.filter((x) => {
    if (completingIds.value.has(x.id)) return true
    if (exitingActiveTaskIds.value.has(x.id)) return true
    return taskIsActiveForTab(x, filterTab.value)
  })
})

const groupedSections = computed(() => {
  const items = tabTasks.value
  if (!items.length) return []

  let displayItems = items
  if (completingBuckets.value.size) {
    displayItems = items.map((t) => {
      const bucket = completingBuckets.value.get(t.id)
      const striking = completingStrike.value.has(t.id) || completingAnim.value.has(t.id)
      if (!bucket || bucket === 'completed' || bucket === 'archived') {
        return striking ? { ...t, done: true } : t
      }
      return {
        ...t,
        done: striking ? true : false,
        status: bucket === 'no-deadline' ? 'recent' : bucket,
      }
    })
  }

  return buildTaskSections(displayItems, sortMode.value)
})

const showAddAction = computed(() => filterTab.value !== 'done')

const emptyTitle = computed(() => {
  if (!filterTab.value) return 'No tasks'
  if (filterTab.value === 'no-deadline') return 'No tasks without deadline'
  if (filterTab.value === 'overdue') return 'Nothing overdue'
  if (filterTab.value === 'done') return 'No completed tasks'
  if (filterTab.value === 'upcoming') return 'Nothing upcoming'
  if (filterTab.value === 'recent') return 'Nothing recent'
  return 'No matching tasks'
})

function onFilterPick(label) {
  const next = filterIdByLabel[label] ?? ''
  filterTab.value = next
  filterPickerOpen.value = false
  leavingTaskIds.value = new Set()
  exitingActiveTaskIds.value = new Set()
  pressedKey.value = ''
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
  if (data?.done && !wasDone) {
    playTaskCompleteAnimation(taskId, before || data)
  }
}

function parseDeadlineDate(deadline) {
  if (!deadline) return ''
  const iso = String(deadline).match(/(\d{4}-\d{2}-\d{2})/)
  return iso ? iso[1] : ''
}

function taskStatusSnapshot(task) {
  return {
    status: task.status,
    done: task.done,
    completedAt: task.completedAt,
  }
}

/** Unified strike-through then fade-out whenever a task becomes done. */
async function playTaskCompleteAnimation(taskId, task) {
  beginCompleteHide(task)
  delete expandedTaskIds.value[taskId]
  expandedTaskIds.value = { ...expandedTaskIds.value }
  await nextTick()
  setTimeout(() => {
    startCompleteAnim(taskId)
    setTimeout(() => endCompleteHide(taskId), TASK_COMPLETE_FADE_MS)
  }, TASK_COMPLETE_STRIKE_MS)
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

function beginCompleteHide(task) {
  const buckets = new Map(completingBuckets.value)
  buckets.set(task.id, taskDueBucket(task))
  completingBuckets.value = buckets
  completingIds.value = new Set([...completingIds.value, task.id])
  completingStrike.value = new Set([...completingStrike.value, task.id])
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
  const strike = new Set(completingStrike.value)
  strike.delete(id)
  completingStrike.value = strike
}

async function toggleDone(t) {
  const wasDone = !!t.done
  const { error } = await toggleTaskDone(t.id)
  if (error) {
    toast.show(error.message || 'Could not update task')
    return
  }
  if (!wasDone) {
    const after = getTaskById(t.id)
    if (after?.done) await playTaskCompleteAnimation(t.id, t)
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
  toast.taskCreated()
  createOpen.value = false
}

function beginDoneListLeave(id) {
  leavingTaskIds.value = new Set([...leavingTaskIds.value, id])
  nextTick(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        const next = new Set(leavingTaskIds.value)
        next.delete(id)
        leavingTaskIds.value = next
      }, DONE_LIST_REFLOW_MS)
    })
  })
}

function buildRestoredTaskPatch(task) {
  const deadlineDate = parseDeadlineDate(task.deadline)
  return {
    status: resolveTaskStatusFromForm({ deadlineDate, done: false }),
    done: false,
    completedAt: '',
  }
}

function scheduleActiveTabLeave(id, afterLeave) {
  exitingActiveTaskIds.value = new Set([...exitingActiveTaskIds.value, id])
  nextTick(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        afterLeave?.()
        const next = new Set(exitingActiveTaskIds.value)
        next.delete(id)
        exitingActiveTaskIds.value = next
      }, DONE_LIST_REFLOW_MS)
    })
  })
}

async function requestDeleteTask(id) {
  await nextTick()
  const ok = await deleteConfirm.task()
  if (!ok) return
  deleteTaskRow(id)
}

function deleteTaskRow(id) {
  const task = getTaskById(id)
  if (!task) return
  const hide = () => hideTask(id)
  if (filterTab.value === 'done') {
    beginDoneListLeave(id)
    setTimeout(hide, DONE_LIST_REFLOW_MS)
  } else {
    scheduleActiveTabLeave(id, hide)
  }
  pushUndoable({
    message: 'Task deleted',
    menuLabel: `Delete “${task.title || 'Task'}”`,
    undo: () => unhideTask(id),
    commit: async () => {
      unhideTask(id)
      const { error } = await deleteTask(id)
      if (error) toast.show(error.message || 'Could not delete task')
    },
  })
}

function archiveTaskRow(id) {
  const task = getTaskById(id)
  if (!task) return
  const snap = taskStatusSnapshot(task)
  const applyArchive = () =>
    patchTask(id, {
      status: 'archived',
      done: true,
      completedAt: task.completedAt || new Date().toISOString(),
    })

  if (filterTab.value === 'done') {
    beginDoneListLeave(id)
    applyArchive()
  } else {
    scheduleActiveTabLeave(id, applyArchive)
  }

  pushUndoable({
    message: 'Task archived',
    menuLabel: `Archive “${task.title || 'Task'}”`,
    undo: () => {
      const ex = new Set(exitingActiveTaskIds.value)
      ex.delete(id)
      exitingActiveTaskIds.value = ex
      const leaving = new Set(leavingTaskIds.value)
      leaving.delete(id)
      leavingTaskIds.value = leaving
      patchTask(id, snap)
    },
    commit: async () => {
      const { error } = await archiveTask(id)
      if (error) {
        patchTask(id, snap)
        toast.show(error.message || 'Could not archive task')
      }
    },
  })
}

function restoreTaskRow(id) {
  const task = getTaskById(id)
  if (!task) return
  const snap = taskStatusSnapshot(task)
  const restoredPatch = buildRestoredTaskPatch(task)
  patchTask(id, restoredPatch)

  if (filterTab.value === 'done') beginDoneListLeave(id)

  pushUndoable({
    message: 'Task restored',
    menuLabel: `Restore “${task.title || 'Task'}”`,
    undo: () => {
      const leaving = new Set(leavingTaskIds.value)
      leaving.delete(id)
      leavingTaskIds.value = leaving
      patchTask(id, snap)
    },
    commit: async () => {
      const { data, error } = await unarchiveTask(id)
      if (error) {
        patchTask(id, snap)
        toast.show(error.message || 'Could not restore task')
      } else if (data) {
        patchTask(id, { ...data, ...buildRestoredTaskPatch(data) })
      }
    },
  })
}

function onTaskSwipeCommit(id, actionId) {
  if (actionId === 'restore') {
    restoreTaskRow(id)
    return
  }
  if (actionId === 'delete') {
    requestDeleteTask(id)
    return
  }
  setTimeout(() => {
    if (actionId === 'archive') archiveTaskRow(id)
  }, SWIPE_ACTION_MS)
}

function onTaskSwipeAction(id, actionId) {
  if (actionId === 'restore') {
    restoreTaskRow(id)
    return
  }
  if (actionId === 'delete') {
    requestDeleteTask(id)
    return
  }
  setTimeout(() => {
    if (actionId === 'archive') archiveTaskRow(id)
  }, SWIPE_ACTION_MS)
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
  position: relative;
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
  max-height: 800rpx;
  transition:
    max-height 200ms cubic-bezier(0.32, 0.72, 0.28, 1),
    opacity 200ms cubic-bezier(0.4, 0, 0.2, 1),
    transform 200ms cubic-bezier(0.32, 0.72, 0.28, 1),
    margin-bottom 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
.taskRow.doneLeaving,
.taskRow.activeLeaving {
  overflow: hidden;
  max-height: 0 !important;
  opacity: 0;
  margin-bottom: 0 !important;
  transform: scale(0.96) translateY(-8rpx);
  pointer-events: none;
}

.listReflow-move {
  transition: transform 200ms cubic-bezier(0.32, 0.72, 0.28, 1);
}
.listReflow-leave-active {
  position: absolute;
  left: 0;
  right: 0;
  width: 100%;
  z-index: 0;
  transition:
    opacity 200ms cubic-bezier(0.4, 0, 0.2, 1),
    max-height 200ms cubic-bezier(0.4, 0, 0.2, 1),
    margin-bottom 200ms cubic-bezier(0.4, 0, 0.2, 1),
    transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}
.listReflow-leave-to {
  opacity: 0;
  max-height: 0 !important;
  margin-bottom: 0 !important;
  transform: scale(0.96) translateY(-8rpx);
}
.listReflow-leave-from {
  max-height: 800rpx;
}
.taskRow.completingStrike {
  transition: opacity 320ms ease;
}
.taskRow.completing {
  overflow: hidden;
  max-height: 0;
  opacity: 0;
  transform: scale(0.97) translateY(-6rpx);
  pointer-events: none;
  transition:
    max-height 480ms cubic-bezier(0.4, 0, 0.2, 1),
    opacity 480ms ease,
    transform 480ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Done view: FLIP reflow when cards leave (delete / restore) */
.doneReflow-move {
  transition: transform 200ms cubic-bezier(0.32, 0.72, 0.28, 1);
}
.doneReflow-leave-active {
  position: absolute;
  left: 0;
  right: 0;
  width: 100%;
  z-index: 0;
  transition:
    opacity 200ms cubic-bezier(0.4, 0, 0.2, 1),
    max-height 200ms cubic-bezier(0.4, 0, 0.2, 1),
    margin-bottom 200ms cubic-bezier(0.4, 0, 0.2, 1),
    transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}
.doneReflow-leave-to {
  opacity: 0;
  max-height: 0 !important;
  margin-bottom: 0 !important;
  transform: scale(0.96) translateY(-8rpx);
}
.doneReflow-leave-from {
  max-height: 320rpx;
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
