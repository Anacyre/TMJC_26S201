<template>
  <view class="taskEditorRoot">
  <view class="overlay" :class="[themeClass, { show: modelValue }]" @tap="emit('update:modelValue', false)">
    <view class="sheet" @tap.stop>
      <view class="grabber" />
      <view class="head">
        <text class="title">{{ mode === 'create' ? 'New task' : 'Edit task' }}</text>
        <view class="close" role="button" @tap="emit('update:modelValue', false)">
          <view class="closeGlyph"><view /><view /></view>
        </view>
      </view>

      <scroll-view class="body" scroll-y :show-scrollbar="false">
        <view class="field">
          <text class="label">Title</text>
          <input class="input" v-model="form.title" placeholder="What needs to be done?" placeholder-class="placeholder" />
        </view>
        <view class="field">
          <text class="label">Description</text>
          <textarea class="input area" v-model="form.description" placeholder="Add context, links, or notes..." placeholder-class="placeholder" />
        </view>

        <view class="field">
          <text class="label">Subject</text>
          <TagSelect
            v-model="form.subject"
            :options="tagNames"
            :allow-create="isAdmin"
            :can-create="isAdmin"
            kind="subject"
            @create="onCreateTag"
            placeholder="Choose subject"
          />
        </view>

        <view class="grid">
          <view class="field">
            <text class="label">Priority</text>
            <view class="priorityRow">
              <view
                v-for="p in priorities"
                :key="p"
                class="prioChip"
                :class="['p-' + p, { on: form.priority === p }]"
                role="button"
                @tap="form.priority = p"
              >
                <text class="prioText">{{ p }}</text>
              </view>
            </view>
          </view>
          <view class="field">
            <text class="label">Status</text>
            <view class="input picker tap" role="button" @tap="openStatusPicker">
              <text class="pickerText">{{ statusLabel(form.status) }}</text>
              <text class="chevText">&gt;</text>
            </view>
          </view>
        </view>

        <view class="field">
          <view class="labelRow">
            <text class="label">Deadline</text>
            <text class="labelHint">When it must be done</text>
          </view>
          <DateField
            v-model="form.deadlineDate"
            mode="date"
            placeholder="Pick a date"
          />
        </view>

        <view class="field">
          <view class="reminderHead">
            <view class="reminderLeft">
              <text class="label noMargin">Reminder</text>
              <text class="labelHint">When you want a nudge</text>
            </view>
            <view class="toggle" :class="{ on: form.reminderOn }" role="button" @tap="toggleReminder">
              <view class="toggleKnob" />
            </view>
          </view>
          <view v-if="form.reminderOn" class="reminderBody">
            <DateField
              v-model="form.reminderDate"
              mode="date"
              placeholder="Reminder date"
            />
            <DateField
              v-model="form.reminderTime"
              mode="time"
              placeholder="Time (optional)"
            />
          </view>
        </view>

        <view class="field">
          <text class="label">Checklist</text>
          <view v-for="(item, idx) in form.checklist" :key="item.id" class="checkRow">
            <input class="input checkInput" v-model="item.text" :placeholder="`Step ${idx + 1}`" placeholder-class="placeholder" />
            <view class="del" role="button" @tap="removeChecklist(idx)">
              <text class="delText">−</text>
            </view>
          </view>
          <view class="addCheck" role="button" @tap="addChecklist">
            <text class="addCheckText">＋ Add step</text>
          </view>
        </view>

        <view class="gap" />
      </scroll-view>

      <view class="footer">
        <view class="save" :class="{ hit: saving }" role="button" @tap="submit">
          <text class="saveText">{{ mode === 'create' ? 'Create task' : 'Save changes' }}</text>
        </view>
      </view>
    </view>
  </view>

  <SelectPickerSheet
    :open="statusPickerOpen"
    :options="statusLabels"
    :selected="statusLabel(form.status)"
    kind="status"
    @close="statusPickerOpen = false"
    @pick="onStatusPick"
  />
  </view>
</template>

