import { useEffect, useRef, type CSSProperties, type PointerEvent } from 'react'
import { useTuningController } from '../../tuning/useTuning'
import { ArrowUpRightIcon } from '../../components/icons'
import { ARROW_HEAD, ARROW_SHAFT, LOOP } from './markerPaths'
import './arxivPaper.css'

type Tuple = [number, number, number, number]
type PaperDials = {
  pill: string
  width: number
  peek: number
  lift: number
  tilt: number
  shadow: { opacity: number; blur: number; y: number }
  arrow: { x: number; y: number; scale: number }
  pillSize: { padX: number; padY: number; text: number }
  pillOffset: { x: number; y: number }
  marker: { show: boolean; color: string; note: string }
  entrance: { show: boolean; depth: number; duration: number; trigger: number }
}

export const ARXIV_PAPER_URL = 'https://arxiv.org/abs/2604.06477'

export const MOMO_PAPER_CONFIG = {
  pill: { type: 'text' as const, default: 'read our 2026 HCI paper on ArXiv' },
  /** The footer links' up-right arrow after the pill text: offset (px) and scale. */
  arrow: {
    x: [0, -12, 12, 0.5] as Tuple,
    y: [0, -12, 12, 0.5] as Tuple,
    scale: [1, 0.5, 2, 0.01] as Tuple,
  },
  /** Pill box: horizontal and vertical padding and text size (px). Desktop; phones keep 13px text. */
  pillSize: {
    padX: [16, 8, 48, 1] as Tuple,
    padY: [9, 4, 24, 1] as Tuple,
    text: [15, 11, 24, 0.5] as Tuple,
  },
  /** Pill's top-left corner relative to the pointer (px), matching About → Photo stack → caption → cursor. */
  pillOffset: {
    x: [16, -200, 200, 1] as Tuple,
    y: [-51, -200, 200, 1] as Tuple,
  },
  /** Red marker note drawn on the page on hover: a loop around David's name, an arrow and a note. */
  marker: {
    show: true,
    color: { type: 'color' as const, default: '#E0352B' },
    note: { type: 'text' as const, default: 'i’m here!' },
  },
  /** Paper width on desktop (px); phones cap it to the screen. */
  width: [504, 280, 760, 1] as Tuple,
  /** How much of the paper's bottom stays tucked under the dark footer sheet (px). */
  peek: [140, 0, 480, 1] as Tuple,
  /** Hover: how far the paper rises out from under the footer (px), and its tilt (deg). */
  lift: [28, 0, 120, 1] as Tuple,
  tilt: [1.5, 0, 8, 0.1] as Tuple,
  shadow: {
    opacity: [0.14, 0, 0.5, 0.01] as Tuple,
    blur: [80, 0, 200, 1] as Tuple,
    y: [24, 0, 120, 1] as Tuple,
  },
  /** Scroll-in: the paper starts sunk under the footer and pops up each time the section comes into view.
   *  Depth (px) is how far it starts below its rest place; Trigger is how much of the section must show. */
  entrance: {
    show: true,
    depth: [360, 60, 900, 10] as Tuple,
    duration: [0.9, 0.2, 2.5, 0.05] as Tuple,
    trigger: [0.3, 0.05, 0.9, 0.05] as Tuple,
  },
}

/**
 * The Momo paper's first page, tucked under the case study's dark footer sheet. The whole sheet is one
 * link to arXiv (new tab); hovering lifts it out and a pill follows the pointer.
 */
