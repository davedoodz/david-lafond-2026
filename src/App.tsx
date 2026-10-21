import { lazy, Suspense, useEffect, useState } from 'react'
import { DitherBand } from './components/DitherBand'
import { Footer } from './components/Footer'
import { SafariEdges } from './components/SafariEdges'
import { SelectionHighlight } from './components/SelectionHighlight'
import { ControlledScroll } from './features/controlledScroll/ControlledScroll'
import { CursorLayer } from './features/cursor/CursorLayer'
import { useHeaderIntro } from './features/headerIntro/useHeaderIntro'
import { PageTransitions } from './features/pageTransition/PageTransitions'
import { useRoute } from './lib/router'
import { useTuning } from './tuning/useTuning'
import { aboutChunk, caseStudyChunk, harvardMitChunk } from './lib/routeChunks'
import { WorkPage } from './pages/WorkPage'

// Code the landing view does not need ships as separate chunks. They are fetched
// once the browser goes idle, so later navigation feels instant.
const LazyAboutPage = lazy(() => aboutChunk.load().then((m) => ({ default: m.AboutPage })))
const LazyHarvardMitPage = lazy(() => harvardMitChunk.load().then((m) => ({ default: m.HarvardMitPage })))
const LazyCaseStudyPage = lazy(() => caseStudyChunk.load().then((m) => ({ default: m.CaseStudyPage })))

const DevRoot = import.meta.env.DEV ? lazy(() => import('./tuning/DevRoot')) : null

/** Header dither band, per page (DialKit › Header band). */
const HEADER_BAND_CONFIG = {
  work: true,
  about: true,
  'harvard-mit': true,
  momo: true,
  filo: true,
}

/** Muted text on dark surfaces: nav, hero tagline/role, signature, CTA subtitle, footer, eyebrows (DialKit › Text colors). */
const TEXT_COLORS_CONFIG = {
  muted: { type: 'color' as const, default: '#A6A09C' },
}

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
  'harvard-mit': 'The Architecture Portfolio that Got Me Into Harvard & MIT — David Lafond',
  momo: 'Momo — David Lafond',
  filo: 'Filo — David Lafond',
}

export function App() {
  const route = useRoute()
  const headerBand = useTuning('Header band', HEADER_BAND_CONFIG)
  const textColors = useTuning('Text colors', TEXT_COLORS_CONFIG)

  useEffect(() => {
    document.documentElement.style.setProperty('--text-muted', textColors.muted)
  }, [textColors.muted])
  const idle = useIdle()
  useHeaderIntro()

  useEffect(() => {
    document.title = TITLES[route]
  }, [route])

  useEffect(() => {
    if (!idle) return
    void aboutChunk.load()
    void harvardMitChunk.load()
  }, [idle])

  return (
    <>
      <div className="site" data-surface={route === 'about' || route === 'momo' || route === 'filo' ? 'light' : 'dark'}>
        {headerBand[route as keyof typeof headerBand] !== false && <DitherBand position="header" />}
        {route === 'about' ? (
          // Render the loaded module directly so page transitions never capture a fallback.
          aboutChunk.module ? (
            <aboutChunk.module.AboutPage />
          ) : (
            <Suspense fallback={null}>
              <LazyAboutPage />
            </Suspense>
          )
        ) : route === 'momo' || route === 'filo' ? (
          caseStudyChunk.module ? (
            <caseStudyChunk.module.CaseStudyPage id={route} />
          ) : (
            <Suspense fallback={null}>
              <LazyCaseStudyPage id={route} />
            </Suspense>
          )
        ) : route === 'harvard-mit' ? (
          <>
            {harvardMitChunk.module ? (
              <harvardMitChunk.module.HarvardMitPage />
            ) : (
              // A screen-tall placeholder keeps the footer below the fold while the chunk loads (no layout jump).
              <Suspense fallback={<div style={{ minHeight: '100svh' }} />}>
                <LazyHarvardMitPage />
              </Suspense>
            )}
            <Footer />
          </>
        ) : (
          <>
            <WorkPage />
            <Footer />
          </>
        )}
      </div>
      <SafariEdges />
      <SelectionHighlight />
      <CursorLayer />
      <ControlledScroll />
      <PageTransitions />
      {DevRoot && (
        <Suspense fallback={null}>
          <DevRoot />
        </Suspense>
      )}
    </>
  )
}
