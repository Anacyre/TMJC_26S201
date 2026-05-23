<script>
import { useTheme } from '@/composables/useTheme'
import { bootstrapData } from '@/composables/useBootstrap'
import { USE_MOCK, resetMockBackend } from '@/lib/mockBackend'

export default {
  onLaunch: function () {
    useTheme()
    bootstrapData()
  },
  onShow: function () {
    useTheme()
    bootstrapData()
  },
  onHide: function () {},
}

if (typeof window !== 'undefined') {
  if (USE_MOCK && typeof document !== 'undefined') {
    const ensurePill = () => {
      if (document.getElementById('preview-pill')) return
      const pill = document.createElement('div')
      pill.id = 'preview-pill'
      pill.className = 'preview-pill'
      pill.innerHTML = '<span class="preview-pill-dot"></span><span class="preview-pill-text">Preview Mode</span>'
      pill.title = 'Click to reset demo data'
      pill.onclick = () => {
        resetMockBackend()
        location.reload()
      }
      document.body.appendChild(pill)
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', ensurePill, { once: true })
    } else {
      ensurePill()
    }
  }

  // Expose quick reset for live demos in browser console.
  window.__preview = {
    mock: USE_MOCK,
    reset() {
      if (!USE_MOCK) return
      resetMockBackend()
      location.reload()
    },
  }
}
</script>

<style>
/* Global mobile layout hygiene (H5 + App) */
page {
  width: 100%;
  min-height: 100%;
  overflow-x: hidden;
  background: #f4f6fa;
  color-scheme: light;
  transition: background-color 280ms ease;
}

html[data-theme='dark'] page,
html[data-theme='dark'] body {
  background: #0f1216;
  color-scheme: dark;
}

html[data-theme='light'] page,
html[data-theme='light'] body {
  background: #f4f6fa;
  color-scheme: light;
}

html,
body {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  background: #f4f6fa;
  transition: background-color 280ms ease;
}

html[data-theme='dark'] body {
  background: #0f1216;
}

view,
scroll-view,
text,
image,
input,
textarea,
button {
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

/* prevent subtle horizontal drift on some H5 shells */
.page {
  width: 100%;
  max-width: 100%;
  transition: background-color 280ms ease, color 280ms ease;
}

/* Universal theme-aware text default so transitioning pages never flash */
.t-light {
  color: rgba(16, 24, 40, 0.92);
}
.t-dark {
  color: rgba(245, 247, 255, 0.92);
}

.preview-pill {
  position: fixed;
  left: 14rpx;
  top: calc(env(safe-area-inset-top) + 10rpx);
  z-index: 120;
  height: 44rpx;
  padding: 0 12rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: rgba(255, 255, 255, 0.75);
  border: 1rpx solid rgba(46, 99, 255, 0.22);
  box-shadow: 0 8rpx 24rpx rgba(46, 99, 255, 0.14);
  backdrop-filter: blur(12px);
}

html[data-theme='dark'] .preview-pill {
  background: rgba(26, 29, 33, 0.86);
  border-color: rgba(120, 160, 255, 0.3);
}

.preview-pill-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: #2e63ff;
}

.preview-pill-text {
  font-size: 18rpx;
  color: rgba(46, 99, 255, 0.95);
}

html[data-theme='dark'] .preview-pill-text {
  color: rgba(170, 200, 255, 0.95);
}
</style>
