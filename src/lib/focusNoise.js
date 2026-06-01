import { uploadFile } from '@/api/upload'

/** Only silence is built-in; shared sounds come from cloud (admin-uploaded). */
export const BUILTIN_NOISES = [
  { id: 'silence', name: 'No noise', source: 'builtin', icon: 'silence', audioUrl: '' },
]

export const NOISE_ICON_PRESETS = [
  { id: 'water', label: 'Water', color: 'hsl(200, 52%, 52%)' },
  { id: 'forest', label: 'Forest', color: 'hsl(140, 40%, 42%)' },
  { id: 'beach', label: 'Beach', color: 'hsl(38, 68%, 56%)' },
  { id: 'cafe', label: 'Café', color: 'hsl(28, 44%, 46%)' },
  { id: 'library', label: 'Library', color: 'hsl(258, 26%, 50%)' },
  { id: 'rain', label: 'Rain', color: 'hsl(215, 34%, 54%)' },
  { id: 'wind', label: 'Wind', color: 'hsl(190, 28%, 56%)' },
  { id: 'fire', label: 'Fire', color: 'hsl(18, 62%, 50%)' },
]

export const MAX_FOCUS_SOUND_SECONDS = 30 * 60
const ALLOWED_EXT = ['.mp3', '.wav']

export function iconPreset(id) {
  return NOISE_ICON_PRESETS.find((x) => x.id === id) || NOISE_ICON_PRESETS[0]
}

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
  const preset = item.icon ? iconPreset(item.icon) : null
  return {
    ...item,
    color: item.color || preset?.color || colorFromId(item.id),
  }
}

export function normalizeNoiseList(list = []) {
  return list.map(withNoiseColor)
}

export function mergeNoiseLibrary({ shared = [] } = {}) {
  const builtins = normalizeNoiseList(BUILTIN_NOISES)
  const sharedNorm = normalizeNoiseList(shared)
  const ids = new Set()
  const out = []
  for (const item of [...builtins, ...sharedNorm]) {
    if (ids.has(item.id)) continue
    ids.add(item.id)
    out.push(item)
  }
  return out
}

function chooseAudioFile() {
  return new Promise((resolve, reject) => {
    uni.chooseFile({
      count: 1,
      extension: ALLOWED_EXT,
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

async function fileToBlob(picked) {
  const file = picked.file
  if (file instanceof Blob) return file
  if (picked.path) {
    const res = await fetch(picked.path)
    return res.blob()
  }
  throw new Error('Could not read audio file')
}

function readAudioDuration(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const audio = new Audio()
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => {
      const duration = Number(audio.duration)
      URL.revokeObjectURL(url)
      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error('Could not read audio duration'))
        return
      }
      resolve(duration)
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read audio file'))
    }
    audio.src = url
  })
}

function assertAllowedExtension(name = '') {
  const lower = String(name).toLowerCase()
  if (!ALLOWED_EXT.some((ext) => lower.endsWith(ext))) {
    throw new Error('Only MP3 and WAV files are supported')
  }
}

/** Choose mp3/wav and validate duration (≤10 min). Does not upload. */
export async function chooseFocusSoundFile() {
  const picked = await chooseAudioFile()
  assertAllowedExtension(picked.name || picked.path || '')

  const blob = await fileToBlob(picked)
  const duration = await readAudioDuration(blob)
  if (duration > MAX_FOCUS_SOUND_SECONDS) {
    throw new Error('Audio must be 30 minutes or less')
  }

  const baseName = picked.name?.replace(/\.[^.]+$/, '') || picked.path?.split('/').pop()?.replace(/\.[^.]+$/, '') || 'Sound'

  return {
    blob,
    picked: {
      file: picked.file || picked,
      path: picked.path,
      name: picked.name,
      size: picked.size || blob.size,
      type: blob.type || 'audio/mpeg',
    },
    durationSeconds: Math.round(duration * 10) / 10,
    baseName: baseName.slice(0, 24),
  }
}

export async function uploadFocusSoundRecord({ name, icon = 'water', picked, durationSeconds = 0 }) {
  const { fileUrl, fileKey, error } = await uploadFile(picked, 'focus-sound')
  if (error || !fileUrl) throw error || new Error('Upload failed')

  const preset = iconPreset(icon)
  const displayName = String(name || picked?.name?.replace(/\.[^.]+$/, '') || 'Sound').slice(0, 24)

  return withNoiseColor({
    name: displayName,
    source: 'shared',
    icon,
    audioUrl: fileUrl,
    fileKey: fileKey || '',
    durationSeconds,
    createdAt: new Date().toISOString(),
  })
}

/** Pick file, validate, upload to cloud — convenience for one-step flows. */
export async function pickAndUploadFocusSound({ name, icon = 'water' } = {}) {
  const chosen = await chooseFocusSoundFile()
  return uploadFocusSoundRecord({
    name: name || chosen.baseName,
    icon,
    picked: chosen.picked,
    durationSeconds: chosen.durationSeconds,
  })
}
