/** Built-in presets (visual + silence; no bundled audio files). */
export const BUILTIN_NOISES = [
  { id: 'silence', name: 'Silence', source: 'builtin', audioUrl: '' },
  { id: 'builtin_rain', name: 'Rain', source: 'builtin', audioUrl: '' },
  { id: 'builtin_cafe', name: 'Cafe', source: 'builtin', audioUrl: '' },
  { id: 'builtin_wind', name: 'Wind', source: 'builtin', audioUrl: '' },
  { id: 'builtin_brown', name: 'Brown', source: 'builtin', audioUrl: '' },
]

const LOCAL_KEY_PREFIX = 'focus_local_sounds_v1'

export function localSoundsKey(userId) {
  return userId ? `${LOCAL_KEY_PREFIX}_${userId}` : `${LOCAL_KEY_PREFIX}_guest`
}

/** Stable vivid color from id (same id → same color). */
export function colorFromId(id) {
  let hash = 0
  const str = String(id || 'noise')
  for (let i = 0; i < str.length; i += 1) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  const sat = 58 + (Math.abs(hash >> 8) % 18)
  const light = 48 + (Math.abs(hash >> 16) % 14)
  return `hsl(${hue}, ${sat}%, ${light}%)`
}

export function withNoiseColor(item) {
  return {
    ...item,
    color: item.color || colorFromId(item.id),
  }
}

export function normalizeNoiseList(list = []) {
  return list.map(withNoiseColor)
}

export function mergeNoiseLibrary({ shared = [], local = [] } = {}) {
  const builtins = normalizeNoiseList(BUILTIN_NOISES)
  const sharedNorm = normalizeNoiseList(shared)
  const localNorm = normalizeNoiseList(local)
  const ids = new Set()
  const out = []
  for (const item of [...builtins, ...sharedNorm, ...localNorm]) {
    if (ids.has(item.id)) continue
    ids.add(item.id)
    out.push(item)
  }
  return out
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/** Pick an audio file and return a storable sound record. */
export async function pickAndBuildSoundRecord({ source, userId = '', nameHint = '' } = {}) {
  const picked = await chooseAudioFile()
  const file = picked.file
  const size = file?.size || picked.size || 0
  const maxBytes = 4 * 1024 * 1024
  if (size > maxBytes) {
    throw new Error('Audio must be under 4MB')
  }

  let audioUrl = ''
  if (file instanceof Blob) {
    audioUrl = await blobToDataUrl(file)
  } else if (picked.path) {
    const res = await fetch(picked.path)
    audioUrl = await blobToDataUrl(await res.blob())
  }

  if (!audioUrl) throw new Error('Could not read audio file')

  const baseName = nameHint
    || file?.name?.replace(/\.[^.]+$/, '')
    || picked.name?.replace(/\.[^.]+$/, '')
    || 'Sound'

  const id = `${source}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`

  return withNoiseColor({
    id,
    name: baseName.slice(0, 24),
    source,
    userId: source === 'local' ? userId : '',
    audioUrl,
    createdAt: new Date().toISOString(),
  })
}

function chooseAudioFile() {
  return new Promise((resolve, reject) => {
    uni.chooseFile({
      count: 1,
      extension: ['.mp3', '.wav', '.m4a', '.ogg', '.aac', '.webm'],
      success: (res) => {
        const file = res.tempFiles?.[0]
        if (file) {
          resolve({
            file: file.file || file,
            path: file.path || res.tempFilePaths?.[0] || '',
            name: file.name || '',
            size: file.size || 0,
          })
          return
        }
        const path = res.tempFilePaths?.[0]
        if (path) {
          resolve({ path, name: path.split('/').pop() || '', size: 0 })
          return
        }
        reject(new Error('No file selected'))
      },
      fail: (err) => reject(err || new Error('Pick cancelled')),
    })
  })
}

export function loadLocalSounds(userId) {
  try {
    const raw = uni.getStorageSync(localSoundsKey(userId))
    return normalizeNoiseList(Array.isArray(raw) ? raw : [])
  } catch {
    return []
  }
}

export function saveLocalSounds(userId, list) {
  try {
    uni.setStorageSync(localSoundsKey(userId), list)
  } catch {}
}
