const FADE_MS = 900
const LOOP_CROSSFADE_MS = 700
const DEFAULT_VOLUME = 0.65
const LOOP_TAIL_SEC = 1.2

// #ifdef APP-PLUS || MP-WEIXIN
const USE_BACKGROUND_AUDIO = true
// #endif
// #ifndef APP-PLUS || MP-WEIXIN
const USE_BACKGROUND_AUDIO = false
// #endif

let innerCtx = null
let bgmCtx = null
let fadeTimer = null
let loopGuard = false
let currentUrl = ''
let targetVolume = DEFAULT_VOLUME
let isPlaying = false
let isPaused = false

function clearFadeTimer() {
  if (fadeTimer) {
    clearInterval(fadeTimer)
    fadeTimer = null
  }
}

function activeAudio() {
  if (USE_BACKGROUND_AUDIO && bgmCtx) return bgmCtx
  if (innerCtx) return innerCtx
  return null
}

function smoothstep(t) {
  return t * t * (3 - 2 * t)
}

function rampVolume(audio, from, to, durationMs, onDone) {
  clearFadeTimer()
  if (!audio) {
    onDone?.()
    return
  }
  const steps = Math.max(6, Math.round(durationMs / 45))
  const stepMs = durationMs / steps
  let i = 0
  fadeTimer = setInterval(() => {
    i += 1
    const t = smoothstep(Math.min(1, i / steps))
    try {
      audio.volume = from + (to - from) * t
    } catch {}
    if (i >= steps) {
      clearFadeTimer()
      try {
        audio.volume = to
      } catch {}
      onDone?.()
    }
  }, stepMs)
}

function detachListeners(audio) {
  if (!audio) return
  try {
    audio.offEnded?.()
    audio.offTimeUpdate?.()
    audio.offError?.()
  } catch {}
}

function bindLoopCrossfade(audio) {
  detachListeners(audio)
  audio.onError(() => {
    if (isPlaying) stopFocusAudio()
  })
  audio.onTimeUpdate(() => {
    if (!isPlaying || loopGuard) return
    const duration = Number(audio.duration)
    const current = Number(audio.currentTime)
    if (!Number.isFinite(duration) || duration <= LOOP_TAIL_SEC + 0.5) return
    if (duration - current > LOOP_TAIL_SEC) return
    loopGuard = true
    const vol = Number(audio.volume) || targetVolume
    rampVolume(audio, vol, 0, LOOP_CROSSFADE_MS, () => {
      try {
        audio.seek(0)
      } catch {}
      if (!isPlaying) {
        loopGuard = false
        return
      }
      try {
        audio.play()
      } catch {}
      rampVolume(audio, 0, targetVolume, FADE_MS, () => {
        loopGuard = false
      })
    })
  })
}

function createInnerContext() {
  if (innerCtx) return innerCtx
  innerCtx = uni.createInnerAudioContext()
  innerCtx.loop = false
  innerCtx.obeyMuteSwitch = false
  // #ifdef APP-PLUS
  innerCtx.sessionCategory = 'playback'
  // #endif
  return innerCtx
}

function createBgmContext() {
  if (bgmCtx) return bgmCtx
  bgmCtx = uni.getBackgroundAudioManager()
  bgmCtx.title = 'Focus'
  bgmCtx.singer = 'Ambient'
  bgmCtx.epname = 'Focus session'
  bgmCtx.loop = false
  return bgmCtx
}

function getOrCreateAudio(url) {
  if (USE_BACKGROUND_AUDIO) {
    const audio = createBgmContext()
    if (currentUrl && currentUrl !== url) {
      try {
        audio.stop()
      } catch {}
    }
    return audio
  }
  const audio = createInnerContext()
  return audio
}

function startPlayback(url, { fadeIn = true } = {}) {
  const audio = getOrCreateAudio(url)
  currentUrl = url
  isPlaying = true
  isPaused = false

  detachListeners(audio)
  bindLoopCrossfade(audio)

  if (USE_BACKGROUND_AUDIO) {
    if (audio.src !== url) {
      audio.volume = 0
      audio.src = url
    }
  } else if (audio.src !== url) {
    audio.stop()
    audio.src = url
    audio.volume = 0
  }

  try {
    audio.play()
  } catch {}

  if (fadeIn) {
    rampVolume(audio, 0, targetVolume, FADE_MS)
  } else {
    try {
      audio.volume = targetVolume
    } catch {}
  }
}

/** Play or resume ambient audio (fade in, loop with soft crossfade). */
export function playFocusAudio(url, { volume = DEFAULT_VOLUME, fadeIn = true } = {}) {
  if (!url) {
    stopFocusAudio()
    return
  }

  targetVolume = volume
  const audio = activeAudio()

  if (audio && currentUrl === url && isPaused) {
    isPaused = false
    isPlaying = true
    try {
      audio.play()
    } catch {}
    rampVolume(audio, Number(audio.volume) || 0, targetVolume, FADE_MS)
    return
  }

  if (audio && currentUrl === url && isPlaying) return

  stopFocusAudio({ fadeOut: false })
  startPlayback(url, { fadeIn })
}

/** Pause at current position (fade out); use playFocusAudio to resume. */
export function pauseFocusAudio() {
  const audio = activeAudio()
  if (!audio || !isPlaying) return

  isPlaying = false
  isPaused = true
  loopGuard = false
  clearFadeTimer()

  const vol = Number(audio.volume) || targetVolume
  rampVolume(audio, vol, 0, FADE_MS, () => {
    try {
      audio.pause()
    } catch {}
  })
}

/** Stop and release audio. */
export function stopFocusAudio({ fadeOut = true } = {}) {
  const audio = activeAudio()
  clearFadeTimer()
  loopGuard = false
  isPlaying = false
  isPaused = false

  const finish = () => {
    detachListeners(audio)
    try {
      if (USE_BACKGROUND_AUDIO && bgmCtx) {
        bgmCtx.stop()
      } else if (innerCtx) {
        innerCtx.stop()
        innerCtx.destroy()
        innerCtx = null
      }
    } catch {}
    currentUrl = ''
  }

  if (!audio) {
    finish()
    return
  }

  if (fadeOut && (isPlaying || isPaused)) {
    const vol = Number(audio.volume) || targetVolume
    rampVolume(audio, vol, 0, FADE_MS, finish)
  } else {
    finish()
  }
}

export function isFocusAudioPlaying() {
  return isPlaying
}

export function getFocusAudioUrl() {
  return currentUrl
}
