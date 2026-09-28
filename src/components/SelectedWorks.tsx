/**
 * White "Selected works" panel.
 *
 * At landing the panel sits fully below the fold. Scrolling pulls its top edge
 * up as a dome (side inset + tall elliptical top) that flattens until the white
 * bleeds edge to edge. Near the end the bottom edge does the reverse, curving
 * back into the black above the contact section.
 *
 *   enter e: panel top travels `enterDistance`·vh up from the viewport bottom
 *   exit  x: panel bottom travels `exitDistance`·vh up from `exitStart`·vh
 *
 * Only a clip-path on a flat background layer changes, so cards never re-layout.
 * Optional scroll snap centres one project per stop.
 */
import { useEffect, useRef, type CSSProperties } from 'react'
import { WORKS } from '../data/works'
import { useTuning } from '../tuning/useTuning'
import { ArrowDownIcon, ArrowDownRightIcon } from './icons'
import { MeshCard } from './MeshCard'
import { useProjectOpen } from '../features/projectOpen/useProjectOpen'
import { PATH_BY_ROUTE } from '../lib/router'
import './SelectedWorks.css'

type Tuple = [number, number, number, number]

const CURVES: Record<string, (x: number) => number> = {
  smooth: (x) => x * x * (3 - 2 * x),
  linear: (x) => x,
  'expo-out': (x) => (x >= 1 ? 1 : 1 - 2 ** (-10 * x)),
  smoother: (x) => x * x * x * (x * (x * 6 - 15) + 10),
}

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
  /** Dome in at the top, dome out at the bottom. Sides in % of viewport width, arches in % of viewport height. */
  morph: {
    curve: { type: 'select' as const, options: Object.keys(CURVES), default: 'smoother' },
    enterDistance: [1, 0.2, 2.5, 0.01] as Tuple,
    startSide: [14, 0, 45, 0.5] as Tuple,
    startArch: [40, 0, 100, 1] as Tuple,
    startRadius: [45, 0, 200, 1] as Tuple,
    exitStart: [0, -0.5, 0.8, 0.01] as Tuple,
    exitDistance: [0.9, 0.2, 2.5, 0.01] as Tuple,
    endSide: [14, 0, 45, 0.5] as Tuple,
    endArch: [40, 0, 100, 1] as Tuple,
    endRadius: [45, 0, 200, 1] as Tuple,
    _collapsed: false,
  },
  /** Vertical rhythm. Gaps are in % of viewport height so one project fills each stop. */
  spacing: {
    snap: { type: 'select' as const, options: ['off', 'proximity', 'mandatory'], default: 'off' },
    topDesktop: [120, 0, 400, 1] as Tuple,
    labelToFirstDesktop: [73, 0, 300, 1] as Tuple,
    gapDesktop: [35, 5, 100, 1] as Tuple,
    bottomDesktop: [260, 0, 800, 1] as Tuple,
    topMobile: [60, 0, 300, 1] as Tuple,
    labelToFirstMobile: [35, 0, 200, 1] as Tuple,
    gapMobile: [25, 5, 100, 1] as Tuple,
    bottomMobile: [140, 0, 600, 1] as Tuple,
    _collapsed: false,
  },
  shape: {
    cardRadiusDesktop: [25, 0, 60, 1] as Tuple,
    cardRadiusMobile: [11, 0, 40, 1] as Tuple,
    _collapsed: true,
  },
  /** "Selected works" label above the first project. */
  label: {
    show: true,
    arrow: { type: 'select' as const, options: ['down', 'down-right'], default: 'down' },
    size: [14, 8, 40, 0.5] as Tuple,
    sizeMobile: [10, 6, 30, 0.5] as Tuple,
    arrowSize: [0.7, 0.3, 2, 0.05] as Tuple,
    _collapsed: false,
  },
  hover: {
    scale: [1.03, 1, 1.15, 0.005] as Tuple,
    durationMs: [450, 0, 1200, 10] as Tuple,
  },
}

const TITLE_KEYS = {
  unwind: ['unwindDesktop', 'unwindMobile'],
  ecofabriq: ['ecofabriqDesktop', 'ecofabriqMobile'],
  'harvard-mit': ['harvardMitDesktop', 'harvardMitMobile'],
} as const

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)