export function ArxivPaper() {
  const { values } = useTuningController('Momo paper', MOMO_PAPER_CONFIG)
  const d = values as unknown as PaperDials
  const ref = useRef<HTMLAnchorElement>(null)
  const { show: entrance, trigger } = d.entrance

  // Pop up from under the footer whenever the section scrolls into view; sink again once it's fully out
  // so the next visit replays. Watches the section, not the paper, because the paper itself moves.
  useEffect(() => {
    const el = ref.current
    const section = el?.parentElement
    if (!el || !section) return
    if (!entrance) {
      el.dataset.risen = ''
      return
    }
    delete el.dataset.risen
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= trigger) el.dataset.risen = ''
        else if (!entry.isIntersecting) delete el.dataset.risen
      },
      { threshold: [0, trigger] },
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [entrance, trigger])

  // The pill follows the pointer; written straight to CSS vars so moving never re-renders.
  const follow = (event: PointerEvent<HTMLAnchorElement>) => {
    const el = ref.current
    if (!el || event.pointerType === 'touch') return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--pill-x', `${event.clientX - r.left}px`)
    el.style.setProperty('--pill-y', `${event.clientY - r.top}px`)
    el.dataset.pointer = ''
  }

  return (
    <a
      ref={ref}
      className="arxiv-paper"
      href={ARXIV_PAPER_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${d.pill} (opens in a new tab)`}
      onPointerEnter={follow}
      onPointerMove={follow}
      onPointerLeave={() => ref.current && delete ref.current.dataset.pointer}
      style={
        {
          '--paper-w': `${d.width}px`,
          '--paper-peek': `${d.peek}px`,
          '--paper-lift': `${d.lift}px`,
          '--paper-tilt': `${d.tilt}deg`,
          '--paper-shadow': `0 ${d.shadow.y}px ${d.shadow.blur}px rgb(0 0 0 / ${d.shadow.opacity})`,
          '--pill-arrow-x': `${d.arrow.x}px`,
          '--pill-arrow-y': `${d.arrow.y}px`,
          '--pill-arrow-scale': d.arrow.scale,
          '--pill-pad-x': `${d.pillSize.padX}px`,
          '--pill-pad-y': `${d.pillSize.padY}px`,
          '--pill-text': `${d.pillSize.text}px`,
          '--pill-off-x': `${d.pillOffset.x}px`,
          '--pill-off-y': `${d.pillOffset.y}px`,
          '--marker': d.marker.color,
          '--paper-rise-depth': `${d.entrance.depth}px`,
          '--paper-rise-time': `${d.entrance.duration}s`,
        } as CSSProperties
      }
    >
      <span className="arxiv-paper__sheet">
        <img
          className="arxiv-paper__page"
          srcSet="/work/momo/paper/arxiv-paper-900.webp 900w, /work/momo/paper/arxiv-paper-1600.webp 1600w"
          sizes={`min(${d.width}px, 100vw - 48px)`}
          src="/work/momo/paper/arxiv-paper-1600.webp"
          width={1600}
          height={2071}
          loading="lazy"
          decoding="async"
          alt="First page of “Breaking Negative Cycles: A Reflection-To-Action System For Adaptive Change”, arXiv:2604.06477"
          draggable={false}
        />
        {d.marker.show && (
          <svg className="arxiv-paper__marks" viewBox="0 0 100 129.44" aria-hidden="true">
            <defs>
              {/* Rough, slightly bleeding marker edge. */}
              <filter id="arxiv-paper-ink" x="-5%" y="-5%" width="110%" height="110%">
                <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="7" />
                <feDisplacementMap in="SourceGraphic" scale="0.45" />
              </filter>
            </defs>
            <g filter="url(#arxiv-paper-ink)">
              <path className="arxiv-paper__mark arxiv-paper__mark--loop" d={LOOP} pathLength={1} />
              <path className="arxiv-paper__mark arxiv-paper__mark--shaft" d={ARROW_SHAFT} pathLength={1} />
              <path className="arxiv-paper__mark arxiv-paper__mark--head" d={ARROW_HEAD} pathLength={1} />
              <text className="arxiv-paper__note" x="88" y="8.4" transform="rotate(-7 88 8.4)">
                {d.marker.note}
              </text>
            </g>
          </svg>
        )}
      </span>
      <span className="arxiv-paper__pill" aria-hidden="true">
        {d.pill}
        <ArrowUpRightIcon className="arxiv-paper__arrow" />
      </span>
    </a>
  )
}
