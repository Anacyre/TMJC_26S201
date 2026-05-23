<template>
  <view class="overlay" :class="{ show: modelValue }" @tap="emit('update:modelValue', false)">
    <view class="sheet" @tap.stop>
      <view class="grabber" />
      <view class="head">
        <text class="title">{{ mode === 'create' ? 'Create Task' : 'Edit Task' }}</text>
        <view class="close" role="button" @tap="emit('update:modelValue', false)"><text class="closeText">✕</text></view>
      </view>

      <scroll-view class="body" scroll-y :show-scrollbar="false">
        <view class="field">
          <text class="label">Task Title</text>
          <input class="input" v-model="form.title" placeholder="What needs to be done?" placeholder-class="placeholder" />
        </view>
        <view class="field">
          <text class="label">Description</text>
          <textarea class="input area" v-model="form.description" placeholder="Add context..." placeholder-class="placeholder" />
        </view>
        <view class="grid">
          <view class="field">
            <text class="label">Deadline</text>
            <input class="input" v-model="form.deadline" placeholder="Due 24/5" placeholder-class="placeholder" />
          </view>
          <view class="field">
            <text class="label">Subject Tag</text>
            <input class="input" v-model="form.subject" placeholder="Math" placeholder-class="placeholder" />
          </view>
        </view>
        <view class="grid">
          <view class="field">
            <text class="label">Priority</text>
            <picker :range="priorities" @change="(e) => (form.priority = priorities[e.detail.value])">
              <view class="input picker">{{ form.priority }}</view>
            </picker>
          </view>
          <view class="field">
            <text class="label">Status</text>
            <picker :range="statuses" @change="(e) => (form.status = statuses[e.detail.value])">
              <view class="input picker">{{ form.status }}</view>
            </picker>
          </view>
        </view>
        <view class="field">
          <text class="label">Reminder</text>
          <input class="input" v-model="form.reminder" placeholder="18:30" placeholder-class="placeholder" />
        </view>
        <view class="field">
          <text class="label">Checklist</text>
          <view v-for="(item, idx) in form.checklist" :key="item.id" class="checkRow">
            <input class="input checkInput" v-model="item.text" :placeholder="`Item ${idx + 1}`" placeholder-class="placeholder" />
            <view class="del" role="button" @tap="removeChecklist(idx)"><text class="delText">-</text></view>
          </view>
          <view class="addCheck" role="button" @tap="addChecklist"><text class="addCheckText">+ Add checklist item</text></view>
        </view>
        <view class="gap" />
      </scroll-view>

      <view class="footer">
        <view class="save" :class="{ hit: saving }" role="button" @tap="submit"><text class="saveText">{{ mode === 'create' ? 'Create Task' : 'Save Changes' }}</text></view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { reactive, watch, ref } from 'vue'

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

const priorities = ['P1', 'P2', 'P3']
const statuses = ['today', 'upcoming', 'overdue', 'completed']
const saving = ref(false)

const form = reactive({
  title: '',
  description: '',
  deadline: '',
  subject: '',
  priority: 'P3',
  status: 'today',
  reminder: '',
  checklist: [],
})

function syncFromTask() {
  form.title = props.task?.title || ''
  form.description = props.task?.description || ''
  form.deadline = props.task?.deadline || ''
  form.subject = props.task?.subject || ''
  form.priority = props.task?.priority || 'P3'
  form.status = props.task?.status || 'today'
  form.reminder = props.task?.reminder || ''
  form.checklist = (props.task?.checklist || []).map((x, idx) => ({
    id: x.id || `c-${idx}`,
    text: x.text || '',
    done: !!x.done,
  }))
}

watch(() => props.task, syncFromTask, { immediate: true, deep: true })
watch(() => props.modelValue, (v) => v && syncFromTask())

function addChecklist() {
  form.checklist.push({ id: `new-${Date.now().toString(36)}`, text: '', done: false })
}

function removeChecklist(idx) {
  form.checklist.splice(idx, 1)
}

function submit() {
  if (!form.title.trim()) {
    uni.showToast({ title: 'Title is required', icon: 'none' })
    return
  }
  saving.value = true
  emit('save', {
    title: form.title,
    description: form.description,
    deadline: form.deadline,
    subject: form.subject,
    priority: form.priority,
    status: form.status,
    reminder: form.reminder,
    checklist: form.checklist.filter((x) => x.text.trim()),
  })
  setTimeout(() => {
    saving.value = false
    emit('update:modelValue', false)
  }, 220)
}
</script>

