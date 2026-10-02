/**
 * Tiny History-API router: a handful of routes do not justify a routing dependency.
 * Internal links call `navigate`; back/forward is handled via popstate.
 *
 * Every route change goes through a transition runner, so a page transition
 * can capture the old page before React commits the new one. The committed
 * path lives in module state (not `location`), which keeps the old page on
 * screen until the runner calls `update`.
 */
import { useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'

export type Route = 'work' | 'about' | 'harvard-mit' | 'unwind' | 'filo'

const ROUTE_BY_PATH: Record<string, Route> = {
  '/': 'work',
  '/work': 'work',
  '/about': 'about',
  '/work/harvard-mit': 'harvard-mit',
  '/work/unwind': 'unwind',
  '/work/filo': 'filo',
}
export const PATH_BY_ROUTE: Record<Route, string> = {
  work: '/',
  about: '/about',
  'harvard-mit': '/work/harvard-mit',
  unwind: '/work/unwind',
  filo: '/work/filo',
}

const normalize = (path: string) => path.replace(/\/+$/, '') || '/'
const routeOf = (path: string): Route => ROUTE_BY_PATH[normalize(path)] ?? 'work'

/** Runs `update` (the DOM-changing route commit), optionally wrapped in a transition. */
export type TransitionRunner = (update: () => void, to: Route, from: Route) => void

let runner: TransitionRunner = (update) => update()
export function setTransitionRunner(next: TransitionRunner) {
  runner = next
}

let committedPath = normalize(window.location.pathname)
// True once the visitor has moved between pages in this tab, so Back can use history.
let navigatedInApp = false
export const hasInAppHistory = () => navigatedInApp
const listeners = new Set<() => void>()

function commit(scrollY: number) {
  committedPath = normalize(window.location.pathname)
  // Render the new page first: scrolling the old one clamps to its height, and the
  // browser's scroll anchoring then drifts the restored position (Back landed at the footer).
  flushSync(() => {
    for (const listener of listeners) listener()
  })
  window.scrollTo(0, scrollY)
}

// Back/forward restores each entry's own scroll position after the commit,
// instead of the browser scrolling the old page before a transition captures it.
if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'

window.addEventListener('popstate', (event) => {
  const from = routeOf(committedPath)
  const to = routeOf(window.location.pathname)
  const scrollY = (event.state as { scrollY?: number } | null)?.scrollY ?? 0
  if (from === to) return commit(scrollY)
  runner(() => commit(scrollY), to, from)
})

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useRoute(): Route {
  return routeOf(useSyncExternalStore(subscribe, () => committedPath))
}

/**
 * `transition: false` commits without the page-transition runner, for callers
 * that already animated the change themselves (the project card expansion).
 */
export function navigate(route: Route, { transition = true }: { transition?: boolean } = {}) {
  const path = PATH_BY_ROUTE[route]
  const from = routeOf(committedPath)
  if (normalize(window.location.pathname) === path) {
    window.scrollTo(0, 0)
    return
  }
  const update = () => {
    window.history.replaceState({ scrollY: window.scrollY }, '')
    window.history.pushState({ scrollY: 0 }, '', path)
    navigatedInApp = true
    commit(0)
  }
  if (transition) runner(update, route, from)
  else update()
}
