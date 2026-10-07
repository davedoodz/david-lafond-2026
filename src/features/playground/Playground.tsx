import { createPortal } from 'react-dom'
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type CSSProperties } from 'react'
import { AnimatePresence, useReducedMotion } from 'motion/react'
import type { DialConfig } from 'dialkit'
import { useTuningController } from '../../tuning/useTuning'
import { playgroundItems } from '../../data/playground'
import { CardVideo } from './CardVideo'
import { CriticalActionMedia, JournalMedia, PortfolioMedia } from './SpecialCardMedia'
import { PlaygroundCard } from './PlaygroundCard'
import { PlaygroundZoom, type NavPreset } from './PlaygroundZoom'
import { toMotionTransition } from './motionTransition'
import './Playground.css'

const titleFields: Record<string, { type: 'text'; default: string; placeholder: string }> = {}
const videoLoopSpeedFields: Record<string, [number, number, number, number]> = {}
const mediaScaleFields: Record<string, [number, number, number, number]> = {}
const tuningKeyById: Record<string, string> = {}
const controlKeyById: Record<string, string> = {
  p01: 'paper shaders',
  p02: 'future fabric',
  p03: 'nintendogs for macos',
  p04: 'renovation contractor agent',
  p05: 'architectural sketchbooks',
  p06: 'david’s journal',
  p07: 'decode: a critical action',
  p08: 'my room in 3d',
  p09: 'harvard + mit acceptance portfolio',
  p10: 'interactive signature',
}
const ROOM_VIDEO_VARIANTS = {
  dark: {
    src: '/about/playground/bedroom-world.mp4',
    poster: '/about/playground/bedroom-world.webp',
  },
  light: {
    src: '/about/playground/bedroom-world-light.mp4',
    poster: '/about/playground/bedroom-world-light.webp',
  },
} as const
const itemById = new Map(playgroundItems.map((item) => [item.id, item]))
const defaultOrder = playgroundItems.map((item) => item.id).join(',')

for (const [i, item] of playgroundItems.entries()) {
  const key = `card${i + 1}`
  tuningKeyById[item.id] = key
  titleFields[key] = { type: 'text', default: item.title, placeholder: item.title }
  // Portfolio cards get their own dial folder (page speed, floatiness, shadow, scale).
  if (item.presentation === 'portfolio') continue
  if (item.video) videoLoopSpeedFields[controlKeyById[item.id]] = [1, 0.25, 12, 0.05]
  if (item.video || item.presentation) mediaScaleFields[controlKeyById[item.id]] = [1, 0.25, 3, 0.01]
}

function orderItems(rawOrder: string) {
  const seen = new Set<string>()
  const ordered = rawOrder
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id in tuningKeyById && !seen.has(id) && Boolean(seen.add(id)))
    .map((id) => itemById.get(id)!)
  for (const item of playgroundItems) if (!seen.has(item.id)) ordered.push(item)
  return ordered
}

