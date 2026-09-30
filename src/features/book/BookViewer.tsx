/**
 * Book ↔ grid viewer for the Harvard & MIT portfolio.
 *
 * Video mode plays the portfolio walkthrough from YouTube. Book mode fills
 * the first screen under the nav: a 3D flip book with first / previous /
 * counter / next / last and zoom controls. Grid mode shows every spread and
 * scrolls with the page. The mode switch is sticky, so it
 * stays in reach anywhere in the grid.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import {
  BookIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FirstPageIcon,
  GridIcon,
  YouTubeIcon,
  LastPageIcon,
} from '../../components/icons'
import { useTuningController } from '../../tuning/useTuning'
import { GRID_ENTRANCES, GRID_HOVERS, playGridEntrance, type GridEntranceValues } from './gridEntrance'
import { ViewSwitch, switchDials } from './ViewSwitch'
import { SpreadZoom } from './SpreadZoom'
import { toMotionTransition } from '../playground/motionTransition'
import { FlipBook, type BookController, type BookState } from './FlipBook'
import { PAGE_COUNT, SPREADS, pageLabel } from './bookPages'
import { SpreadGrid } from './SpreadGrid'
import './book.css'
import { VideoControls } from './VideoControls'

type Tuple = [number, number, number, number]
type Mode = 'video' | 'book' | 'grid'

/** `enablejsapi` lets the page pause the video when you switch away from it. */
const VIDEO_SRC = 'https://www.youtube.com/embed/Rv-e5doUc0E?si=EUWjaq_nuAePoblG&enablejsapi=1&rel=0'
/** Mouse / trackpad: the site hides the native cursor everywhere, but it cannot reach inside
 *  YouTube's iframe. There the player runs without its own controls and VideoControls sits
 *  on top, so the cursor dot never leaves the page. Touch keeps YouTube's controls. */
