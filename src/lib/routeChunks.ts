import type { Route } from './router'

type AboutModule = typeof import('../pages/AboutPage')

/**
 * The About page ships as its own chunk. Keeping the resolved module here lets
 * App render it synchronously once loaded, so a page transition never captures
 * an empty Suspense fallback as the "new" page.
 */
export const aboutChunk: { module: AboutModule | null; load: () => Promise<AboutModule> } = {
  module: null,
  load: () =>
    import('../pages/AboutPage').then((module) => {
      aboutChunk.module = module
      return module
    }),
}

export function preloadRoute(route: Route): Promise<unknown> {
  return route === 'about' ? aboutChunk.load() : Promise.resolve()
}