<script setup>
import { computed, reactive, watch, ref } from 'vue'
import DateField from '@/components/DateField.vue'
import TagSelect from '@/components/TagSelect.vue'
import SelectPickerSheet from '@/components/SelectPickerSheet.vue'
import { useTheme } from '@/composables/useTheme'
import { useTagStore } from '@/composables/useTagStore'
import { useUserStore } from '@/composables/useUserStore'
import { isAdminMember } from '@/lib/classMembers'
import { toast } from '@/composables/useToast'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  mode: { type: String, default: 'edit' },
  task: {
    type: Object,
    default: () => ({
      title: '',
      description: '',
      deadline: '',
      subject: '',
      priority: 'P3',
      status: 'today',
      reminder: '',
      checklist: [],
    }),
  },
})

const emit = defineEmits(['update:modelValue', 'save'])

const { themeClass } = useTheme()
const { tagNames, addTag } = useTagStore()
const { currentUser } = useUserStore()
const isAdmin = computed(() => isAdminMember(currentUser.value))

const priorities = ['P1', 'P2', 'P3']
const statuses = ['today', 'upcoming', 'overdue', 'completed']
const saving = ref(false)
const statusPickerOpen = ref(false)
const statusLabels = computed(() => statuses.map(statusLabel))

const form = reactive({
  title: '',
  description: '',
  deadlineDate: '',
  subject: '',
  priority: 'P3',
  status: 'today',
  reminderOn: false,
  reminderDate: '',
  reminderTime: '',
  checklist: [],
})

