const sessions = new Map()
let seq = 0

export function startPicker(config) {
  const id = `pick_${++seq}`
  sessions.set(id, { ...config, id })
  return id
}

export function getPicker(id) {
  return sessions.get(String(id)) || null
}

export function completePicker(id, value) {
  const cfg = sessions.get(String(id))
  if (cfg?.onSelect) cfg.onSelect(value)
  sessions.delete(String(id))
  uni.navigateBack({ delta: 1 })
}

export function createAndCompletePicker(id, value) {
  const cfg = sessions.get(String(id))
  if (cfg?.onCreate) cfg.onCreate(value)
  if (cfg?.onSelect) cfg.onSelect(value)
  sessions.delete(String(id))
  uni.navigateBack({ delta: 1 })
}

export function dropPicker(id) {
  sessions.delete(String(id))
}
