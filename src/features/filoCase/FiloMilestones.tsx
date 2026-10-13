import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { useTuningController } from '../../tuning/useTuning'
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
}

const CARDS = [
  { name: 'hackathon', alt: 'The Filo team holding the hackathon prize cheque beside an MIT Design X banner.' },
  { name: 'incubator', alt: 'The Filo team in front of the MIT Arts Startup Incubator welcome slide, December 2024.' },
] as const

/** Two photos tucked under the footer sheet, like the Momo paper: they rise on scroll-in and lift on hover. */
export function FiloMilestones() {
  const { values } = useTuningController('Filo milestones', CONFIG)
  const d = values as unknown as Dials
  const ref = useRef<HTMLDivElement>(null)
  const followRef = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState<(typeof CARDS)[number]['name'] | null>(null)
  // Keep the last text while the pill fades out.
  const lastRef = useRef<(typeof CARDS)[number]['name']>('hackathon')
  if (hovered) lastRef.current = hovered
  const shown = hovered !== null && d.pill[hovered].trim() !== ''

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

  // Position the pill straight from pointermove, without a re-render per move.
  const follow = (event: PointerEvent) => {
    const el = followRef.current
    if (el && event.pointerType === 'mouse') el.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`
  }

  return (
    <div
      ref={ref}
      className="filo-milestones"
      style={{
        '--ms-w': `${d.width}px`,
        '--ms-peek': `${d.peek}px`,
        '--ms-overlap': `${d.overlap}px`,
        '--ms-tilt': `${d.tilt}deg`,
        '--ms-lift': `${d.lift}px`,
        '--ms-depth': `${d.depth}px`,
      } as CSSProperties}
    >
      {CARDS.map((card) => (
        <figure
          className="filo-milestones__card"
          key={card.name}
          onPointerEnter={(event) => {
            if (event.pointerType !== 'mouse') return
            follow(event)
            setHovered(card.name)
          }}
          onPointerMove={follow}
          onPointerLeave={() => setHovered(null)}
        >
          <img
            srcSet={`/work/filo/milestones/${card.name}-800.webp 800w, /work/filo/milestones/${card.name}-1600.webp 1600w`}
            sizes={`min(${d.width}px, 46vw)`}
            src={`/work/filo/milestones/${card.name}-1600.webp`}
            width={1600}
            height={1200}
            alt={card.alt}
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        </figure>
      ))}
      {createPortal(
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
        </div>,
        document.body,
      )}
    </div>
  )
}
