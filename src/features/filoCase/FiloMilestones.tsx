import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence } from 'motion/react'
import { useTuningController } from '../../tuning/useTuning'
import { toMotionTransition } from '../playground/motionTransition'
import { FiloPhotoZoom } from './FiloPhotoZoom'
import '../photoStack/photoStack.css'
import './filoMilestones.css'

type Tuple = [number, number, number, number]
type Dials = {
  width: number
  peek: number
  overlap: number
  tilt: number
  lift: number
  depth: number
  pill: { hackathon: string; incubator: string; offsetX: number; offsetY: number; textY: number; textSize: number; padX: number; padY: number }
  zoom: {
    liftGap: number
    liftMs: number
    widthVw: number
    maxHeightVh: number
    blur: number
    dimOpacity: number
    spring: Parameters<typeof toMotionTransition>[0]
  }
  caption: { size: number; x: number; y: number; shadow: boolean; shadeStart: number; shadeEnd: number; shadeOpacity: number }
}

const CONFIG = {
  /** Each photo card's width on desktop (px); phones scale both cards to fit. */
  width: [440, 240, 640, 1] as Tuple,
  /** How much of each card stays tucked under the dark footer sheet (px). */
  peek: [120, 0, 320, 1] as Tuple,
  /** How far the two cards overlap toward each other (px). */
  overlap: [36, 0, 160, 1] as Tuple,
  /** Resting tilt of each card (deg); they lean away from each other. */
  tilt: [4, 0, 12, 0.1] as Tuple,
  /** Hover: how far a card rises out of the footer (px). */
  lift: [56, 0, 160, 1] as Tuple,
  /** Scroll-in: how far the cards start sunk under the footer (px). */
  depth: [260, 0, 600, 10] as Tuple,
  /** Cursor pill shown while a card is hovered, styled like the About photo deck. Empty text hides it. */
  pill: {
    hackathon: { type: 'text' as const, default: 'We won the hackathon! 🏆 🧵', placeholder: 'Left photo pill' },
    incubator: { type: 'text' as const, default: 'Then we joined the MIT Arts Startup Incubator 🚀', placeholder: 'Right photo pill' },
    /** Pill's top-left corner relative to the pointer (px), same as About → Photo stack → caption → cursor. */
    offsetX: [16, -200, 200, 1] as Tuple,
    offsetY: [-51, -200, 200, 1] as Tuple,
    textY: [0.25, -10, 10, 0.25] as Tuple,
    textSize: [12.5, 9, 28, 0.5] as Tuple,
    padX: [16, 0, 40, 0.5] as Tuple,
    padY: [6, 0, 30, 0.5] as Tuple,
  },
  /** Click: the card lifts clear of the footer's top edge, then zooms to the centre like the About playground. */
  zoom: {
    /** Space between the lifted card's bottom and the footer's top edge (px). */
    liftGap: [24, 0, 120, 1] as Tuple,
    /** Length of the lift before the zoom starts (ms). */
    liftMs: [380, 120, 1000, 10] as Tuple,
    /** Zoomed size, same defaults as Playground → zoom. */
    widthVw: [80, 40, 100, 1] as Tuple,
    maxHeightVh: [80, 40, 100, 1] as Tuple,
    blur: [20, 0, 60, 1] as Tuple,
    dimOpacity: [0.6, 0, 1, 0.01] as Tuple,
    spring: { type: 'spring', visualDuration: 0.5, bounce: 0.2 } as const,
  },
  /** Zoomed photo: the pill text sits at the bottom over a shade. Defaults match the saved Playground title/shade dials. */
  caption: {
    size: [16, 10, 32, 1] as Tuple,
    x: [22, 0, 80, 1] as Tuple,
    y: [22, 0, 80, 1] as Tuple,
    shadow: true,
    shadeStart: [0, 0, 100, 1] as Tuple,
    shadeEnd: [100, 0, 100, 1] as Tuple,
    shadeOpacity: [0.48, 0, 1, 0.01] as Tuple,
  },
}

const CARDS = [
  { name: 'hackathon', alt: 'The Filo team holding the hackathon prize cheque beside an MIT Design X banner.' },
  { name: 'incubator', alt: 'The Filo team in front of the MIT Arts Startup Incubator welcome slide, December 2024.' },
] as const
type CardName = (typeof CARDS)[number]['name']