const FINE_POINTER = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
const VIDEO_SRC_FINE = `${VIDEO_SRC}&controls=0&disablekb=1&fs=0&iv_load_policy=3&playsinline=1`

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
    tiltHover: [12, 0, 30, 0.5] as Tuple,
    /** Hover push: how far the book sinks under the pointer. */
    push: [0.015, 0, 0.08, 0.001] as Tuple,
    coverFlex: [0.2, 0, 1, 0.01] as Tuple,
    shadowOpacity: [0.55, 0, 1, 0.01] as Tuple,
    /** Page-block thickness (px) under and beside the pages. */
    thickness: [14, 0, 30, 0.5] as Tuple,
    /** Fold shadow down the spine. */
    /** Sheen across the pages that moves with the tilt. */
    glare: [0.35, 0, 1, 0.01] as Tuple,
  },
  /** Book mode, desktop: vertical placement of the switch, the book and the page controls. */
  layout: {
    /** Switch (Video / Book / Grid) distance from the top of the viewer. */
    switchY: [4, -40, 160, 1] as Tuple,
    /** Gap between the switch and the book. */
    gapAbove: [36, 0, 240, 1] as Tuple,
    /** Gap between the book and the page controls. */
    gapBelow: [24, 0, 240, 1] as Tuple,
    /** Page controls distance from the bottom of the viewer. */
    controlsY: [26, 0, 200, 1] as Tuple,
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
    /** How the spreads arrive when Grid is pressed: as if taken out of the physical book. */
    entrance: {
      preset: { type: 'select' as const, options: [...GRID_ENTRANCES], default: 'open' },
      duration: [900, 200, 2500, 10] as Tuple,
      stagger: [70, 0, 300, 5] as Tuple,
      distance: [1, 0, 3, 0.05] as Tuple,
      perspective: [1400, 300, 4000, 10] as Tuple,
      replay: { type: 'action' as const, label: 'Replay entrance' },
      _collapsed: true,
    },
    /** How a spread reacts under the pointer. */
    hover: {
      preset: { type: 'select' as const, options: [...GRID_HOVERS], default: 'lift' },
      strength: [1, 0, 3, 0.05] as Tuple,
      duration: [260, 80, 900, 10] as Tuple,
      /** Drop shadow under every spread (0 hides it). */
      shadow: [1, 0, 2, 0.05] as Tuple,
      _collapsed: true,
    },
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
  const replayEntrance = useRef<() => void>(() => {})
  const { values: t } = useTuningController('Portfolio book', CONFIG, {
    onAction: (action) => {
      if (action === 'grid.entrance.replay') replayEntrance.current()
    },
  })
  const [mode, setMode] = useState<Mode>('video')
  // The grid is only built the first time it is opened.
  const [gridMounted, setGridMounted] = useState(false)
  // Video is the opening view. Leaving it reloads the player, so coming back always shows
  // YouTube's untouched start screen (title, thumbnail, play button) and nothing plays behind.
  const [videoStarted, setVideoStarted] = useState(false)
  const [videoKey, setVideoKey] = useState(0)
  const videoRef = useRef<HTMLIFrameElement>(null)
  const videoFrameRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<BookState>({ index: 0, orientation: 'landscape', zoom: 1 })
  const controller = useRef<BookController | null>(null)

  const spread = spreadOfIndex(state.index)
  const counter =
    state.orientation === 'portrait' ? String(state.index + 1) : pageLabel(SPREADS[spread])
  const atStart = state.index === 0
  const atEnd = state.index >= PAGE_COUNT - 1 || (state.orientation === 'landscape' && spread === SPREADS.length - 1)

  // Bumped on every switch into the grid; the entrance plays once per bump.
  const [entranceKey, setEntranceKey] = useState(0)
  const gridRef = useRef<HTMLDivElement>(null)
  // Tilt hover: the spread under the pointer leans toward it (-0.5..0.5 on each axis).
  const onGridPointer = useCallback((event: React.PointerEvent) => {
    const card = (event.target as Element).closest<HTMLElement>('.spread-grid__pages')
    if (!card) return
    const rect = card.getBoundingClientRect()
    card.style.setProperty('--hx', ((event.clientX - rect.left) / rect.width - 0.5).toFixed(3))
    card.style.setProperty('--hy', ((event.clientY - rect.top) / rect.height - 0.5).toFixed(3))
  }, [])
  const entranceRef = useRef(t.grid.entrance)
  entranceRef.current = t.grid.entrance
  useLayoutEffect(() => {
    const grid = gridRef.current
    if (!entranceKey || !grid) return
    const animations = playGridEntrance(grid, entranceRef.current as GridEntranceValues)
    return () => animations.forEach((animation) => animation.cancel())
  }, [entranceKey])
  replayEntrance.current = () => {
    if (modeRef.current === 'grid') setEntranceKey((key) => key + 1)
  }

  const modeRef = useRef(mode)
  modeRef.current = mode

  // Every view opens at the top; pressing Grid again while in the grid glides back up.
  // Book always opens on the front cover (pressing it again while reading turns back to it).
  const switchTo = useCallback((next: Mode) => {
    const same = next === modeRef.current
    setMode(next)
    if (next === 'grid') {
      setGridMounted(true)
      if (!same) setEntranceKey((key) => key + 1)
    }
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
    '--switch-y': `${t.layout.switchY}px`,
    '--book-gap-top': `${t.layout.gapAbove}px`,
    '--book-gap-bottom': `${t.layout.gapBelow}px`,
    '--bar-y': `${t.layout.controlsY}px`,
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
        <div className="viewer__video-frame" ref={videoFrameRef}>
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
            src={FINE_POINTER ? VIDEO_SRC_FINE : VIDEO_SRC}
            title="The Design Portfolio that Got Me Into Harvard & MIT — video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
          {videoStarted && FINE_POINTER && (
            <VideoControls
              key={videoKey}
              iframeRef={videoRef}
              frameRef={videoFrameRef}
              surface={t.video.cursor === 'dark' ? 'light' : 'dark'}
            />
          )}
        </div>
        {!videoStarted && (
          <span className="viewer__video-label" aria-hidden="true">
            {t.video.hoverLabel}
          </span>
        )}
      </div>

      {gridMounted && (
        <div
          ref={gridRef}
          className="viewer__grid"
          aria-hidden={mode !== 'grid'}
          inert={mode !== 'grid'}
          data-hover={t.grid.hover.preset}
          style={{ '--gh': t.grid.hover.strength, '--gh-ms': `${t.grid.hover.duration}ms`, '--gh-shadow': t.grid.hover.shadow } as CSSProperties}
          onPointerMove={t.grid.hover.preset === 'tilt' ? onGridPointer : undefined}
        >
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
