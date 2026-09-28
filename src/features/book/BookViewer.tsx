/**
 * Book ↔ grid viewer for the Harvard & MIT portfolio.
 *
 * Video mode plays the portfolio walkthrough from YouTube. Book mode fills
 * the first screen under the nav: a 3D flip book with first / previous /
 * counter / next / last and zoom controls. Grid mode shows every spread and
 * scrolls with the page. The mode switch is sticky, so it
 * stays in reach anywhere in the grid.
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  BookIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FirstPageIcon,
  GridIcon,
  YouTubeIcon,
  LastPageIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from '../../components/icons'
import { useTuning } from '../../tuning/useTuning'
import { ViewSwitch, switchDials } from './ViewSwitch'
import { SpreadZoom } from './SpreadZoom'
import { toMotionTransition } from '../playground/motionTransition'
import { FlipBook, type BookController, type BookState } from './FlipBook'
import { PAGE_COUNT, SPREADS, pageLabel } from './bookPages'
import { SpreadGrid } from './SpreadGrid'
import './book.css'

type Tuple = [number, number, number, number]
type Mode = 'video' | 'book' | 'grid'

/** `enablejsapi` lets the page pause the video when you switch away from it. */
const VIDEO_SRC = 'https://www.youtube.com/embed/Rv-e5doUc0E?si=EUWjaq_nuAePoblG&enablejsapi=1&rel=0'

const CONFIG = {
  /** Video / Book / Grid switch animation. */
  switch: switchDials(),
  video: {
    /** Share of the largest 16:9 frame that fits under the switch. */
    scaleDesktop: [1, 0.3, 1, 0.01] as Tuple,
    scaleMobile: [1, 0.3, 1, 0.01] as Tuple,
    radius: [12, 0, 40, 1] as Tuple,
    hoverLabel: { type: 'text' as const, default: '180k+ views on Youtube!' },
    /** Hover pill colours: light = white pill, black text; dark = black pill, white text. */
    pill: { type: 'select' as const, options: ['light', 'dark'], default: 'light' },
    /** Colour of the custom cursor dot over the video. */
    cursor: { type: 'select' as const, options: ['light', 'dark'], default: 'light' },
  },
  book: {
    /** Share of the largest size that fits the stage. */
    scale: [1, 0.4, 1, 0.01] as Tuple,
    flipMs: [700, 250, 1600, 10] as Tuple,
    tiltRestX: [8, -20, 30, 0.5] as Tuple,
    tiltRestY: [0, -20, 20, 0.5] as Tuple,
    tiltHover: [7, 0, 20, 0.5] as Tuple,
    shadowOpacity: [0.55, 0, 1, 0.01] as Tuple,
  },
  zoom: {
    maxZoom: [4, 1.5, 8, 0.1] as Tuple,
    detailAtZoom: [1.5, 1, 4, 0.05] as Tuple,
    _collapsed: true,
  },
  grid: {
    /** Multiplies spread size and spacing (fewer, larger spreads per row above 1). */
    scale: [1, 0.5, 2, 0.01] as Tuple,
    minCard: [300, 180, 520, 1] as Tuple,
    gap: [40, 12, 96, 1] as Tuple,
    showPageNumbers: true,
    /** Clicked spread opens enlarged over a blurred backdrop. */
    zoom: {
      widthVw: [86, 40, 100, 1] as Tuple,
      maxHeightVh: [82, 40, 100, 1] as Tuple,
      blur: [20, 0, 60, 1] as Tuple,
      dimOpacity: [0.6, 0, 1, 0.01] as Tuple,
      radius: [4, 0, 40, 1] as Tuple,
      spring: { type: 'spring', visualDuration: 0.5, bounce: 0.15 } as const,
      _collapsed: true,
    },
    _collapsed: true,
  },
}

const spreadOfIndex = (index: number) => (index === 0 ? 0 : Math.ceil(index / 2))