const RATIO = 4 / 3
const RADIUS = 20
const srcSetFor = (name: CardName) => `/work/filo/milestones/${name}-800.webp 800w, /work/filo/milestones/${name}-1600.webp 1600w`
const srcFor = (name: CardName) => `/work/filo/milestones/${name}-1600.webp`

/** Hold the page still while a photo is lifted or zoomed: no wheel, touch or keyboard scrolling behind it. */
function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return
    const root = document.documentElement
    const body = document.body
    const lockedY = window.scrollY
    const previous = { root: root.style.overflow, body: body.style.overflow, snap: root.style.scrollSnapType }
    const prevent = (event: Event) => event.preventDefault()
    const hold = () => {
      if (window.scrollY !== lockedY) window.scrollTo({ top: lockedY, behavior: 'instant' })
    }
    root.style.overflow = 'hidden'
    root.style.scrollSnapType = 'none'
    body.style.overflow = 'hidden'
    window.addEventListener('scroll', hold, { passive: true })
    window.addEventListener('wheel', prevent, { passive: false, capture: true })
    window.addEventListener('touchmove', prevent, { passive: false, capture: true })
    return () => {
      window.removeEventListener('scroll', hold)
      window.removeEventListener('wheel', prevent, { capture: true })
      window.removeEventListener('touchmove', prevent, { capture: true })
      root.style.overflow = previous.root
      root.style.scrollSnapType = previous.snap
      body.style.overflow = previous.body
      window.scrollTo({ top: lockedY, behavior: 'instant' })
    }
  }, [locked])
}

/**
 * Two photos tucked under the footer sheet, like the Momo paper: they rise on scroll-in and lift on hover.
 * Click: the card lifts above the footer's edge, then FLIPs into a centred lightbox; closing FLIPs it back
 * onto the lifted card, which then sinks back into place.
 */
