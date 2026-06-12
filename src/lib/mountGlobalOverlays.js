import { createVNode, render, nextTick } from 'vue'
import GlobalHosts from '@/components/GlobalHosts.vue'

let rootApp = null
let hostsEl = null
let hostsVNode = null

export function registerRootApp(app) {
  rootApp = app
}

export function getRootApp() {
  return rootApp
}

/** Mount toast / delete / undo overlays on document.body (uni-app H5 does not render App.vue template). */
export function mountGlobalOverlays(app) {
  const ctx = app?._context || rootApp?._context
  if (!ctx) return
  registerRootApp(app || rootApp)

  if (typeof document === 'undefined') return
  if (hostsEl) return

  hostsEl = document.createElement('div')
  hostsEl.id = 'uni-global-hosts'
  hostsEl.style.cssText =
    'position:fixed;inset:0;z-index:20000;pointer-events:none;'
  document.body.appendChild(hostsEl)

  hostsVNode = createVNode(GlobalHosts)
  hostsVNode.appContext = ctx
  render(hostsVNode, hostsEl)
}

export function scheduleMountGlobalOverlays(app) {
  if (app) registerRootApp(app)
  nextTick(() => mountGlobalOverlays(app || rootApp))
}