export function BookViewer() {
  const t = useTuning('Portfolio book', CONFIG)
  const [mode, setMode] = useState<Mode>('video')
  // The grid is only built the first time it is opened.
  const [gridMounted, setGridMounted] = useState(false)
  // Video is the opening view. Leaving it reloads the player, so coming back always shows
  // YouTube's untouched start screen (title, thumbnail, play button) and nothing plays behind.
  const [videoStarted, setVideoStarted] = useState(false)
  const [videoKey, setVideoKey] = useState(0)
  const videoRef = useRef<HTMLIFrameElement>(null)
  const [state, setState] = useState<BookState>({ index: 0, orientation: 'landscape', zoom: 1 })
  const controller = useRef<BookController | null>(null)

  const spread = spreadOfIndex(state.index)
  const counter =
    state.orientation === 'portrait' ? String(state.index + 1) : pageLabel(SPREADS[spread])
  const atStart = state.index === 0
  const atEnd = state.index >= PAGE_COUNT - 1 || (state.orientation === 'landscape' && spread === SPREADS.length - 1)

  const modeRef = useRef(mode)
  modeRef.current = mode

  // Every view opens at the top; pressing Grid again while in the grid glides back up.
  // Book always opens on the front cover (pressing it again while reading turns back to it).
  const switchTo = useCallback((next: Mode) => {
    const same = next === modeRef.current
    setMode(next)
    if (next === 'grid') setGridMounted(true)
    if (next === 'book') {
      if (same) controller.current?.first()
      else controller.current?.jumpTo(0)
    }
    window.scrollTo({ top: 0, behavior: same ? 'smooth' : 'auto' })
    if (next !== 'video' && modeRef.current === 'video') {
      setVideoStarted(false)
      setVideoKey((key) => key + 1)
    }
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'g' || event.metaKey || event.ctrlKey || event.altKey) return
      if ((event.target as HTMLElement | null)?.closest('input, textarea, [contenteditable="true"]')) return
      switchTo(mode === 'grid' ? 'book' : 'grid')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, switchTo])

  const [zoom, setZoom] = useState<{ spread: number; source: HTMLElement; closing: boolean } | null>(null)
  const openZoom = useCallback((next: number, source: HTMLElement) => {
    setZoom({ spread: next, source, closing: false })
  }, [])
  const closeZoom = useCallback(() => setZoom((z) => (z ? { ...z, closing: true } : z)), [])
  const clearZoom = useCallback(() => setZoom(null), [])

  const style = {
    '--video-scale-d': t.video.scaleDesktop,
    '--video-scale-m': t.video.scaleMobile,
    '--video-radius': `${t.video.radius}px`,
    '--grid-min': `${t.grid.minCard * t.grid.scale}px`,
    '--grid-gap': `${t.grid.gap * t.grid.scale}px`,
  } as CSSProperties

  return (
    <section className="viewer" data-mode={mode} style={style} aria-label="Harvard & MIT design portfolio">
      <ViewSwitch
        items={[
          { key: 'video', label: 'Video', icon: <YouTubeIcon /> },
          { key: 'book', label: 'Book', icon: <BookIcon /> },
          { key: 'grid', label: 'Grid', icon: <GridIcon /> },
        ]}
        active={mode}
        onSelect={(key) => switchTo(key as Mode)}
        look={t.switch}
      />

      <div className="viewer__book" aria-hidden={mode !== 'book'} inert={mode !== 'book'}>
        <FlipBook
          look={{ ...t.book, ...t.zoom }}
          startIndex={0}
          active={mode === 'book'}
          controllerRef={controller}
          onChange={setState}
        />
        <div className="viewer__bar">
          <div className="viewer__nav">
            <button type="button" aria-label="First page" disabled={atStart} onClick={() => controller.current?.first()}>
              <FirstPageIcon />
            </button>
            <button type="button" aria-label="Previous page" disabled={atStart} onClick={() => controller.current?.prev()}>
              <ChevronLeftIcon />
            </button>
            <p className="viewer__counter" aria-live="polite">
              <span>{counter}</span>
              <span className="viewer__total"> / {PAGE_COUNT}</span>
            </p>
            <button type="button" aria-label="Next page" disabled={atEnd} onClick={() => controller.current?.next()}>
              <ChevronRightIcon />
            </button>
            <button type="button" aria-label="Last page" disabled={atEnd} onClick={() => controller.current?.last()}>
              <LastPageIcon />
            </button>
          </div>
          <div className="viewer__zoom">
            <button
              type="button"
              aria-label="Zoom out"
              disabled={state.zoom <= 1}
              onClick={() => controller.current?.zoomBy(1 / 1.5)}
            >
              <ZoomOutIcon />
            </button>
            <button
              type="button"
              className="viewer__zoom-level"
              aria-label="Reset zoom"
              disabled={state.zoom <= 1}
              onClick={() => controller.current?.zoomReset()}
            >
              {Math.round(state.zoom * 100)}%
            </button>
            <button
              type="button"
              aria-label="Zoom in"
              disabled={state.zoom >= t.zoom.maxZoom}
              onClick={() => controller.current?.zoomBy(1.5)}
            >
              <ZoomInIcon />
            </button>
          </div>
        </div>
      </div>

      <div
        className="viewer__video"
        data-pill={t.video.pill}
        onPointerMove={(event) => {
          // The label lives on the pane (not the clipped frame) so it can spill past the video edge.
          const rect = event.currentTarget.getBoundingClientRect()
          event.currentTarget.style.setProperty('--x', `${event.clientX - rect.left}px`)
          event.currentTarget.style.setProperty('--y', `${event.clientY - rect.top}px`)
        }}
        aria-hidden={mode !== 'video'} inert={mode !== 'video'}>
        <div className="viewer__video-frame">
          {!videoStarted && (
            // The page cannot see the pointer inside YouTube's iframe, so a shield
            // carries the hover label until the first click starts the video.
            <button
              type="button"
              className="viewer__video-shield"
              aria-label="Play video"
              data-surface={t.video.cursor === 'dark' ? 'light' : 'dark'}
              onClick={() => {
                setVideoStarted(true)
                videoRef.current?.contentWindow?.postMessage(
                  JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
                  'https://www.youtube.com',
                )
              }}
            />
          )}
          <iframe
            key={videoKey}
            ref={videoRef}
            src={VIDEO_SRC}
            title="The Design Portfolio that Got Me Into Harvard & MIT — video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
        {!videoStarted && (
          <span className="viewer__video-label" aria-hidden="true">
            {t.video.hoverLabel}
          </span>
        )}
      </div>

      {gridMounted && (
        <div className="viewer__grid" aria-hidden={mode !== 'grid'} inert={mode !== 'grid'}>
          <SpreadGrid
            current={spread}
            onOpen={openZoom}
            showPageNumbers={t.grid.showPageNumbers}
            zoomed={zoom?.spread ?? null}
          />
        </div>
      )}
      {zoom && (
        <SpreadZoom
          pages={SPREADS[zoom.spread]}
          source={zoom.source}
          closing={zoom.closing}
          look={t.grid.zoom}
          transition={toMotionTransition(t.grid.zoom.spring)}
          onClose={closeZoom}
          onClosed={clearZoom}
        />
      )}
    </section>
  )
}
