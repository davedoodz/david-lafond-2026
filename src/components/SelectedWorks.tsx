/**
 * White "Selected works" panel.
 *
 * Its background width is scroll-linked: at landing only the top edge peeks
 * out at the WIDE width; scrolling in narrows it toward the cards (focus), and
 * once the bottom edge comes into view it widens back out.
 *
 *   n = ease(enter) · (1 − ease(exit))        0 = wide, 1 = narrow
 *   enter: panel top travels `shrinkDistance`·vh up from its landing position
 *   exit:  panel bottom travels `widenDistance`·vh up from `widenStart`·vh
 *
 * Only a clip-path on a flat background layer changes, so cards never re-layout.
 */
import { useEffect, useRef, type CSSProperties } from 'react'
import { WORKS } from '../data/works'
import { useTuning } from '../tuning/useTuning'
import { ArrowDownIcon } from './icons'
import { MeshCard } from './MeshCard'
import './SelectedWorks.css'

type Tuple = [number, number, number, number]

const CONFIG = {
  cards: {
    unwind: { type: 'color' as const, default: '#57BFFF' },
    ecofabriq: { type: 'color' as const, default: '#FFE1E2' },
    'harvard-mit': { type: 'color' as const, default: '#171717' },
  },
  titles: {
    unwindDesktop: { type: 'text' as const, default: WORKS[0].title },
    unwindMobile: { type: 'text' as const, default: WORKS[0].shortTitle },
    ecofabriqDesktop: { type: 'text' as const, default: WORKS[1].title },
    ecofabriqMobile: { type: 'text' as const, default: WORKS[1].shortTitle },
    harvardMitDesktop: { type: 'text' as const, default: WORKS[2].title },
    harvardMitMobile: { type: 'text' as const, default: WORKS[2].shortTitle },
    sizeDesktop: [20, 12, 36, 1] as Tuple,
    sizeMobile: [16, 10, 28, 1] as Tuple,
    shadowOpacity: [0.35, 0, 1, 0.01] as Tuple,
    shadowBlur: [14, 0, 40, 1] as Tuple,
    shadeOpacity: [0.45, 0, 1, 0.01] as Tuple,
    shadeStart: [50, 0, 100, 1] as Tuple,
    _collapsed: true,
  },
  width: {
    desktopWideInset: [2.8, 0, 12, 0.1] as Tuple,
    desktopNarrowInset: [7.7, 0, 20, 0.1] as Tuple,
    mobileWideInset: [4, 0, 12, 0.1] as Tuple,
    mobileNarrowInset: [7, 0, 20, 0.1] as Tuple,
    shrinkDistance: [0.5, 0.1, 1.5, 0.01] as Tuple,
    widenStart: [0.1, -0.5, 0.8, 0.01] as Tuple,
    widenDistance: [0.4, 0.1, 1.5, 0.01] as Tuple,
    peek: [76, 0, 240, 1] as Tuple,
    _collapsed: true,
  },
  shape: {
    radiusDesktop: [45, 0, 80, 1] as Tuple,
    radiusMobile: [20, 0, 60, 1] as Tuple,
    cardRadiusDesktop: [25, 0, 60, 1] as Tuple,
    cardRadiusMobile: [11, 0, 40, 1] as Tuple,
    _collapsed: true,
  },
}

const TITLE_KEYS = {
  unwind: ['unwindDesktop', 'unwindMobile'],
  ecofabriq: ['ecofabriqDesktop', 'ecofabriqMobile'],
  'harvard-mit': ['harvardMitDesktop', 'harvardMitMobile'],
} as const

const smooth = (x: number) => x * x * (3 - 2 * x)
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)

export function SelectedWorks() {
  const t = useTuning('Selected works', CONFIG)
  const sectionRef = useRef<HTMLElement>(null)
  const width = t.width
  const widthKey = JSON.stringify(width)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const mobileQuery = window.matchMedia('(max-width: 640px)')
    let frame = 0

    const update = () => {
      frame = 0
      const w = width
      const vh = window.innerHeight
      const vw = document.documentElement.clientWidth
      const rect = section.getBoundingClientRect()
      const enter = clamp01((vh - w.peek - rect.top) / (w.shrinkDistance * vh))
      const exit = clamp01((vh * (1 - w.widenStart) - rect.bottom) / (w.widenDistance * vh))
      const n = smooth(enter) * (1 - smooth(exit))
      const [wide, narrow] = mobileQuery.matches ? [w.mobileWideInset, w.mobileNarrowInset] : [w.desktopWideInset, w.desktopNarrowInset]
      const inset = ((wide + (narrow - wide) * n) / 100) * vw
      section.style.setProperty('--works-inset', `${inset.toFixed(2)}px`)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    mobileQuery.addEventListener('change', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      mobileQuery.removeEventListener('change', schedule)
    }
    // `width` is captured fresh whenever any width dial changes.
  }, [widthKey])

  const style = {
    '--works-radius-d': `${t.shape.radiusDesktop}px`,
    '--works-radius-m': `${t.shape.radiusMobile}px`,
    '--works-card-radius-d': `${t.shape.cardRadiusDesktop}px`,
    '--works-card-radius-m': `${t.shape.cardRadiusMobile}px`,
    '--works-title-d': `${t.titles.sizeDesktop}px`,
    '--works-title-m': `${t.titles.sizeMobile}px`,
    '--card-title-shadow': `0 0 ${t.titles.shadowBlur}px rgb(255 255 255 / ${t.titles.shadowOpacity})`,
    '--shade-opacity': t.titles.shadeOpacity,
    '--shade-start': `${t.titles.shadeStart}%`,
  } as CSSProperties

  return (
    <section ref={sectionRef} className="works" data-surface="light" aria-labelledby="works-heading" style={style}>
      <div className="works__bg" aria-hidden="true" />
      <div className="works__inner">
        <h2 id="works-heading" className="eyebrow works__eyebrow column">
          Selected works <ArrowDownIcon />
        </h2>
        <ul className="works__list">
          {WORKS.map((work) => {
            const [desktopKey, mobileKey] = TITLE_KEYS[work.id]
            return (
              <li key={work.id}>
                <article
                  className="works__card"
                  data-surface={work.surface}
                  style={{ backgroundColor: t.cards[work.id] }}
                  aria-label={t.titles[desktopKey]}
                >
                  {work.id === 'unwind' && <MeshCard />}
                  <div className="card-shade" />
                  <h3 className="card-title works__title">
                    <span className="works__title-desktop">{t.titles[desktopKey]}</span>
                    <span className="works__title-mobile">{t.titles[mobileKey]}</span>
                  </h3>
                </article>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
