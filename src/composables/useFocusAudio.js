let audioCtx = null

export function playFocusAudio(url, { volume = 0.65 } = {}) {
  stopFocusAudio()
  if (!url) return

  audioCtx = uni.createInnerAudioContext()
  audioCtx.src = url
  audioCtx.loop = true
  audioCtx.volume = volume
  audioCtx.autoplay = true
  audioCtx.onError(() => {
    stopFocusAudio()
  })
  audioCtx.play()
}

export function stopFocusAudio() {
  if (!audioCtx) return
  try {
    audioCtx.stop()
    audioCtx.destroy()
  } catch {}
  audioCtx = null
}
