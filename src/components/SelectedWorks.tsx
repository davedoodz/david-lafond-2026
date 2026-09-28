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
import { useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react'
import { WORKS } from '../data/works'
import { DOME_CURVES, domeClip } from '../lib/domeClip'
import { springEasing } from '../lib/springEasing'
import { useTuning } from '../tuning/useTuning'
import { ArrowDownIcon, ArrowDownRightIcon } from './icons'
import { MeshCard } from './MeshCard'
import { useProjectOpen } from '../features/projectOpen/useProjectOpen'
import { PATH_BY_ROUTE } from '../lib/router'
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
  /** Dome in at the top, dome out at the bottom. Sides in % of viewport width, arches in % of viewport height. */
  morph: {
    curve: { type: 'select' as const, options: Object.keys(DOME_CURVES), default: 'smoother' },
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
  /**
   * How the sheet tip arrives on page load (rises from below the fold).
   * Changing any dial replays it.
   */
  intro: {
    preset: { type: 'select' as const, options: ['rise', 'spring', 'bounce', 'float', 'none'], default: 'spring' },
    delayMs: [400, 0, 9000, 10] as Tuple,
    durationMs: [900, 150, 3000, 10] as Tuple,
    /** Start offset below the resting position (px). */
    distance: [140, 20, 600, 1] as Tuple,
    /** spring: overshoot amount. */
    bounce: [0.3, 0, 0.9, 0.01] as Tuple,
    _collapsed: false,
  },
  /** Vertical rhythm. Gaps are in % of viewport height so one project fills each stop. */
  spacing: {
    snap: { type: 'select' as const, options: ['off', 'proximity', 'mandatory'], default: 'off' },
    /** Sheet top edge → first project. */
    firstDesktop: [210, 0, 800, 1] as Tuple,
    gapDesktop: [35, 5, 100, 1] as Tuple,
    /** Last project → sheet bottom edge. */
    lastDesktop: [260, 0, 800, 1] as Tuple,
    firstMobile: [107, 0, 500, 1] as Tuple,
    gapMobile: [25, 5, 100, 1] as Tuple,
    lastMobile: [140, 0, 600, 1] as Tuple,
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
    align: { type: 'select' as const, options: ['center', 'left'], default: 'center' },
    arrow: { type: 'select' as const, options: ['down', 'down-right', 'none'], default: 'down' },
    /** Distance from the sheet top edge; independent of the project spacing. */
    topDesktop: [120, 0, 800, 1] as Tuple,
    topMobile: [60, 0, 500, 1] as Tuple,
    size: [14, 8, 40, 0.5] as Tuple,
    sizeMobile: [10, 6, 30, 0.5] as Tuple,
    arrowSize: [0.7, 0.3, 2, 0.05] as Tuple,
    /** Nudges the arrow up (−) or down (+) against the text, in px. */
    arrowY: [0, -20, 20, 0.5] as Tuple,
    _collapsed: false,
  },
  /**
   * Project focus: the card nearest the screen centre grows, the others shrink back.
   *   scroll   scale follows scroll position continuously
   *   trigger  the centred card animates up (durationMs), the previous one animates down
   */
  focus: {
    mode: { type: 'select' as const, options: ['scroll', 'trigger', 'off'], default: 'scroll' },
    restScale: [0.9, 0.6, 1, 0.005] as Tuple,
    focusScale: [1.04, 1, 1.3, 0.005] as Tuple,
    /** scroll: distance from centre (in screen heights) over which a card shrinks back to rest. */
    range: [0.6, 0.1, 1.5, 0.01] as Tuple,
    durationMs: [600, 100, 1500, 10] as Tuple,
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
const smooth = (x: number) => x * x * (3 - 2 * x)


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
      const curve = DOME_CURVES[morph.curve] ?? DOME_CURVES.smooth
      // Enter starts from wherever the panel sits at scroll 0 (its peek), so the dome tip shows on load.
      const restTop = rect.top + window.scrollY
      const e = reduced ? 1 : curve(clamp01((restTop - rect.top) / (morph.enterDistance * vh)))
      const x = reduced ? 0 : curve(clamp01((vh * (1 - morph.exitStart) - rect.bottom) / (morph.exitDistance * vh)))

      const side = Math.max(morph.startSide * (1 - e), morph.endSide * x) * vw / 100
      section.style.setProperty(
        '--works-clip',
        domeClip(
          side,
          { radius: morph.startRadius, arch: morph.startArch },
          1 - e,
          { radius: morph.endRadius, arch: morph.endArch },
          x,
          vh,
        ),
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

  // Project focus scale, written as --focus-scale on each <li> (the card's own
  // `scale` stays free for hover).
  const listRef = useRef<HTMLUListElement>(null)
  const focus = t.focus
  const focusKey = JSON.stringify(focus)
  useEffect(() => {
    const items = Array.from(listRef.current?.children ?? []) as HTMLElement[]
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const clear = () => items.forEach((li) => li.style.removeProperty('--focus-scale'))
    if (focus.mode === 'off' || reduced) {
      clear()
      return
    }
    let frame = 0
    const update = () => {
      frame = 0
      const mid = window.innerHeight / 2
      const distances = items.map((li) => {
        const r = li.getBoundingClientRect()
        return Math.abs(r.top + r.height / 2 - mid)
      })
      if (focus.mode === 'scroll') {
        items.forEach((li, i) => {
          const f = smooth(clamp01(1 - distances[i] / (focus.range * window.innerHeight)))
          li.style.setProperty('--focus-scale', (focus.restScale + (focus.focusScale - focus.restScale) * f).toFixed(4))
        })
        return
      }
      // trigger: only the nearest card (and only once it is well on screen) is focused.
      const nearest = distances.indexOf(Math.min(...distances))
      items.forEach((li, i) => {
        const on = i === nearest && distances[i] < window.innerHeight * 0.35
        li.style.setProperty('--focus-scale', String(on ? focus.focusScale : focus.restScale))
      })
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
      clear()
    }
    // `focusKey` captures every focus dial.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey])

  // Sheet intro: only the background layer moves, so cards and scroll math are untouched.
  const intro = t.intro
  const introKey = JSON.stringify(intro)
  useEffect(() => {
    const bg = sectionRef.current?.querySelector<HTMLElement>('.works__bg')
    if (!bg || intro.preset === 'none') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.scrollY > 10) return
    const d = intro.distance
    const frames: Keyframe[] =
      intro.preset === 'bounce'
        ? [
            { translate: `0 ${d}px`, easing: 'cubic-bezier(0.3, 0, 0.6, 1)' },
            { translate: `0 ${-d * 0.12}px`, offset: 0.55, easing: 'ease-in-out' },
            { translate: `0 ${d * 0.05}px`, offset: 0.78, easing: 'ease-in-out' },
            { translate: '0 0' },
          ]
        : intro.preset === 'float'
          ? [{ translate: `0 ${d}px`, opacity: 0 }, { translate: '0 0', opacity: 1 }]
          : [{ translate: `0 ${d}px` }, { translate: '0 0' }]
    const easing =
      intro.preset === 'spring'
        ? springEasing(intro.bounce)
        : intro.preset === 'float'
          ? 'cubic-bezier(0.16, 1, 0.3, 1)'
          : intro.preset === 'rise'
            ? 'cubic-bezier(0.22, 1, 0.36, 1)'
            : 'linear'
    const animation = bg.animate(frames, { duration: intro.durationMs, delay: intro.delayMs, easing, fill: 'backwards' })
    return () => animation.cancel()
    // `introKey` captures every intro dial.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introKey])

  // Scroll snap lives on <html>; only while this page is mounted. Layout effect so
  // the attribute is gone in the same commit that swaps pages: otherwise the next
  // page would snap to its footer before this cleanup ran.
  const snap = t.spacing.snap
  useLayoutEffect(() => {
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
    '--label-arrow-y': `${t.label.arrowY}px`,
    '--works-first-d': `${sp.firstDesktop}px`,
    '--works-gap-d': `${sp.gapDesktop}svh`,
    '--works-last-d': `${sp.lastDesktop}px`,
    '--works-first-m': `${sp.firstMobile}px`,
    '--works-gap-m': `${sp.gapMobile}svh`,
    '--works-last-m': `${sp.lastMobile}px`,
    '--focus-ms': `${t.focus.durationMs}ms`,
    '--label-top-d': `${t.label.topDesktop}px`,
    '--label-top-m': `${t.label.topMobile}px`,
  } as CSSProperties

  return (
    <section ref={sectionRef} className="works" data-surface="light" aria-labelledby="works-heading" style={style}>
      <div className="works__bg" aria-hidden="true" />
      <div className="works__inner">
        <h2
          id="works-heading"
          className={`eyebrow works__eyebrow column${t.label.show ? '' : ' visually-hidden'}`}
          data-align-label={t.label.align}
        >
          Selected works
          {t.label.arrow === 'down' && <ArrowDownIcon />}
          {t.label.arrow === 'down-right' && <ArrowDownRightIcon />}
        </h2>
        <ul ref={listRef} className="works__list" data-focus={t.focus.mode}>
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
