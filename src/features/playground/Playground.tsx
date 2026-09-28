import { createPortal } from 'react-dom'
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type CSSProperties } from 'react'
import { AnimatePresence, useReducedMotion } from 'motion/react'
import type { DialConfig } from 'dialkit'
import { useTuning } from '../../tuning/useTuning'
import { playgroundItems } from '../../data/playground'
import { CardVideo } from './CardVideo'
import { PlaygroundCard } from './PlaygroundCard'
import { PlaygroundZoom } from './PlaygroundZoom'
import { toMotionTransition } from './motionTransition'
import './Playground.css'

const titleFields: Record<string, { type: 'text'; default: string; placeholder: string }> = {}
for (const [i, item] of playgroundItems.entries()) {
  titleFields[`card${i + 1}`] = { type: 'text', default: item.title, placeholder: item.title }
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
  grid: {
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
} satisfies DialConfig

type HostRefs = { grid: HTMLDivElement | null; zoom: HTMLDivElement | null }

export function Playground({ className }: { className?: string }) {
  const values = useTuning('Playground', PLAYGROUND_CONFIG)
  const reducedMotion = Boolean(useReducedMotion())

  const [activeId, setActiveId] = useState<string | null>(null)
  const [originRect, setOriginRect] = useState<DOMRect | null>(null)
  const [visibleIds, setVisibleIds] = useState<Set<string>>(() => new Set())

  const cardElRefs = useRef(new Map<string, HTMLButtonElement>())
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

  // Play/pause each grid video only while its card is on screen (or zoomed, handled below).
  useEffect(() => {
    const withVideo = playgroundItems.filter((item) => item.video)
    if (withVideo.length === 0) return
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
      for (const item of withVideo) {
        const el = cardElRefs.current.get(item.id)
        if (el) observer.observe(el)
      }
    })
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [])

  const openCard = useCallback((id: string, el: HTMLButtonElement) => {
    lastFocusedRef.current = el
    setOriginRect(el.getBoundingClientRect())
    setActiveId(id)
  }, [])

  const closeZoom = useCallback(() => {
    setActiveId((currentId) => {
      if (currentId) {
        const el = cardElRefs.current.get(currentId)
        if (el) setOriginRect(el.getBoundingClientRect())
      }
      return null
    })
  }, [])

  const goTo = useCallback((delta: number) => {
    setActiveId((current) => {
      if (!current) return current
      const idx = playgroundItems.findIndex((i) => i.id === current)
      const next = playgroundItems[(idx + delta + playgroundItems.length) % playgroundItems.length]
      return next.id
    })
  }, [])

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
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [activeId])

  const handleExitComplete = useCallback(() => {
    lastFocusedRef.current?.focus()
  }, [])

  const style = useMemo(
    () =>
      ({
        '--pg-gap-x': `${values.grid.gapX}px`,
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
    [values],
  )

  const activeItem = activeId ? playgroundItems.find((i) => i.id === activeId) : undefined
  const activeIndex = activeId ? playgroundItems.findIndex((i) => i.id === activeId) : -1
  // dialkit's ResolvedValues type doesn't drop `_collapsed` from folder types; the runtime value does.
  const titles = values.titles as unknown as Record<string, string>
  const activeTitle = activeIndex >= 0 ? titles[`card${activeIndex + 1}`] : ''
  const zoomTransition = toMotionTransition(values.zoom.spring)

  return (
    <div className={['pg-root', className].filter(Boolean).join(' ')} style={style}>
      <div className="pg-grid">
        {playgroundItems.map((item, i) => (
          <PlaygroundCard
            key={item.id}
            item={item}
            title={titles[`card${i + 1}`]}
            isActive={item.id === activeId}
            onOpen={openCard}
            cardRef={setCardEl}
            mediaHostRef={setGridHost}
          />
        ))}
      </div>

      {playgroundItems
        .filter((item) => item.video)
        .map((item) => {
          const entry = hostRefs.current.get(item.id)
          const target = (item.id === activeId ? entry?.zoom : null) ?? entry?.grid ?? null
          if (!target) return null
          return createPortal(
            <CardVideo src={item.video!} poster={item.poster} shouldPlay={item.id === activeId || visibleIds.has(item.id)} />,
            target,
            item.id,
          )
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
                hasSiblings={playgroundItems.length > 1}
                onClose={closeZoom}
                onPrev={onPrev}
                onNext={onNext}
                mediaHostRef={setZoomHost}
                reducedMotion={reducedMotion}
              />
            )}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </div>
  )
}
