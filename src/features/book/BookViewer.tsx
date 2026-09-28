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
import { FlipBook, type BookController, type BookState } from './FlipBook'
import { PAGE_COUNT, SPREADS, pageLabel } from './bookPages'
import { SpreadGrid } from './SpreadGrid'
import './book.css'

type Tuple = [number, number, number, number]
type Mode = 'video' | 'book' | 'grid'

/** `enablejsapi` lets the page pause the video when you switch away from it. */
const VIDEO_SRC = 'https://www.youtube.com/embed/Rv-e5doUc0E?si=EUWjaq_nuAePoblG&enablejsapi=1&rel=0'

const CONFIG = {
  book: {
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
    minCard: [300, 180, 520, 1] as Tuple,
    gap: [40, 12, 96, 1] as Tuple,
    _collapsed: true,
  },
}

const spreadOfIndex = (index: number) => (index === 0 ? 0 : Math.ceil(index / 2))
const indexOfSpread = (spread: number) => (spread === 0 ? 0 : spread * 2 - 1)

export function BookViewer() {
  const t = useTuning('Portfolio book', CONFIG)
  const [mode, setMode] = useState<Mode>('book')
  // The grid is only built the first time it is opened.
  const [gridMounted, setGridMounted] = useState(false)
  // The YouTube player is only loaded the first time the video is opened, then kept so it resumes where it paused.
  const [videoMounted, setVideoMounted] = useState(false)
  const videoRef = useRef<HTMLIFrameElement>(null)
  const [state, setState] = useState<BookState>({ index: 0, orientation: 'landscape', zoom: 1 })
  const controller = useRef<BookController | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const spread = spreadOfIndex(state.index)
  const counter =
    state.orientation === 'portrait' ? String(state.index + 1) : pageLabel(SPREADS[spread])
  const atStart = state.index === 0
  const atEnd = state.index >= PAGE_COUNT - 1 || (state.orientation === 'landscape' && spread === SPREADS.length - 1)

  const switchTo = useCallback((next: Mode) => {
    setMode(next)
    if (next === 'grid') setGridMounted(true)
    else window.scrollTo({ top: 0 })
    if (next === 'video') setVideoMounted(true)
    // Leaving the video pauses it, so it never plays on behind the book or grid.
    else
      videoRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
        'https://www.youtube.com',
      )
  }, [])

  // Opening the grid brings the spread you were reading into view.
  useEffect(() => {
    if (mode !== 'grid') return
    const frame = requestAnimationFrame(() => {
      const card = gridRef.current?.querySelector<HTMLElement>('[aria-current="true"]')
      if (card && spread > 3) card.scrollIntoView({ block: 'center' })
    })
    return () => cancelAnimationFrame(frame)
    // Only on entering grid mode, not on every page turn.
  }, [mode])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'g' || event.metaKey || event.ctrlKey || event.altKey) return
      if ((event.target as HTMLElement | null)?.closest('input, textarea, [contenteditable="true"]')) return
      switchTo(mode === 'grid' ? 'book' : 'grid')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, switchTo])

  const openSpread = useCallback(
    (next: number) => {
      controller.current?.jumpTo(indexOfSpread(next))
      switchTo('book')
    },
    [switchTo],
  )

  const style = {
    '--grid-min': `${t.grid.minCard}px`,
    '--grid-gap': `${t.grid.gap}px`,
  } as CSSProperties

  return (
    <section className="viewer" data-mode={mode} style={style} aria-label="Harvard & MIT design portfolio">
      <div className="viewer__switch" role="group" aria-label="View">
        <button type="button" aria-pressed={mode === 'video'} onClick={() => switchTo('video')}>
          <YouTubeIcon />
          Video
        </button>
        <button type="button" aria-pressed={mode === 'book'} onClick={() => switchTo('book')}>
          <BookIcon />
          Book
        </button>
        <button type="button" aria-pressed={mode === 'grid'} onClick={() => switchTo('grid')}>
          <GridIcon />
          Grid
        </button>
      </div>

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

      {videoMounted && (
        <div className="viewer__video" aria-hidden={mode !== 'video'} inert={mode !== 'video'}>
          <div className="viewer__video-frame">
            <iframe
              ref={videoRef}
              src={VIDEO_SRC}
              title="The Design Portfolio that Got Me Into Harvard & MIT — video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {gridMounted && (
        <div ref={gridRef} className="viewer__grid" aria-hidden={mode !== 'grid'} inert={mode !== 'grid'}>
          <SpreadGrid current={spread} onOpen={openSpread} />
        </div>
      )}
    </section>
  )
}