const PLAYGROUND_CONFIG = {
  title: {
    size: [16, 10, 32, 1] as [number, number, number, number],
    x: [20, 0, 80, 1] as [number, number, number, number],
    y: [18, 0, 80, 1] as [number, number, number, number],
    shadow: true,
  },
  shade: {
    color: { type: 'color', default: '#0b0a09' } as const,
    start: [55, 0, 100, 1] as [number, number, number, number],
    end: [92, 0, 100, 1] as [number, number, number, number],
    opacity: [0.5, 0, 1, 0.01] as [number, number, number, number],
  },
  hover: {
    scale: [1.04, 1, 1.2, 0.005] as [number, number, number, number],
    durationMs: [350, 0, 1000, 10] as [number, number, number, number],
  },
  titles: { _collapsed: true, ...titleFields },
  /** Per-card playback rate for muted looping videos. */
  videoLoopSpeed: { _collapsed: true, ...videoLoopSpeedFields },
  /** Scale the central composition independently for each populated card. */
  mediaScale: { _collapsed: true, ...mediaScaleFields },
  room: {
    video: {
      type: 'select',
      options: [
        { value: 'dark', label: 'Dark canvas (current)' },
        { value: 'light', label: 'Light canvas' },
      ],
      default: 'dark',
    },
  },
  order: { type: 'text', default: defaultOrder },
  journal: {
    /** Crop the desktop loop by zooming and repositioning it within the card. */
    desktopZoom: [1, 1, 3, 0.01] as [number, number, number, number],
    desktopX: [0, -100, 100, 1] as [number, number, number, number],
    desktopY: [0, -100, 100, 1] as [number, number, number, number],
    desktopCropLeft: [0, 0, 49, 0.5] as [number, number, number, number],
    desktopCropRight: [0, 0, 49, 0.5] as [number, number, number, number],
    desktopCropTop: [0, 0, 49, 0.5] as [number, number, number, number],
    desktopCropBottom: [0, 0, 49, 0.5] as [number, number, number, number],
    desktopRadius: [0, 0, 120, 1] as [number, number, number, number],
    /** Phone position as percentage points from the card centre. */
    phoneX: [-26, -100, 100, 1] as [number, number, number, number],
    phoneY: [4, -100, 100, 1] as [number, number, number, number],
  },
  criticalAction: {
    /** Book position as percentage points from the card centre. */
    bookX: [0, -100, 100, 1] as [number, number, number, number],
    bookY: [0, -100, 100, 1] as [number, number, number, number],
  },
  portfolio: {
    /** Video playback rate: how fast the spreads turn. */
    pageSpeed: [1, 0.25, 4, 0.05] as [number, number, number, number],
    /** Drift and sway of the floating spread; 0 holds it still at its tilt. */
    floatiness: [1, 0, 3, 0.05] as [number, number, number, number],
    /** Drop-shadow strength behind the spread. */
    shadow: [1, 0, 2, 0.05] as [number, number, number, number],
    scale: [1, 0.5, 1.5, 0.01] as [number, number, number, number],
    /** Book orientation (deg): tip top away (+) / toward (−), turn, and roll. */
    tiltX: [22, -60, 60, 0.5] as [number, number, number, number],
    tiltY: [-18, -60, 60, 0.5] as [number, number, number, number],
    tiltZ: [-4, -45, 45, 0.5] as [number, number, number, number],
  },
  grid: {
    /** How many cards show, in data order (first N). */
    count: [playgroundItems.length, 1, playgroundItems.length, 1] as [number, number, number, number],
    columnsDesktop: [4, 1, 8, 1] as [number, number, number, number],
    columnsMobile: [3, 1, 4, 1] as [number, number, number, number],
    /** Card width (px); height follows the card's aspect ratio. Capped by the page margins. */
    cardWidthDesktop: [230, 80, 600, 1] as [number, number, number, number],
    cardWidthMobile: [142, 60, 400, 1] as [number, number, number, number],
    gapX: [14, 0, 40, 1] as [number, number, number, number],
    gapY: [18, 0, 40, 1] as [number, number, number, number],
    radius: [15, 0, 40, 1] as [number, number, number, number],
    topGapDesktop: [171, 0, 320, 1] as [number, number, number, number],
    topGapMobile: [30, 0, 160, 1] as [number, number, number, number],
  },
  zoom: {
    widthVw: [80, 40, 100, 1] as [number, number, number, number],
    maxHeightVh: [80, 40, 100, 1] as [number, number, number, number],
    blur: [20, 0, 60, 1] as [number, number, number, number],
    dimOpacity: [0.6, 0, 1, 0.01] as [number, number, number, number],
    spring: { type: 'spring', visualDuration: 0.5, bounce: 0.2 } as const,
  },
  /** Card-to-card change when using the arrows (or ← / →) in the open view. */
  nav: {
    preset: {
      type: 'select',
      options: [
        { value: 'fade', label: 'Fade' },
        { value: 'slide', label: 'Slide' },
        { value: 'push', label: 'Push (slide + fade)' },
        { value: 'scale', label: 'Scale' },
        { value: 'blur', label: 'Blur' },
        { value: 'flip', label: 'Flip (3D)' },
        { value: 'none', label: 'None (cut)' },
      ],
      default: 'fade',
    },
    transition: { type: 'spring', visualDuration: 0.35, bounce: 0 } as const,
  },
} satisfies DialConfig

type HostRefs = { grid: HTMLDivElement | null; zoom: HTMLDivElement | null }