function statusLabel(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function parseStoredDeadline(raw) {
  if (!raw) return ''
  const iso = String(raw).match(/(\d{4}-\d{2}-\d{2})/)
  if (iso) return iso[1]
  return ''
}

function parseStoredReminder(raw) {
  if (!raw || raw === 'None') return { on: false, date: '', time: '' }
  const datePart = String(raw).match(/(\d{4}-\d{2}-\d{2})/)
  const timePart = String(raw).match(/(\d{2}:\d{2})/)
  return {
    on: !!datePart || !!timePart,
    date: datePart ? datePart[1] : '',
    time: timePart ? timePart[1] : '',
  }
}

function formatDateLabel(value) {
  if (!value) return ''
  const [y, m, d] = value.split('-')
  if (!y) return value
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  if (Number.isNaN(date.getTime())) return value
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return `${weekdays[date.getDay()]} ${months[date.getMonth()]} ${date.getDate()} · ${value}`
}

function syncFromTask() {
  form.title = props.task?.title || ''
  form.description = props.task?.description || ''
  form.deadlineDate = parseStoredDeadline(props.task?.deadline)
  form.subject = props.task?.subject || ''
  form.priority = props.task?.priority || 'P3'
  form.status = props.task?.status || 'today'
  const r = parseStoredReminder(props.task?.reminder)
  form.reminderOn = r.on
  form.reminderDate = r.date
  form.reminderTime = r.time
  form.checklist = (props.task?.checklist || []).map((x, idx) => ({
    id: x.id || `c-${idx}`,
    text: x.text || '',
    done: !!x.done,
  }))
}

// Only hydrate the form when the sheet opens — not on every store refresh.
watch(() => props.modelValue, (open) => {
  if (open) {
    saving.value = false
    syncFromTask()
  }
})

function addChecklist() {
  form.checklist.push({ id: `new-${Date.now().toString(36)}`, text: '', done: false })
}

function removeChecklist(idx) {
  form.checklist.splice(idx, 1)
}

function toggleReminder() {
  form.reminderOn = !form.reminderOn
  if (!form.reminderOn) {
    form.reminderDate = ''
    form.reminderTime = ''
  }
}

function onCreateTag(name) {
  if (!isAdmin.value) return
  addTag(name)
}

function openStatusPicker() {
  statusPickerOpen.value = true
}

function onStatusPick(label) {
  const idx = statusLabels.value.indexOf(label)
  if (idx >= 0) form.status = statuses[idx]
}

function buildDeadlineString() {
  if (!form.deadlineDate) return 'Anytime'
  return `Due ${formatDateLabel(form.deadlineDate)}`
}

function buildReminderString() {
  if (!form.reminderOn) return 'None'
  if (!form.reminderDate && !form.reminderTime) return 'None'
  const parts = []
  if (form.reminderDate) parts.push(formatDateLabel(form.reminderDate))
  if (form.reminderTime) parts.push(`at ${form.reminderTime}`)
  return parts.join(' ')
}

function submit() {
  if (!form.title.trim()) {
    toast.show('Title required')
    return
  }
  if (form.reminderOn && !form.reminderDate) {
    toast.show('Pick reminder date')
    return
  }
  saving.value = true
  emit('save', {
    title: form.title,
    description: form.description,
    deadline: buildDeadlineString(),
    subject: form.subject,
    priority: form.priority,
    status: form.status,
    reminder: buildReminderString(),
    checklist: form.checklist.filter((x) => x.text.trim()),
  })
}
</script>

<style scoped>
.overlay { position: fixed; inset: 0; z-index: 70; opacity: 0; pointer-events: none; background: rgba(8,12,24,.32); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); transition: opacity 240ms ease;}
.overlay.t-dark { background: rgba(0,0,0,.55);}
.overlay.show { opacity: 1; pointer-events: auto;}
.sheet { position: absolute; left: 12rpx; right: 12rpx; bottom: 12rpx; max-height: 90vh; border-radius: 34rpx; background: rgba(255,255,255,.92); border: 1rpx solid rgba(255,255,255,.62); box-shadow: 0 40rpx 120rpx rgba(10,16,30,.22); transform: translateY(22rpx); transition: transform 320ms cubic-bezier(.2,.7,.1,1); overflow: hidden;}
.t-dark .sheet { background: #1a1d21; border-color: rgba(255,255,255,.06); box-shadow: 0 44rpx 132rpx rgba(0,0,0,.55);}
.overlay.show .sheet { transform: translateY(0);}
.grabber { margin: 12rpx auto 0; width: 72rpx; height: 8rpx; border-radius: 999rpx; background: rgba(16,24,40,.18);}
.t-dark .grabber { background: rgba(245,247,255,.2);}
.head { padding: 14rpx 22rpx 10rpx; display: flex; align-items: center; justify-content: space-between;}
.title { font-size: 28rpx; font-weight: 760; color: rgba(16,24,40,.92);}
.t-dark .title { color: #f5f7fa;}
.close { width: 56rpx; height: 56rpx; border-radius: 16rpx; display:flex; align-items:center; justify-content:center; background: rgba(16,24,40,.06);}
.t-dark .close { background: rgba(255,255,255,.06);}
.closeGlyph { position: relative; width: 18rpx; height: 18rpx; }
.closeGlyph view { position: absolute; left: 0; right: 0; top: 50%; height: 2.2rpx; margin-top: -1.1rpx; background: rgba(16,24,40,.7); border-radius: 999rpx; }
.closeGlyph view:first-child { transform: rotate(45deg); }
.closeGlyph view:last-child { transform: rotate(-45deg); }
.t-dark .closeGlyph view { background: rgba(245,247,255,.75);}
.body { max-height: 68vh; padding: 0 22rpx;}
.field { margin-top: 14rpx; display: flex; flex-direction: column; gap: 8rpx; }
.label { font-size: 20rpx; color: rgba(16,24,40,.56); font-weight: 660;}
.t-dark .label { color: rgba(245,247,255,.6);}
.label.noMargin { margin: 0; }
.labelRow { display: flex; align-items: baseline; justify-content: space-between; gap: 10rpx; }
.labelHint { font-size: 18rpx; color: rgba(16,24,40,.4); }
.t-dark .labelHint { color: rgba(245,247,255,.4); }
.input { min-height: 84rpx; border-radius: 22rpx; border: 1rpx solid rgba(16,24,40,.08); background: rgba(255,255,255,.78); padding: 0 16rpx; font-size: 24rpx; color: rgba(16,24,40,.92); transition: border-color 200ms ease, box-shadow 200ms ease, background 200ms ease;}
.t-dark .input { border-color: rgba(255,255,255,.06); background: #23272d; color: #f5f7fa;}
.input:focus { border-color: rgba(46,99,255,.4); box-shadow: 0 0 0 6rpx rgba(46,99,255,.12);}
.area { min-height: 140rpx; padding-top: 18rpx;}
.placeholder { color: rgba(16,24,40,.34);}
.t-dark .placeholder { color: rgba(245,247,255,.32);}
.grid { display: flex; gap: 14rpx; margin-top: 14rpx; }
.grid > .field { flex: 1; margin-top: 0; }
.priorityRow { display: flex; gap: 8rpx; }
.prioChip { flex: 1; height: 72rpx; border-radius: 18rpx; display: flex; align-items: center; justify-content: center; border: 1rpx solid rgba(16,24,40,.08); background: rgba(255,255,255,.62); transition: background 200ms ease, border-color 200ms ease, transform 180ms ease; }
.t-dark .prioChip { background: rgba(255,255,255,.04); border-color: rgba(255,255,255,.06); }
.prioChip:active { transform: scale(0.97); }
.prioText { font-size: 21rpx; font-weight: 720; color: rgba(16,24,40,.6); letter-spacing: 0.3rpx; }
.t-dark .prioText { color: rgba(245,247,255,.6); }
.prioChip.p-P1.on { background: rgba(255,59,48,.12); border-color: rgba(255,59,48,.3); }
.prioChip.p-P1.on .prioText { color: rgba(220,55,45,.96); }
.prioChip.p-P2.on { background: rgba(255,149,0,.12); border-color: rgba(255,149,0,.3); }
.prioChip.p-P2.on .prioText { color: rgba(200,120,0,.96); }
.t-dark .prioChip.p-P2.on .prioText { color: rgba(255,180,80,.96); }
.prioChip.p-P3.on { background: rgba(46,99,255,.12); border-color: rgba(46,99,255,.3); }
.prioChip.p-P3.on .prioText { color: rgba(46,99,255,.96); }
.picker { display: flex; align-items: center; justify-content: space-between; padding-right: 18rpx; }
.picker.tap:active { transform: scale(0.99); }
.pickerText { font-size: 23rpx; font-weight: 700; color: rgba(16,24,40,.86); }
.t-dark .pickerText { color: rgba(245,247,255,.86); }
.chevText { font-size: 18rpx; color: rgba(16,24,40,.5); }
.t-dark .chevText { color: rgba(245,247,255,.5); }
.reminderHead { display: flex; align-items: center; justify-content: space-between; gap: 14rpx; padding: 4rpx 0; }
.reminderLeft { display: flex; flex-direction: column; gap: 4rpx; }
.toggle { width: 70rpx; height: 38rpx; border-radius: 999rpx; background: rgba(16,24,40,.12); border: 1rpx solid rgba(16,24,40,.06); position: relative; transition: background 200ms ease, border-color 200ms ease; }
.t-dark .toggle { background: rgba(245,247,255,.1); border-color: rgba(255,255,255,.08); }
.toggle.on { background: rgba(46,99,255,.42); border-color: rgba(46,99,255,.32); }
.toggleKnob { position: absolute; top: 4rpx; left: 4rpx; width: 28rpx; height: 28rpx; border-radius: 50%; background: rgba(255,255,255,.95); transition: transform 200ms ease; }
.toggle.on .toggleKnob { transform: translateX(30rpx); }
.reminderBody { display: flex; flex-direction: column; gap: 10rpx; margin-top: 4rpx; }
.checkRow { display: flex; gap: 8rpx; margin-top: 8rpx; }
.checkInput { flex: 1; }
.del { width: 74rpx; min-height: 84rpx; border-radius: 22rpx; display: flex; align-items: center; justify-content: center; background: rgba(220,80,80,.08); border: 1rpx solid rgba(220,80,80,.16); }
.delText { font-size: 30rpx; color: rgba(220,80,80,.9); line-height: 1; font-weight: 300; }
.addCheck { margin-top: 12rpx; height: 72rpx; border-radius: 18rpx; border: 1rpx dashed rgba(16,24,40,.18); display: flex; align-items: center; justify-content: center; transition: background 180ms ease; }
.t-dark .addCheck { border-color: rgba(255,255,255,.14); }
.addCheck:active { background: rgba(46,99,255,.04); }
.addCheckText { font-size: 21rpx; color: rgba(46,99,255,.92); font-weight: 660; }
.t-dark .addCheckText { color: rgba(170,200,255,.94); }
.gap { height: 24rpx; }
.footer { padding: 16rpx 22rpx 22rpx; }
.save { height: 92rpx; border-radius: 24rpx; display: flex; align-items: center; justify-content: center; background: linear-gradient(180deg,#5a8eff,#2e63ff); box-shadow: 0 20rpx 60rpx rgba(46,99,255,.30); transition: transform 180ms ease, box-shadow 180ms ease; }
.save.hit { transform: scale(.985); box-shadow: 0 12rpx 36rpx rgba(46,99,255,.26); }
.saveText { font-size: 25rpx; font-weight: 760; color: rgba(255,255,255,.98); letter-spacing: 0.3rpx; }
</style>