export function SelectedWorks() {
  const t = useTuning('Selected works', CONFIG)
  const openProject = useProjectOpen()
  const sectionRef = useRef<HTMLElement>(null)
  const morph = t.morph
  const morphKey = JSON.stringify(morph)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0

    const update = () => {
      frame = 0
      const vh = window.innerHeight
      const vw = document.documentElement.clientWidth
      const rect = section.getBoundingClientRect()
      const curve = CURVES[morph.curve] ?? CURVES.smooth
      // Enter starts from wherever the panel sits at scroll 0 (its peek), so the dome tip shows on load.
      const restTop = rect.top + window.scrollY
      const e = reduced ? 1 : curve(clamp01((restTop - rect.top) / (morph.enterDistance * vh)))
      const x = reduced ? 0 : curve(clamp01((vh * (1 - morph.exitStart) - rect.bottom) / (morph.exitDistance * vh)))

      const side = Math.max(morph.startSide * (1 - e), morph.endSide * x) * vw / 100
      // Each edge: corner radius r plus an arch. The horizontal radius slides from
      // r to 50% (a full dome) and the vertical radius to the arch height.
      const edge = (radius: number, arch: number, k: number) => {
        const r = radius * k
        const a = arch > 0 ? k : 0
        return {
          x: `calc(${r.toFixed(2)}px + (50% - ${r.toFixed(2)}px) * ${a.toFixed(4)})`,
          y: `${Math.max(r, (arch / 100) * vh * k).toFixed(2)}px`,
        }
      }
      const top = edge(morph.startRadius, morph.startArch, 1 - e)
      const bottom = edge(morph.endRadius, morph.endArch, x)
      section.style.setProperty(
        '--works-clip',
        `inset(0 ${side.toFixed(2)}px round ${top.x} ${top.x} ${bottom.x} ${bottom.x} / ${top.y} ${top.y} ${bottom.y} ${bottom.y})`,
      )
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
    // `morphKey` captures every morph dial.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [morphKey])

  // Scroll snap lives on <html>; only while this page is mounted.
  const snap = t.spacing.snap
  useEffect(() => {
    if (snap === 'off') return
    const root = document.documentElement
    root.dataset.worksSnap = snap
    return () => {
      delete root.dataset.worksSnap
    }
  }, [snap])

  const sp = t.spacing
  const style = {
    '--works-card-radius-d': `${t.shape.cardRadiusDesktop}px`,
    '--works-card-radius-m': `${t.shape.cardRadiusMobile}px`,
    '--works-title-d': `${t.titles.sizeDesktop}px`,
    '--works-title-m': `${t.titles.sizeMobile}px`,
    '--card-title-shadow': `0 0 ${t.titles.shadowBlur}px rgb(255 255 255 / ${t.titles.shadowOpacity})`,
    '--shade-opacity': t.titles.shadeOpacity,
    '--shade-start': `${t.titles.shadeStart}%`,
    '--works-hover-scale': t.hover.scale,
    '--works-hover-ms': `${t.hover.durationMs}ms`,
    '--label-size-d': `${t.label.size}px`,
    '--label-size-m': `${t.label.sizeMobile}px`,
    '--label-arrow': `${t.label.arrowSize}em`,
    '--works-top-d': `${sp.topDesktop}px`,
    '--works-label-gap-d': `${sp.labelToFirstDesktop}px`,
    '--works-gap-d': `${sp.gapDesktop}svh`,
    '--works-bottom-d': `${sp.bottomDesktop}px`,
    '--works-top-m': `${sp.topMobile}px`,
    '--works-label-gap-m': `${sp.labelToFirstMobile}px`,
    '--works-gap-m': `${sp.gapMobile}svh`,
    '--works-bottom-m': `${sp.bottomMobile}px`,
  } as CSSProperties

  return (
    <section ref={sectionRef} className="works" data-surface="light" aria-labelledby="works-heading" style={style}>
      <div className="works__bg" aria-hidden="true" />
      <div className="works__inner">
        <h2
          id="works-heading"
          className={`eyebrow works__eyebrow column${t.label.show ? '' : ' visually-hidden'}`}
        >
          Selected works {t.label.arrow === 'down-right' ? <ArrowDownRightIcon /> : <ArrowDownIcon />}
        </h2>
        <ul className="works__list">
          {WORKS.map((work) => {
            const [desktopKey, mobileKey] = TITLE_KEYS[work.id]
            return (
              <li key={work.id}>
                <article
                  className="works__card"
                  data-surface={work.surface}
                  data-work={work.id}
                  style={{ backgroundColor: t.cards[work.id] }}
                  aria-label={t.titles[desktopKey]}
                >
                  {work.route && (
                    <a
                      className="works__card-link"
                      href={PATH_BY_ROUTE[work.route]}
                      aria-label={`Open ${t.titles[desktopKey]}`}
                      onClick={(event) => {
                        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
                        event.preventDefault()
                        openProject(event.currentTarget.parentElement!, work.route!)
                      }}
                    />
                  )}
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
