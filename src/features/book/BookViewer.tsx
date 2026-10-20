/**
 * Book ↔ grid viewer for the Harvard & MIT portfolio.
 *
 * Video mode loops a silent MP4 preview and links to the walkthrough on YouTube. Book mode fills
 * the first screen under the nav: a 3D flip book with first / previous /
 * counter / next / last and zoom controls. Grid mode shows every spread and
 * scrolls with the page. Book Grid Only removes the Video tab and places one
 * walkthrough below either reading view. Cover hint controls live under Book.
 *
 * Dev experiment: DialKit → Portfolio book → Diagram → Enabled reveals the
 * skeleton overlay. Activation is session-only; every reload starts with scans.
 * Opacity and Scan Opacity set the resting mix; Fills, Outlines, Dots, Grid and
 * Guides each have their own show / ink (auto, custom color, or block) / width /
 * opacity / style. Motion picks a preset (construct, sweep, cascade, bloom, fade):
 * the scan never moves, it only dims (Scan Dim) while skeleton elements draw over it.
 * DialKit's Edit current spread opens the flat canvas for the current book spread
 * or last opened grid spread. Drag/resize, nudge with arrows, or enter percentages.
 * Grid columns/rows drive snapping; the editor shows grid and block-edge guides.
 * Edits autosave to src/data/portfolio-layouts.json; pending local copies can
 * be retried if the dev server is unavailable. No toolbar appears on the page,
 * and neither the experiment nor its saved settings changes the public site.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
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
import { BOOK_ENTRANCES, playBookEntrance, thumbnailPlacementDelay } from './bookEntrance'
import { ViewSwitch, switchDials } from './ViewSwitch'
import { SpreadZoom } from './SpreadZoom'
import { toMotionTransition } from '../playground/motionTransition'
import { FlipBook, type BookController, type BookState } from './FlipBook'
import { PAGE_COUNT, SPREADS, pageLabel } from './bookPages'
import { SpreadGrid, SpreadStack } from './SpreadGrid'
import './book.css'
import { useMedia } from '../../lib/viewport'
import { VideoCard, videoDials } from './VideoCard'
import { LayoutEditor } from './LayoutEditor'
import { diagramSource } from './layoutDiagram'
import { usePageLayouts } from './usePageLayouts'
import { DIAGRAM_PRESETS, useDiagramTransition } from './useDiagramTransition'

type Tuple = [number, number, number, number]
const colorField = (value: string) => ({ type: 'color' as const, default: value })
const inkField = (fallback: string, options = ['auto', 'custom']) => ({ type: 'select' as const, options, default: fallback })
const lineStyleField = (fallback: string) => ({ type: 'select' as const, options: ['solid', 'dashed', 'dotted'], default: fallback })
type Mode = 'video' | 'book' | 'grid'

/** Native cover materials + timing; presets never change interior-page physics. */
const COVER_FEELS: Record<string, { material: 'flexible' | 'board'; duration: number }> = {
  paper: { material: 'flexible', duration: 450 },
  paperback: { material: 'flexible', duration: 850 },
  softHeavy: { material: 'flexible', duration: 1250 },
  hardcover: { material: 'board', duration: 850 },
  folio: { material: 'board', duration: 1450 },
}

