/**
 * Tiny History-API router: two routes do not justify a routing dependency.
 * Internal links call `navigate`; back/forward is handled via popstate.
 */
import { useSyncExternalStore } from 'react'

export type Route = 'work' | 'about'

const ROUTE_BY_PATH: Record<string, Route> = { '/': 'work', '/work': 'work', '/about': 'about' }
export const PATH_BY_ROUTE: Record<Route, string> = { work: '/', about: '/about' }

const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('popstate', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('popstate', listener)
  }
}

export function useRoute(): Route {
  const path = useSyncExternalStore(subscribe, () => window.location.pathname.replace(/\/+$/, '') || '/')
  return ROUTE_BY_PATH[path] ?? 'work'
}

export function navigate(route: Route) {
  const path = PATH_BY_ROUTE[route]
  if (window.location.pathname !== path) window.history.pushState(null, '', path)
  window.scrollTo(0, 0)
  for (const listener of listeners) listener()
}
