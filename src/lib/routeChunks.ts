import type { Route } from './router'

type Chunk<M> = { module: M | null; load: () => Promise<M> }

/**
 * Secondary pages ship as their own chunks. Keeping the resolved module here
 * lets App render it synchronously once loaded, so a page transition never
 * captures an empty Suspense fallback as the "new" page.
 */
function chunk<M>(importer: () => Promise<M>): Chunk<M> {
  const self: Chunk<M> = {
    module: null,
    load: () =>
      importer().then((module) => {
        self.module = module
        return module
      }),
  }
  return self
}

export const aboutChunk = chunk(() => import('../pages/AboutPage'))
export const harvardMitChunk = chunk(() => import('../pages/HarvardMitPage'))

export function preloadRoute(route: Route): Promise<unknown> {
  if (route === 'about') return aboutChunk.load()
  if (route === 'harvard-mit') return harvardMitChunk.load()
  return Promise.resolve()
}
