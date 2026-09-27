import { lazy, Suspense, useEffect, useState } from 'react'
import { DitherBand } from './components/DitherBand'
import { Footer } from './components/Footer'
import { CursorLayer } from './features/cursor/CursorLayer'
import { useDavebotOpen } from './features/ghost/davebotStore'
import { PageTransitions } from './features/pageTransition/PageTransitions'
import { useRoute } from './lib/router'
import { aboutChunk } from './lib/routeChunks'
import { WorkPage } from './pages/WorkPage'

// Code the landing view does not need ships as separate chunks. They are fetched
// once the browser goes idle, so later navigation and Davebot feel instant.
const loadDavebot = () => import('./features/ghost/DavebotLayer')
const LazyAboutPage = lazy(() => aboutChunk.load().then((m) => ({ default: m.AboutPage })))
const DavebotLayer = lazy(() => loadDavebot().then((m) => ({ default: m.DavebotLayer })))

const DevRoot = import.meta.env.DEV ? lazy(() => import('./tuning/DevRoot')) : null

function useIdle() {
  const [idle, setIdle] = useState(false)
  useEffect(() => {
    const done = () => setIdle(true)
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(done, { timeout: 2000 })
      return () => window.cancelIdleCallback(id)
    }
    const id = window.setTimeout(done, 1200)
    return () => window.clearTimeout(id)
  }, [])
  return idle
}

const TITLES = {
  work: 'David Lafond — Architect × Product Designer',
  about: 'About — David Lafond',
}

export function App() {
  const route = useRoute()
  const idle = useIdle()
  const davebotOpen = useDavebotOpen()

  useEffect(() => {
    document.title = TITLES[route]
  }, [route])

  useEffect(() => {
    if (idle) void aboutChunk.load()
  }, [idle])

  return (
    <>
      <div className="site" data-surface={route === 'about' ? 'light' : 'dark'}>
        <DitherBand position="header" />
        {route === 'about' ? (
          // Render the loaded module directly so page transitions never capture a fallback.
          aboutChunk.module ? (
            <aboutChunk.module.AboutPage />
          ) : (
            <Suspense fallback={null}>
              <LazyAboutPage />
            </Suspense>
          )
        ) : (
          <>
            <WorkPage />
            <Footer />
          </>
        )}
      </div>
      {(idle || davebotOpen) && (
        <Suspense fallback={null}>
          <DavebotLayer />
        </Suspense>
      )}
      <CursorLayer />
      <PageTransitions />
      {DevRoot && (
        <Suspense fallback={null}>
          <DevRoot />
        </Suspense>
      )}
    </>
  )
}
