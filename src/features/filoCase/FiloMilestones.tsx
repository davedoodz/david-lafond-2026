import { useEffect, useRef, type CSSProperties } from 'react'
import { useTuningController } from '../../tuning/useTuning'
import './filoMilestones.css'

type Tuple = [number, number, number, number]
type Dials = { width: number; peek: number; overlap: number; tilt: number; lift: number; depth: number }

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
}

const CARDS = [
  { name: 'hackathon', alt: 'The Filo team holding the hackathon prize cheque beside an MIT Design X banner.' },
  { name: 'incubator', alt: 'The Filo team in front of the MIT Arts Startup Incubator welcome slide, December 2024.' },
]

/** Two photos tucked under the footer sheet, like the Momo paper: they rise on scroll-in and lift on hover. */
export function FiloMilestones() {
  const { values } = useTuningController('Filo milestones', CONFIG)
  const d = values as unknown as Dials
  const ref = useRef<HTMLDivElement>(null)

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
        <figure className="filo-milestones__card" key={card.name}>
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
    </div>
  )
}
