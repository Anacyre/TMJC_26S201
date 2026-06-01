import { createVNode, render, nextTick } from 'vue'
import GlobalOverlayHost from '@/components/GlobalOverlayHost.vue'

const HOST_ID = 'global-overlay-host'

let rootApp = null

export function registerRootApp(app) {
  rootApp = app
}

export function getRootApp() {
  return rootApp
}

/** Always (re)render overlays — fixes H5 page stack + HMR losing toast/undo UI */
export function mountGlobalOverlays(app) {
  const target = app?._context ? app : rootApp
  if (typeof document === 'undefined' || !target?._context) return

  let el = document.getElementById(HOST_ID)
  if (!el) {
    el = document.createElement('div')
    el.id = HOST_ID
    document.body.appendChild(el)
  }

  const vnode = createVNode(GlobalOverlayHost)
  vnode.appContext = target._context
  render(vnode, el)
}

export function scheduleMountGlobalOverlays(app) {
  if (app) registerRootApp(app)
  nextTick(() => mountGlobalOverlays(app))
}