export function Playground({ className }: { className?: string }) {
  const { values, setValue } = useTuningController('Playground', PLAYGROUND_CONFIG)
  const count = values.grid.count
  const orderedItems = useMemo(() => orderItems(values.order), [values.order])
  const items = useMemo(() => orderedItems.slice(0, count), [count, orderedItems])
  const reducedMotion = Boolean(useReducedMotion())

  const [activeId, setActiveId] = useState<string | null>(null)
  /** −1 = previous, 1 = next: which side the arrow transition enters from. */
  const [navDirection, setNavDirection] = useState<1 | -1>(1)
  const [originRect, setOriginRect] = useState<DOMRect | null>(null)
  const [visibleIds, setVisibleIds] = useState<Set<string>>(() => new Set())
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)

  const cardElRefs = useRef(new Map<string, HTMLButtonElement>())
  const openScrollYRef = useRef(0)
  const hostRefs = useRef(new Map<string, HostRefs>())
  const lastFocusedRef = useRef<HTMLButtonElement | null>(null)
  const [, forceHostUpdate] = useReducer((n: number) => n + 1, 0)

  const setCardEl = useCallback((id: string, el: HTMLButtonElement | null) => {
    if (el) cardElRefs.current.set(id, el)
    else cardElRefs.current.delete(id)
  }, [])

  const setGridHost = useCallback((id: string, el: HTMLDivElement | null) => {
    const entry = hostRefs.current.get(id) ?? { grid: null, zoom: null }
    entry.grid = el
    hostRefs.current.set(id, entry)
    forceHostUpdate()
  }, [])

  const setZoomHost = useCallback((id: string, el: HTMLDivElement | null) => {
    const entry = hostRefs.current.get(id) ?? { grid: null, zoom: null }
    entry.zoom = el
    hostRefs.current.set(id, entry)
    forceHostUpdate()
  }, [])

  // Play/pause each animated card only while it is on screen or zoomed.
  useEffect(() => {
    const withMedia = items.filter((item) => item.video || item.presentation)
    if (withMedia.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleIds((prev) => {
          let changed = false
          const next = new Set(prev)
          for (const entry of entries) {
            const id = (entry.target as HTMLElement).dataset.pgId
            if (!id) continue
            const has = next.has(id)
            if (entry.isIntersecting && !has) {
              next.add(id)
              changed = true
            } else if (!entry.isIntersecting && has) {
              next.delete(id)
              changed = true
            }
          }
          return changed ? next : prev
        })
      },
      { rootMargin: '200px 0px' },
    )
    const raf = requestAnimationFrame(() => {
      for (const item of withMedia) {
        const el = cardElRefs.current.get(item.id)
        if (el) observer.observe(el)
      }
    })
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [items])

  const openCard = useCallback((id: string, el: HTMLButtonElement, scrollY: number) => {
    openScrollYRef.current = scrollY
    document.documentElement.dataset.playgroundZoomOpen = 'true'
    window.scrollTo({ top: scrollY, behavior: 'instant' })
    setOriginRect(el.getBoundingClientRect())
    setActiveId(id)
  }, [])

  const closeZoom = useCallback(() => {
    if (!activeId) return
    const el = cardElRefs.current.get(activeId)
    if (el) setOriginRect(el.getBoundingClientRect())
    setActiveId(null)
  }, [activeId])

  const goTo = useCallback((delta: 1 | -1) => {
    setNavDirection(delta)
    setActiveId((current) => {
      if (!current) return current
      const idx = items.findIndex((i) => i.id === current)
      const next = items[(idx + delta + items.length) % items.length]
      return next.id
    })
  }, [items])

  const onPrev = useCallback(() => goTo(-1), [goTo])
  const onNext = useCallback(() => goTo(1), [goTo])

  useEffect(() => {
    if (!activeId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeZoom()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        onPrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        onNext()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [activeId, closeZoom, onPrev, onNext])

  useEffect(() => {
    if (!activeId) return
    const root = document.documentElement
    const body = document.body
    const lockedY = openScrollYRef.current
    const previous = {
      rootOverflow: root.style.overflow,
      rootOverscroll: root.style.overscrollBehavior,
      rootSnap: root.style.scrollSnapType,
      bodyOverflow: body.style.overflow,
      bodyOverscroll: body.style.overscrollBehavior,
    }
    const preventScroll = (event: Event) => event.preventDefault()
    const holdScrollPosition = () => {
      if (window.scrollY !== lockedY) window.scrollTo({ top: lockedY, behavior: 'instant' })
    }
    root.dataset.playgroundZoomOpen = 'true'
    root.style.overflow = 'hidden'
    root.style.overscrollBehavior = 'none'
    root.style.scrollSnapType = 'none'
    body.style.overflow = 'hidden'
    body.style.overscrollBehavior = 'none'
    window.scrollTo({ top: lockedY, behavior: 'instant' })
    window.addEventListener('scroll', holdScrollPosition, { passive: true })
    window.addEventListener('wheel', preventScroll, { passive: false, capture: true })
    window.addEventListener('touchmove', preventScroll, { passive: false, capture: true })
    return () => {
      delete root.dataset.playgroundZoomOpen
      window.removeEventListener('scroll', holdScrollPosition)
      window.removeEventListener('wheel', preventScroll, { capture: true })
      window.removeEventListener('touchmove', preventScroll, { capture: true })
      root.style.overflow = previous.rootOverflow
      root.style.overscrollBehavior = previous.rootOverscroll
      body.style.overflow = previous.bodyOverflow
      body.style.overscrollBehavior = previous.bodyOverscroll
      root.style.scrollSnapType = previous.rootSnap
      window.scrollTo({ top: lockedY, behavior: 'instant' })
    }
  }, [activeId])

  const handleExitComplete = useCallback(() => {
    lastFocusedRef.current?.focus()
  }, [])

  // A card is "in the zoom view" while it is active or its zoom content is still mounted
  // (exiting after close or after an arrow change). Its media stays in that zoom content and
  // its grid slot stays hidden until the exit finishes, so no card ever animates out empty.
  const isInZoom = (id: string) => id === activeId || Boolean(hostRefs.current.get(id)?.zoom)

  const startReorder = useCallback((id: string) => {
    setDraggingId(id)
    setDropTargetId(null)
  }, [])

  const previewReorder = useCallback((id: string) => {
    setDropTargetId(id)
  }, [])

  const finishReorder = useCallback(
    (sourceId: string, targetId: string) => {
      if (sourceId === targetId) return
      const next = [...orderedItems]
      const from = next.findIndex((item) => item.id === sourceId)
      const to = next.findIndex((item) => item.id === targetId)
      if (from < 0 || to < 0) return
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      setValue('order', next.map((item) => item.id).join(','))
    },
    [orderedItems, setValue],
  )

  const cancelReorder = useCallback(() => {
    setDraggingId(null)
    setDropTargetId(null)
  }, [])

  const style = useMemo(
    () =>
      ({
        '--pg-gap-x': `${values.grid.gapX}px`,
        '--pg-cols-d': values.grid.columnsDesktop,
        '--pg-cols-m': values.grid.columnsMobile,
        '--pg-rows-d': Math.ceil(items.length / values.grid.columnsDesktop),
        '--pg-rows-m': Math.ceil(items.length / values.grid.columnsMobile),
        '--pg-card-d': `${values.grid.cardWidthDesktop}px`,
        '--pg-card-m': `${values.grid.cardWidthMobile}px`,
        '--pg-gap-y': `${values.grid.gapY}px`,
        '--pg-radius': `${values.grid.radius}px`,
        '--pg-top-desktop': `${values.grid.topGapDesktop}px`,
        '--pg-top-mobile': `${values.grid.topGapMobile}px`,
        '--title-size': `${values.title.size}px`,
        '--title-x': `${values.title.x}px`,
        '--title-y': `${values.title.y}px`,
        '--card-title-shadow': values.title.shadow ? undefined : 'none',
        '--shade-start': `${values.shade.start}%`,
        '--shade-end': `${values.shade.end}%`,
        '--shade-opacity': values.shade.opacity,
        '--pg-shade-color': values.shade.color,
        '--pg-hover-scale': values.hover.scale,
        '--pg-hover-ms': `${values.hover.durationMs}ms`,
      }) as CSSProperties,
    [values, items],
  )

  const activeItem = activeId ? items.find((item) => item.id === activeId) : undefined
  // dialkit's ResolvedValues type doesn't drop `_collapsed` from folder types; the runtime value does.
  const titles = values.titles as unknown as Record<string, string>
  const videoLoopSpeeds = values.videoLoopSpeed as unknown as Record<string, number>
  const mediaScales = values.mediaScale as unknown as Record<string, number>
  const selectedRoomVideo =
    ROOM_VIDEO_VARIANTS[values.room.video as keyof typeof ROOM_VIDEO_VARIANTS] ?? ROOM_VIDEO_VARIANTS.dark
  const activeTitle = activeItem ? titles[tuningKeyById[activeItem.id]] : ''
  const zoomTransition = toMotionTransition(values.zoom.spring)

  return (
    <div className={['pg-root', className].filter(Boolean).join(' ')} style={style}>
      <div className="pg-grid">
        {items.map((item) => (
          <PlaygroundCard
            key={item.id}
            item={item}
            title={titles[tuningKeyById[item.id]]}
            isActive={isInZoom(item.id)}
            canReorder={import.meta.env.DEV}
            isDragging={item.id === draggingId}
            isDropTarget={item.id === dropTargetId && item.id !== draggingId}
            onOpen={openCard}
            onReorderStart={startReorder}
            onReorderOver={previewReorder}
            onReorderDrop={finishReorder}
            onReorderEnd={cancelReorder}
            cardRef={setCardEl}
            mediaHostRef={setGridHost}
          />
        ))}
      </div>

      {items.map((item) => {
        if (!item.video && !item.presentation) return null
        const entry = hostRefs.current.get(item.id)
        const inZoom = isInZoom(item.id)
        const target = (inZoom ? entry?.zoom : null) ?? entry?.grid ?? null
        if (!target) return null
        const shouldPlay = inZoom || visibleIds.has(item.id)
        const playbackRate = videoLoopSpeeds[controlKeyById[item.id]] ?? 1
        const mediaScale = mediaScales[controlKeyById[item.id]] ?? 1
        const videoSrc = item.id === 'p08' ? selectedRoomVideo.src : item.video
        const videoPoster = item.id === 'p08' ? selectedRoomVideo.poster : item.poster
        const media =
          item.presentation === 'critical-action' ? (
            <CriticalActionMedia
              shouldPlay={shouldPlay}
              bookScale={mediaScale}
              bookX={values.criticalAction.bookX}
              bookY={values.criticalAction.bookY}
            />
          ) : item.presentation === 'portfolio' && item.video ? (
            <PortfolioMedia
              src={videoSrc!}
              poster={videoPoster}
              shouldPlay={shouldPlay}
              pageSpeed={values.portfolio.pageSpeed}
              floatiness={values.portfolio.floatiness}
              shadow={values.portfolio.shadow}
              scale={values.portfolio.scale}
              tiltX={values.portfolio.tiltX}
              tiltY={values.portfolio.tiltY}
              tiltZ={values.portfolio.tiltZ}
            />
          ) : item.presentation === 'journal' && item.video ? (
            <JournalMedia
              src={videoSrc!}
              poster={videoPoster}
              playbackRate={playbackRate}
              shouldPlay={shouldPlay}
              mediaScale={mediaScale}
              desktopZoom={values.journal.desktopZoom}
              desktopX={values.journal.desktopX}
              desktopY={values.journal.desktopY}
              desktopCropLeft={values.journal.desktopCropLeft}
              desktopCropRight={values.journal.desktopCropRight}
              desktopCropTop={values.journal.desktopCropTop}
              desktopCropBottom={values.journal.desktopCropBottom}
              desktopRadius={values.journal.desktopRadius}
              phoneX={values.journal.phoneX}
              phoneY={values.journal.phoneY}
            />
          ) : item.video ? (
            <div className="pg-video-frame" style={{ '--pg-media-scale': mediaScale } as CSSProperties}>
              <CardVideo
                src={videoSrc!}
                poster={videoPoster}
                playbackRate={playbackRate}
                shouldPlay={shouldPlay}
                className={item.videoFit === 'cover' ? 'pg-video--cover' : undefined}
              />
            </div>
          ) : null
        return media ? createPortal(media, target, item.id) : null
      })}

      {createPortal(
        // Portaled to <body>, outside .pg-root — re-supply the dial vars (shade, title) to the zoom card.
        <div className="pg-zoom-vars" style={style}>
          <AnimatePresence onExitComplete={handleExitComplete}>
            {activeItem && originRect && (
              <PlaygroundZoom
                key="zoom"
                item={activeItem}
                title={activeTitle}
                originRect={originRect}
                transition={zoomTransition}
                widthVw={values.zoom.widthVw}
                maxHeightVh={values.zoom.maxHeightVh}
                blurPx={values.zoom.blur}
                dimOpacity={values.zoom.dimOpacity}
                radiusPx={values.grid.radius}
                hasSiblings={items.length > 1}
                onClose={closeZoom}
                onPrev={onPrev}
                onNext={onNext}
                mediaHostRef={setZoomHost}
                reducedMotion={reducedMotion}
                navPreset={values.nav.preset as NavPreset}
                navDirection={navDirection}
                navTransition={toMotionTransition(values.nav.transition)}
              />
            )}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </div>
  )
}