const CONFIG = {
  /** Video / Book / Grid switch animation. */
  switch: switchDials(),
  /** Test a two-tab viewer with the walkthrough below either reading view. */
  bookGridOnly: false,
  diagram: {
    enabled: false,
    edit: { type: 'action' as const, label: 'Edit current spread' },
    /** Every skeleton layer at once; the scan stays put underneath. */
    opacity: [1, 0, 1, 0.05] as Tuple,
    /** How much of the spread shows through once the skeleton has settled. */
    scanOpacity: [0.6, 0, 1, 0.05] as Tuple,
    snap: true,
    fills: { show: true, opacity: [0.08, 0, 1, 0.02] as Tuple, _collapsed: true },
    outlines: {
      show: true,
      ink: inkField('block', ['block', 'auto', 'custom']),
      color: colorField('#000000'),
      width: [1, 0.25, 8, 0.25] as Tuple,
      opacity: [1, 0, 1, 0.05] as Tuple,
      style: lineStyleField('solid'),
      handles: false,
      _collapsed: true,
    },
    dots: {
      show: false,
      ink: inkField('auto'),
      color: colorField('#000000'),
      size: [2, 0.5, 12, 0.25] as Tuple,
      spacing: [28, 8, 80, 1] as Tuple,
      opacity: [0.4, 0, 1, 0.05] as Tuple,
      _collapsed: true,
    },
    grid: {
      show: true,
      ink: inkField('auto'),
      color: colorField('#000000'),
      width: [0.25, 0.25, 8, 0.25] as Tuple,
      opacity: [0.7, 0, 1, 0.05] as Tuple,
      style: lineStyleField('solid'),
      columns: [12, 2, 48, 1] as Tuple,
      rows: [16, 2, 48, 1] as Tuple,
      _collapsed: true,
    },
    guides: {
      show: false,
      ink: inkField('auto'),
      color: colorField('#000000'),
      width: [0.5, 0.25, 8, 0.25] as Tuple,
      opacity: [0.35, 0, 1, 0.05] as Tuple,
      style: lineStyleField('dotted'),
      _collapsed: true,
    },
    motion: {
      animate: true,
      preset: { type: 'select' as const, options: [...DIAGRAM_PRESETS], default: 'construct' },
      durationMs: [1400, 300, 4000, 50] as Tuple,
      /** The spread only fades while the skeleton draws over it. */
      scanDim: [0.35, 0, 1, 0.05] as Tuple,
      _collapsed: true,
    },
    _collapsed: false,
  },
  video: videoDials,
  book: {
    /** Share of the largest size that fits the stage. */
    scale: [1, 0.4, 1, 0.01] as Tuple,
    flipMs: [700, 250, 1600, 10] as Tuple,
    /** Flexible covers use the page engine's curl; board preserves a rigid hinge. */
    coverMaterial: { type: 'select' as const, options: ['flexible', 'board'], default: 'flexible' },
    coverFlipMs: [850, 250, 2000, 10] as Tuple,
    coverFeels: {
      paper: { type: 'action' as const, label: 'Light paper' },
      paperback: { type: 'action' as const, label: 'Paperback' },
      softHeavy: { type: 'action' as const, label: 'Slow flexible' },
      hardcover: { type: 'action' as const, label: 'Hardcover' },
      folio: { type: 'action' as const, label: 'Heavy folio' },
      _collapsed: false,
    },
    coverRadius: [0, 0, 48, 1] as Tuple,
    pageRadius: [0, 0, 48, 1] as Tuple,
    tiltRestX: [8, -20, 30, 0.5] as Tuple,
    tiltRestY: [0, -20, 20, 0.5] as Tuple,
    tiltHover: [12, 0, 30, 0.5] as Tuple,
    /** Hover push: how far the book sinks under the pointer. */
    push: [0.015, 0, 0.08, 0.001] as Tuple,
    /** Page-block thickness (px) under and beside the pages. */
    thickness: [14, 0, 30, 0.5] as Tuple,
    /** Fold shadow down the spine. */
    /** Sheen across the pages that moves with the tilt. */
    glare: [0.35, 0, 1, 0.01] as Tuple,
    hint: {
      preset: { type: 'select' as const, options: ['ripple', 'ring', 'arrow', 'orbit', 'off'], default: 'ripple' },
      size: [26, 12, 56, 1] as Tuple,
      inset: [24, 8, 80, 1] as Tuple,
      speed: [1, 0.25, 3, 0.05] as Tuple,
      hover: { type: 'select' as const, options: ['magnet', 'merge', 'elastic', 'none'], default: 'merge' },
      hoverMs: [260, 80, 800, 10] as Tuple,
      attraction: [1, 0, 1.5, 0.05] as Tuple,
    },
    /** Set the book down on a table on every Book click; independent of page turns. */
    entrance: {
      preset: { type: 'select' as const, options: [...BOOK_ENTRANCES], default: 'place' },
      duration: [1100, 250, 3000, 10] as Tuple,
      /** Delay from the project thumbnail click; Book clicks and Replay remain immediate. */
      thumbnailDelayMs: [2000, 0, 5000, 100] as Tuple,
      strength: [1, 0, 2, 0.05] as Tuple,
      feel: { type: 'select' as const, options: ['fluid', 'gentle', 'deliberate'], default: 'fluid' },
      lift: [45, 0, 180, 1] as Tuple,
      approachScale: [1.13, 0.8, 1.4, 0.01] as Tuple,
      tilt: [12, 0, 35, 0.5] as Tuple,
      revealMs: [280, 0, 1200, 10] as Tuple,
      /** Rebound blends continuously into the landing; Silk/Cinematic have no rebound. */
      bounceHeight: [6, 0, 30, 0.5] as Tuple,
      bounceTilt: [1.5, 0, 8, 0.25] as Tuple,
      settlePercent: [30, 10, 60, 1] as Tuple,
      replay: { type: 'action' as const, label: 'Replay book entrance' },
      _collapsed: false,
    },
  },
  /** Vertical placement of the Video / Book / Grid switch and the video. */
  placement: {
    /** Switch distance from the top of the viewer (moves everything below it too). */
    switchY: [4, -40, 160, 1] as Tuple,
    /** Video nudge up (−) or down (+), on its own. */
    videoY: [0, -240, 240, 1] as Tuple,
  },
  /** Book mode, desktop: vertical placement of the book and the page controls. */
  layout: {
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
    /** Independent grid gutters and outside-corner radius. */
    sideMarginDesktop: [44, 0, 320, 1] as Tuple,
    sideMarginMobile: [24, 0, 120, 1] as Tuple,
    cornerRadius: [4, 0, 48, 1] as Tuple,
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
      /** Outside-corner radius of the enlarged spread. */
      radius: [4, 0, 40, 1] as Tuple,
      spring: { type: 'spring', visualDuration: 0.5, bounce: 0 } as const,
      tilt: {
        enabled: true,
        angle: [4, 0, 14, 0.5] as Tuple,
        push: [0.012, 0, 0.08, 0.001] as Tuple,
        perspective: [1800, 600, 3000, 50] as Tuple,
        smoothing: [320, 80, 900, 10] as Tuple,
      },
      _collapsed: true,
    },
    _collapsed: true,
  },
}