export function FiloMilestones() {
  const { values } = useTuningController('Filo milestones', CONFIG)
  const d = values as unknown as Dials
  const ref = useRef<HTMLDivElement>(null)
  const followRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef(new Map<CardName, HTMLButtonElement>())
  const [hovered, setHovered] = useState<CardName | null>(null)
  // Lifted: the card is raised above the footer (and stays raised under the zoom until the exit lands).
  const [lifted, setLifted] = useState<CardName | null>(null)
  const [zoom, setZoom] = useState<{ name: CardName; origin: DOMRect } | null>(null)
  const [landing, setLanding] = useState<DOMRect | undefined>(undefined)
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  useScrollLock(lifted !== null)

  // Keep the last text while the pill fades out.
  const lastRef = useRef<CardName>('hackathon')
  if (hovered) lastRef.current = hovered
  const shown = hovered !== null && lifted === null && d.pill[hovered].trim() !== ''

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.25) el.dataset.risen = ''
        else if (!entry.isIntersecting) delete el.dataset.risen
      },
      { threshold: [0, 0.25] },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Lift, then zoom from the card's lifted rect once the lift has settled.
  useEffect(() => {
    if (!lifted || zoom) return
    const card = cardRefs.current.get(lifted)
    if (!card) return
    const open = () => setZoom({ name: lifted, origin: card.getBoundingClientRect() })
    if (reducedMotion) {
      open()
      return
    }
    const timer = window.setTimeout(open, d.zoom.liftMs + 40)
    const onEnd = (event: TransitionEvent) => {
      if (event.target === card && event.propertyName === 'translate') open()
    }
    card.addEventListener('transitionend', onEnd)
    return () => {
      window.clearTimeout(timer)
      card.removeEventListener('transitionend', onEnd)
    }
    // Only the lift starting schedules the zoom; dial changes mid-lift don't restart it.
  }, [lifted])

  const close = useCallback(() => {
    if (!zoom) return
    setLanding(cardRefs.current.get(zoom.name)?.getBoundingClientRect())
    setZoom(null)
  }, [zoom])

  // Exit landed on the lifted card: show it again, then let it sink back into place.
  const onExitComplete = useCallback(() => {
    const name = lifted
    setLanding(undefined)
    setLifted(null)
    if (name) cardRefs.current.get(name)?.focus({ preventScroll: true })
  }, [lifted])

  // Position the pill straight from pointermove, without a re-render per move.
  const follow = (event: PointerEvent) => {
    const el = followRef.current
    if (el && event.pointerType === 'mouse') el.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`
  }

  return (
    <div
      ref={ref}
      className="filo-milestones"
      data-lifting={lifted ? '' : undefined}
      style={{
        '--ms-w': `${d.width}px`,
        '--ms-peek': `${d.peek}px`,
        '--ms-overlap': `${d.overlap}px`,
        '--ms-tilt': `${d.tilt}deg`,
        '--ms-lift': `${d.lift}px`,
        '--ms-depth': `${d.depth}px`,
        '--ms-lift-gap': `${d.zoom.liftGap}px`,
        '--ms-lift-ms': `${d.zoom.liftMs}ms`,
      } as CSSProperties}
    >
      {CARDS.map((card) => (
        <button
          type="button"
          className="filo-milestones__card"
          key={card.name}
          ref={(el) => {
            if (el) cardRefs.current.set(card.name, el)
            else cardRefs.current.delete(card.name)
          }}
          // Dark surface: the cursor dot turns white over the photos and grows as over any control.
          data-surface="dark"
          data-lifted={lifted === card.name ? '' : undefined}
          data-zoomed={zoom?.name === card.name || (lifted === card.name && landing !== undefined) ? '' : undefined}
          aria-label={`Enlarge photo: ${card.alt}`}
          onClick={() => {
            if (lifted) return
            setHovered(null)
            setLifted(card.name)
          }}
          onPointerEnter={(event) => {
            if (event.pointerType !== 'mouse') return
            follow(event)
            setHovered(card.name)
          }}
          onPointerMove={follow}
          onPointerLeave={() => setHovered(null)}
        >
          <img
            srcSet={srcSetFor(card.name)}
            sizes={`min(${d.width}px, 46vw)`}
            src={srcFor(card.name)}
            width={1600}
            height={1200}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        </button>
      ))}
      {createPortal(
        <>
          <div
            ref={followRef}
            className="ps-caption-follow"
            aria-hidden="true"
            style={
              {
                '--ps-cur-x': `${d.pill.offsetX}px`,
                '--ps-cur-y': `${d.pill.offsetY}px`,
                '--ps-cur-size': `${d.pill.textSize}px`,
                '--ps-cur-pad-x': `${d.pill.padX}px`,
                '--ps-cur-pad-y': `${d.pill.padY}px`,
                '--ps-cur-text-y': `${d.pill.textY}px`,
              } as CSSProperties
            }
          >
            <span className={`ps-caption ps-caption--cursor ps-caption--light${shown ? ' is-shown' : ''}`}>{d.pill[lastRef.current]}</span>
          </div>
          <AnimatePresence custom={landing} onExitComplete={onExitComplete}>
            {zoom && (
              <FiloPhotoZoom
                key="zoom"
                srcSet={srcSetFor(zoom.name)}
                src={srcFor(zoom.name)}
                alt={CARDS.find((card) => card.name === zoom.name)!.alt}
                caption={d.pill[zoom.name]}
                captionStyle={
                  {
                    '--title-size': `${d.caption.size}px`,
                    '--title-x': `${d.caption.x}px`,
                    '--title-y': `${d.caption.y}px`,
                    '--card-title-shadow': d.caption.shadow ? undefined : 'none',
                    '--shade-start': `${d.caption.shadeStart}%`,
                    '--shade-end': `${d.caption.shadeEnd}%`,
                    '--shade-opacity': d.caption.shadeOpacity,
                  } as CSSProperties
                }
                originRect={zoom.origin}
                ratio={RATIO}
                widthVw={d.zoom.widthVw}
                maxHeightVh={d.zoom.maxHeightVh}
                blurPx={d.zoom.blur}
                dimOpacity={d.zoom.dimOpacity}
                radiusPx={RADIUS}
                transition={toMotionTransition(d.zoom.spring)}
                reducedMotion={reducedMotion}
                onClose={close}
              />
            )}
          </AnimatePresence>
        </>,
        document.body,
      )}
    </div>
  )
}
