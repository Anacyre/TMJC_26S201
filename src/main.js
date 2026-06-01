import { createSSRApp } from 'vue'
import App from './App.vue'
import { registerRootApp, scheduleMountGlobalOverlays, mountGlobalOverlays } from '@/lib/mountGlobalOverlays'

export function createApp() {
  const app = createSSRApp(App)
  registerRootApp(app)

  app.mixin({
    mounted() {
      scheduleMountGlobalOverlays(app)
    },
  })

  if (typeof document !== 'undefined') {
    nextTickMount(app)
  }

  return { app }
}

function nextTickMount(app) {
  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(() => mountGlobalOverlays(app))
  } else {
    setTimeout(() => mountGlobalOverlays(app), 0)
  }
}