const spreadOfIndex = (index: number) => (index === 0 ? 0 : Math.ceil(index / 2))
const SESSION_ONLY_DIAGRAM = ['diagram.enabled'] as const

export function BookViewer() {
  const replayEntrance = useRef<() => void>(() => {})
  const replayBook = useRef<() => void>(() => {})
  const editDiagram = useRef<() => void>(() => {})
  const { values: t, setValue } = useTuningController('Portfolio book', CONFIG, {
    sessionOnly: SESSION_ONLY_DIAGRAM,
    onAction: (action) => {
      if (action === 'diagram.edit') editDiagram.current()
      if (action === 'grid.entrance.replay') replayEntrance.current()
      if (action === 'book.entrance.replay') replayBook.current()
      if (action.startsWith('book.coverFeels.')) {
        const feel = COVER_FEELS[action.slice('book.coverFeels.'.length)]
        if (feel) {
          setValue('book.coverMaterial', feel.material)
          setValue('book.coverFlipMs', feel.duration)
        }
      }
    },
  })
  useEffect(() => {
    const host = document.querySelector<HTMLElement>('.viewer__book')
    if (!host || t.book.hint.hover === 'none' || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let inside = false
    let revealTimer: number | undefined
    let rings: { element: HTMLElement; animation: Animation; start: Keyframe }[] = []
    const restore = () => {
      rings.forEach(({ element, animation }) => {
        animation.cancel()
        element.style.removeProperty('animation')
      })
      rings = []
    }
    const leave = () => {
      if (!inside) return
      inside = false
      clearTimeout(revealTimer)
      // Stay merged while away; re-entry cancels this countdown.
      revealTimer = window.setTimeout(restore, 3000)
    }
    const frames = (start: Keyframe, x: number, y: number): Keyframe[] => {
      const merge = `translate(${x}px, ${y}px) scale(0.3)`
      const ease = t.book.hint.hover === 'elastic' ? 'cubic-bezier(0.2, 1.6, 0.4, 1)' : 'cubic-bezier(0.22, 1, 0.36, 1)'
      return [
        { ...start, offset: 0, easing: ease },
        ...(t.book.hint.hover === 'magnet' ? [{
          transform: `translate(${x}px, ${y}px) scale(0.85)`, opacity: start.opacity, offset: 0.45, easing: ease,
        }] : []),
        // Keep the ring visible until it reaches the cursor. Only then disappear.
        { transform: merge, opacity: start.opacity, offset: 0.85 },
        { transform: merge, opacity: 0, offset: 1 },
      ]
    }
    const move = (event: PointerEvent) => {
      const hint = host.querySelector<HTMLElement>('.book__cover-hint')
      if (!hint) return
      const onCover = event.pointerType === 'mouse' && event.target instanceof Node && hint.parentElement?.contains(event.target)
      if (!onCover) { leave(); return }
      // Once merged, the entire cover holds the ring hidden, not just the hint circle.
      if (rings.length) {
        clearTimeout(revealTimer)
        inside = true
      }
      const rect = hint.getBoundingClientRect()
      const dx = (event.clientX - rect.left) / rect.width - 0.5
      const dy = (event.clientY - rect.top) / rect.height - 0.5
      if (!(Math.hypot(dx, dy) <= 0.5)) return
      clearTimeout(revealTimer)
      inside = true
      const x = dx * t.book.hint.size * t.book.hint.attraction
      const y = dy * t.book.hint.size * t.book.hint.attraction
      if (!rings.length) {
        rings = [...hint.querySelectorAll<HTMLElement>('span')].map((element) => {
          // Capture the currently pulsing ring before stopping its CSS animation.
          // A CSS transition cannot interpolate reliably from that animation.
          const style = getComputedStyle(element)
          const start = { transform: style.transform, opacity: style.opacity }
          element.style.animation = 'none'
          const animation = element.animate(frames(start, x, y), { duration: t.book.hint.hoverMs, fill: 'forwards' })
          return { element, animation, start }
        })
      } else {
        // Follow the pointer without restarting the merge or making it visible again.
        rings.forEach(({ animation, start }) => {
          if (animation.playState !== 'finished') (animation.effect as KeyframeEffect).setKeyframes(frames(start, x, y))
        })
      }
    }
    host.addEventListener('pointermove', move, { passive: true })
    host.addEventListener('pointerleave', leave)
    return () => {
      host.removeEventListener('pointermove', move)
      host.removeEventListener('pointerleave', leave)
      clearTimeout(revealTimer)
      restore()
    }
  }, [t.book.hint.hover, t.book.hint.hoverMs, t.book.hint.attraction, t.book.hint.size])
  const [selectedMode, setMode] = useState<Mode>('video')
  const mode = t.bookGridOnly && selectedMode === 'video' ? 'book' : selectedMode
  // Phones read the book as a scrolling stack of spreads instead of the flip book.
  const phone = useMedia('(max-width: 640px)')
  // The grid is only built the first time it is opened.
  const [gridMounted, setGridMounted] = useState(false)
  const [state, setState] = useState<BookState>({ index: 0, orientation: 'landscape', zoom: 1 })
  const controller = useRef<BookController | null>(null)

  const spread = spreadOfIndex(state.index)
  const layouts = usePageLayouts()
  const [editingSpread, setEditingSpread] = useState<number | null>(null)
  const diagram = { ...t.diagram, enabled: import.meta.env.DEV && t.diagram.enabled }
  // Nested DialKit folders: one serialized key tracks every look control without listing them.
  const { enabled: _enabled, edit: _edit, motion, ...look } = t.diagram
  const lookKey = JSON.stringify(look)
  const diagramSources = useMemo(() => {
    if (!diagram.enabled) return undefined
    return Object.fromEntries(Object.entries(layouts.pages).map(([page, layout]) => [page, diagramSource(layout, t.diagram)]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagram.enabled, layouts.pages, lookKey])
  useDiagramTransition(diagram.enabled, layouts.pages, t.diagram, motion, lookKey)
  const gridSelection = useRef(0)
  editDiagram.current = () => {
    setValue('diagram.enabled', true)
    setZoom(null)
    setEditingSpread(mode === 'grid' ? gridSelection.current : spread)
  }
  const counter =
    state.orientation === 'portrait' ? String(state.index + 1) : pageLabel(SPREADS[spread])
  const atStart = state.index === 0
  const atEnd = state.index >= PAGE_COUNT - 1 || (state.orientation === 'landscape' && spread === SPREADS.length - 1)

  // Bumped on every switch into the grid; the entrance plays once per bump.
  const [entranceKey, setEntranceKey] = useState(0)
  const gridRef = useRef<HTMLDivElement>(null)
  const bookRef = useRef<HTMLDivElement>(null)
  const [bookEntranceKey, setBookEntranceKey] = useState(1)
  const bookEntranceRef = useRef(t.book.entrance)
  bookEntranceRef.current = t.book.entrance
  useLayoutEffect(() => {
    const host = bookRef.current
    if (!host) return
    host.dataset.hintReady = 'false'
    if (mode !== 'book' || !bookEntranceKey) return
    const animations = playBookEntrance(host, bookEntranceRef.current, bookEntranceKey === 1 ? thumbnailPlacementDelay(bookEntranceRef.current.thumbnailDelayMs) : 0)
    let cancelled = false
    let hintTimer: number | undefined
    // Wait for actual placement completion, then leave two seconds of quiet.
    // Replay/view changes cancel both the entrance and its pending hint reveal.
    void Promise.all(animations.map((animation) => animation.finished)).then(() => {
      if (cancelled) return
      hintTimer = window.setTimeout(() => { host.dataset.hintReady = 'true' }, 2000)
    }).catch(() => { /* Cancelled placement must not reveal a stale hint. */ })
    return () => {
      cancelled = true
      clearTimeout(hintTimer)
      host.dataset.hintReady = 'false'
      animations.forEach((animation) => animation.cancel())
    }
  }, [mode, bookEntranceKey])
  replayBook.current = () => {
    if (mode === 'book') setBookEntranceKey((key) => key + 1)
  }
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
      setBookEntranceKey((key) => key + 1)
      if (same) controller.current?.first()
      else controller.current?.jumpTo(0)
    }
    window.scrollTo({ top: 0, behavior: same ? 'smooth' : 'auto' })
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'g' || event.metaKey || event.ctrlKey || event.altKey) return
      if ((event.target as HTMLElement | null)?.closest('.dialkit-root, input, textarea, select, [contenteditable="true"]')) return
      switchTo(mode === 'grid' ? 'book' : 'grid')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, switchTo])

  const [zoom, setZoom] = useState<{ spread: number; source: HTMLElement; origin: DOMRect; closing: boolean } | null>(null)
  const openZoom = useCallback((next: number, source: HTMLElement) => {
    gridSelection.current = next
    const origin = source.getBoundingClientRect()
    source.closest<HTMLElement>('.spread-grid__card')!.dataset.zoomReturn = 'true'
    setZoom({ spread: next, source, origin, closing: false })
  }, [])
  const closeZoom = useCallback(() => setZoom((z) => (z ? { ...z, closing: true } : z)), [])
  const clearZoom = useCallback(() => setZoom(null), [])
  const navigateZoom = useCallback((direction: -1 | 1) => {
    setZoom((current) => {
      if (!current || current.closing) return current
      const spread = (current.spread + direction + SPREADS.length) % SPREADS.length
      gridSelection.current = spread
      const source = gridRef.current?.querySelector<HTMLElement>(`.spread-grid > li:nth-child(${spread + 1}) .spread-grid__pages`)
      if (!source) return current
      source.closest<HTMLElement>('.spread-grid__card')!.dataset.zoomReturn = 'true'
      return { ...current, spread, source }
    })
  }, [])

  const style = {
    '--video-scale-d': t.video.scaleDesktop,
    '--video-scale-m': t.video.scaleMobile,
    '--video-radius': `${t.video.radius}px`,
    '--video-radius-n': t.video.radius,
    '--grid-min': `${t.grid.minCard * t.grid.scale}px`,
    '--grid-gap': `${t.grid.gap * t.grid.scale}px`,
    '--grid-side-d': `${t.grid.sideMarginDesktop}px`,
    '--grid-side-m': `${t.grid.sideMarginMobile}px`,
    '--grid-radius': `${t.grid.cornerRadius}px`,
    '--switch-y': `${t.placement.switchY}px`,
    '--video-y': `${t.placement.videoY}px`,
    '--book-gap-top': `${t.layout.gapAbove}px`,
    '--book-gap-bottom': `${t.layout.gapBelow}px`,
    '--bar-y': `${t.layout.controlsY}px`,
  } as CSSProperties

  return (
    <section className="viewer" data-mode={mode} data-layout={t.bookGridOnly ? 'book-grid' : 'tabs'} style={style} aria-label="Harvard & MIT architecture portfolio">
      <ViewSwitch
        items={[
          ...(!t.bookGridOnly ? [{ key: 'video', label: 'Video', icon: <YouTubeIcon /> }] : []),
          { key: 'book', label: 'Book', icon: <BookIcon /> },
          { key: 'grid', label: 'Grid', icon: <GridIcon /> },
        ]}
        active={mode}
        onSelect={(key) => switchTo(key as Mode)}
        look={t.switch}
      />

      {phone ? (mode === 'book' && <div className="viewer__stack"><SpreadStack /></div>) : (
      <div ref={bookRef} className="viewer__book" aria-hidden={mode !== 'book'} inert={mode !== 'book'}>
        <FlipBook
          look={{ ...t.book, ...t.zoom }}
          startIndex={0}
          active={mode === 'book'}
          controllerRef={controller}
          onChange={setState}
          diagramSources={diagramSources}
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
      )}


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
            diagramSources={diagramSources}
          />
        </div>
      )}
      <VideoCard active={t.bookGridOnly || mode === 'video'} look={t.video} />
      {zoom && (
        <SpreadZoom
          pages={SPREADS[zoom.spread]}
          diagramSources={diagramSources}
          source={zoom.source}
          originRect={zoom.origin}
          gridRadius={t.grid.cornerRadius}
          closing={zoom.closing}
          look={t.grid.zoom}
          transition={toMotionTransition(t.grid.zoom.spring)}
          onClose={closeZoom}
          onClosed={clearZoom}
          onNavigate={navigateZoom}
        />
      )}
      {editingSpread !== null && import.meta.env.DEV && (
        <LayoutEditor spread={editingSpread} pages={layouts.pages} settings={t.diagram}
          status={layouts.status} onSave={layouts.savePage}
          onSpread={(next) => {
            setEditingSpread(next)
            gridSelection.current = next
            if (mode === 'book') controller.current?.jumpTo(SPREADS[next][0] - 1)
          }}
          onSettings={(key, value) => setValue(`diagram.${key}`, value)}
          onRetry={layouts.retry} onClose={() => setEditingSpread(null)} />
      )}
    </section>
  )
}
