import { computed, reactive, toRefs } from 'vue'

const MAX_HISTORY = 40
const session = reactive({
  draftText: '',
  draftCursor: 0,
  angleMode: 'deg',
  history: [],
})

export function resetCalculatorSession() {
  session.draftText = ''
  session.draftCursor = 0
  session.angleMode = 'deg'
  session.history = []
}

export function useCalculatorSession() {
  const draftText = computed({
    get: () => session.draftText,
    set: (value) => { session.draftText = String(value || '') },
  })

  const draftCursor = computed({
    get: () => session.draftCursor,
    set: (value) => {
      const len = session.draftText.length
      session.draftCursor = Math.max(0, Math.min(Number(value) || 0, len))
    },
  })

  function setDraft(text, cursor = text.length) {
    session.draftText = String(text || '')
    session.draftCursor = Math.max(0, Math.min(cursor, session.draftText.length))
  }

  function setAngleMode(mode) {
    session.angleMode = mode === 'rad' ? 'rad' : 'deg'
  }

  function pushHistory(entry) {
    const expr = String(entry.expression ?? '')
    const result = String(entry.result || '')
    if (!result) return
    const top = session.history[0]
    if (top && top.expression === expr && top.result === result) return
    session.history.unshift({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      expression: expr,
      result,
      at: new Date().toISOString(),
    })
    if (session.history.length > MAX_HISTORY) {
      session.history.length = MAX_HISTORY
    }
  }

  return {
    ...toRefs(session),
    draftText,
    draftCursor,
    setDraft,
    setAngleMode,
    pushHistory,
  }
}