<style scoped>
.overlay { position: fixed; inset: 0; z-index: 70; opacity: 0; pointer-events: none; background: rgba(8,12,24,.32); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); transition: opacity 240ms ease;}
.t-dark .overlay { background: rgba(0,0,0,.55);}
.overlay.show { opacity: 1; pointer-events: auto;}
.sheet { position: absolute; left: 12rpx; right: 12rpx; bottom: 12rpx; max-height: 88vh; border-radius: 34rpx; background: rgba(255,255,255,.86); border: 1rpx solid rgba(255,255,255,.62); box-shadow: 0 40rpx 120rpx rgba(10,16,30,.22); transform: translateY(22rpx); transition: transform 320ms cubic-bezier(.2,.7,.1,1); overflow: hidden;}
.t-dark .sheet { background: #1a1d21; border-color: rgba(255,255,255,.06); box-shadow: 0 44rpx 132rpx rgba(0,0,0,.55);}
.overlay.show .sheet { transform: translateY(0);}
.grabber { margin: 12rpx auto 0; width: 72rpx; height: 8rpx; border-radius: 999rpx; background: rgba(16,24,40,.18);}
.t-dark .grabber { background: rgba(245,247,255,.2);}
.head { padding: 14rpx 18rpx 10rpx; display: flex; align-items: center; justify-content: space-between;}
.title { font-size: 30rpx; font-weight: 760; color: rgba(16,24,40,.92);}
.t-dark .title { color: #f5f7fa;}
.close { width: 56rpx; height: 56rpx; border-radius: 16rpx; display:flex; align-items:center; justify-content:center; background: rgba(16,24,40,.06);}
.t-dark .close { background: rgba(255,255,255,.06);}
.closeText { font-size: 20rpx; color: rgba(16,24,40,.7);}
.t-dark .closeText { color: rgba(245,247,255,.75);}
.body { max-height: 66vh; padding: 0 18rpx;}
.field { margin-top: 12rpx; }
.label { font-size: 20rpx; color: rgba(16,24,40,.56); margin-bottom: 8rpx; display: block; font-weight: 640;}
.t-dark .label { color: rgba(245,247,255,.6);}
.input { min-height: 84rpx; border-radius: 22rpx; border: 1rpx solid rgba(16,24,40,.08); background: rgba(255,255,255,.8); padding: 0 16rpx; font-size: 24rpx; color: rgba(16,24,40,.92); transition: border-color 200ms ease, box-shadow 200ms ease, background 200ms ease;}
.t-dark .input { border-color: rgba(255,255,255,.06); background: #23272d; color: #f5f7fa;}
.input:focus { border-color: rgba(46,99,255,.4); box-shadow: 0 0 0 6rpx rgba(46,99,255,.12);}
.area { min-height: 140rpx; padding-top: 18rpx;}
.placeholder { color: rgba(16,24,40,.34);}
.t-dark .placeholder { color: rgba(245,247,255,.32);}
.grid { display: flex; gap: 12rpx;}
.grid .field { flex: 1; }
.picker { display:flex; align-items:center;}
.checkRow { display:flex; gap: 8rpx; margin-top: 8rpx;}
.checkInput { flex: 1; }
.del { width: 68rpx; border-radius: 18rpx; display:flex; align-items:center; justify-content:center; background: rgba(255,90,90,.1); border: 1rpx solid rgba(255,90,90,.16);}
.delText { font-size: 26rpx; color: rgba(220,80,80,.9);}
.addCheck { margin-top: 10rpx; height: 72rpx; border-radius: 20rpx; border: 1rpx dashed rgba(16,24,40,.2); display:flex; align-items:center; justify-content:center;}
.t-dark .addCheck { border-color: rgba(255,255,255,.16);}
.addCheckText { font-size: 21rpx; color: rgba(16,24,40,.66);}
.t-dark .addCheckText { color: rgba(245,247,255,.7);}
.footer { padding: 14rpx 18rpx 18rpx;}
.save { height: 86rpx; border-radius: 22rpx; display:flex; align-items:center; justify-content:center; background: linear-gradient(180deg,#5a8eff,#2e63ff); box-shadow: 0 20rpx 60rpx rgba(46,99,255,.3); transition: transform 180ms ease, box-shadow 180ms ease;}
.save.hit { transform: scale(.985); box-shadow: 0 12rpx 36rpx rgba(46,99,255,.26);}
.saveText { font-size: 24rpx; font-weight: 760; color: rgba(255,255,255,.96);}
.gap { height: 24rpx; }
</style>
