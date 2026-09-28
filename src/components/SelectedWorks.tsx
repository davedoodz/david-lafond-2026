/**
 * White "Selected works" panel.
 *
 * Its background shape is scroll-linked: at landing only the top edge peeks
 * out; scrolling in morphs it toward the "focused" shape, and once the bottom
 * edge comes into view it morphs back.
 *
 *   n = curve(enter) · (1 − curve(exit))       0 = rest shape, 1 = focused shape
 *   enter: panel top travels `shrinkDistance`·vh up from its landing position
 *   exit:  panel bottom travels `widenDistance`·vh up from `widenStart`·vh
 *
 * `morph.preset` picks what rest → focused means (side inset + corner radius);
 * 'custom' uses the morph dials. Only a clip-path on a flat background layer
 * changes, so cards never re-layout.
 */
import { useEffect, useRef, type CSSProperties, type RefObject } from 'react'
import { WORKS } from '../data/works'
import { useTuningController } from '../tuning/useTuning'
import { ArrowDownIcon, ArrowDownLeftIcon } from './icons'
import { MeshCard } from './MeshCard'
import { SheetLayers, sheetDials, useSheetDepth } from '../features/sheetDepth/sheetDepth'
import { useProjectOpen } from '../features/projectOpen/useProjectOpen'
import { PATH_BY_ROUTE } from '../lib/router'
import './SelectedWorks.css'

type Tuple = [number, number, number, number]

/** Side inset in % of viewport width, radius as a multiple of the shape → radius dial. */
type MorphSpec = { side: [number, number] | 'dials'; radius: [number, number] }

const MORPH_PRESETS: Record<string, MorphSpec> = {
  narrow: { side: 'dials', radius: [1, 1] },
  'full-bleed': { side: [2.8, 0], radius: [1, 0] },
  bloom: { side: [14, 0], radius: [2.4, 0.4] },
  pill: { side: 'dials', radius: [1, 2.6] },
  settle: { side: [0, 7.7], radius: [0, 1] },
  none: { side: [2.8, 2.8], radius: [1, 1] },
}

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
  morph: {
    preset: {
      type: 'select' as const,
      options: [...Object.keys(MORPH_PRESETS), 'custom'],
      default: 'narrow',
    },
    curve: { type: 'select' as const, options: Object.keys(CURVES), default: 'smooth' },
    customSideStart: [2.8, 0, 20, 0.1] as Tuple,
    customSideEnd: [7.7, 0, 20, 0.1] as Tuple,
    customRadiusStart: [45, 0, 200, 1] as Tuple,
    customRadiusEnd: [45, 0, 200, 1] as Tuple,
    _collapsed: false,
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
  /** Vertical file-sheet presets; anything but `none` replaces the morph above. */
  sheet: sheetDials(),
  /** "Selected works" label. With the folder preset it sits on the tab; x/y are from the folder's top-left. */
  label: {
    arrow: { type: 'select' as const, options: ['down', 'down-left'], default: 'down' },
    size: [14, 8, 40, 0.5] as Tuple,
    sizeMobile: [10, 6, 30, 0.5] as Tuple,
    arrowSize: [0.7, 0.3, 2, 0.05] as Tuple,
    x: [48, 0, 800, 1] as Tuple,
    y: [18, -40, 160, 1] as Tuple,
    xMobile: [20, 0, 400, 1] as Tuple,
    yMobile: [12, -40, 120, 1] as Tuple,
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
const lerp = (a: number, b: number, n: number) => a + (b - a) * n

export function SelectedWorks({ underRef }: { underRef: RefObject<HTMLElement | null> }) {
  const { values: t, setValue } = useTuningController('Selected works', CONFIG)
  const openProject = useProjectOpen()

  // Moving any custom dial means "use my numbers": flip the preset to 'custom'
  // so the change is visible instead of being ignored by a named preset.
  const { customSideStart, customSideEnd, customRadiusStart, customRadiusEnd } = t.morph
  const customKey = `${customSideStart}|${customSideEnd}|${customRadiusStart}|${customRadiusEnd}`
  const lastCustomKey = useRef(customKey)
  useEffect(() => {
    if (customKey === lastCustomKey.current) return
    lastCustomKey.current = customKey
    if (t.morph.preset !== 'custom') setValue('morph.preset', 'custom')
  }, [customKey, t.morph.preset, setValue])
  const sectionRef = useRef<HTMLElement>(null)
  useSheetDepth(sectionRef, underRef, {
    values: t.sheet,
    radius: [t.shape.radiusDesktop, t.shape.radiusMobile],
    bottomRadius: [t.shape.radiusDesktop, t.shape.radiusMobile],
    // Same enter/exit window as the morph, so the sheet settles and lets go at the same points.
    progress: (rect, vh) => {
      const curve = CURVES[t.morph.curve] ?? CURVES.smooth
      const enter = clamp01((vh - t.width.peek - rect.top) / (t.sheet.travel * vh))
      const exit = clamp01((vh * (1 - t.width.widenStart) - rect.bottom) / (t.width.widenDistance * vh))
      return curve(enter) * (1 - curve(exit))
    },
  })
  const morphDials = { width: t.width, morph: t.morph, shape: t.shape }
  const morphKey = JSON.stringify(morphDials)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const mobileQuery = window.matchMedia('(max-width: 640px)')
    let frame = 0

    const update = () => {
      frame = 0
      const { width: w, morph, shape } = morphDials
      const vh = window.innerHeight
      const vw = document.documentElement.clientWidth
      const rect = section.getBoundingClientRect()
      const curve = CURVES[morph.curve] ?? CURVES.smooth
      const enter = clamp01((vh - w.peek - rect.top) / (w.shrinkDistance * vh))
      const exit = clamp01((vh * (1 - w.widenStart) - rect.bottom) / (w.widenDistance * vh))
      const n = curve(enter) * (1 - curve(exit))

      const mobile = mobileQuery.matches
      const baseRadius = mobile ? shape.radiusMobile : shape.radiusDesktop
      let side: [number, number]
      let radius: [number, number]
      if (morph.preset === 'custom') {
        side = [morph.customSideStart, morph.customSideEnd]
        radius = [morph.customRadiusStart, morph.customRadiusEnd]
      } else {
        const spec = MORPH_PRESETS[morph.preset] ?? MORPH_PRESETS.narrow
        side =
          spec.side === 'dials'
            ? mobile
              ? [w.mobileWideInset, w.mobileNarrowInset]
              : [w.desktopWideInset, w.desktopNarrowInset]
            : spec.side
        radius = [spec.radius[0] * baseRadius, spec.radius[1] * baseRadius]
      }
      section.style.setProperty('--works-inset', `${((lerp(side[0], side[1], n) / 100) * vw).toFixed(2)}px`)
      section.style.setProperty('--works-radius-live', `${lerp(radius[0], radius[1], n).toFixed(2)}px`)
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
    // Dials are captured fresh whenever any morph-related dial changes.
  }, [morphKey])

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
    '--works-hover-scale': t.hover.scale,
    '--works-hover-ms': `${t.hover.durationMs}ms`,
    '--label-size-d': `${t.label.size}px`,
    '--label-size-m': `${t.label.sizeMobile}px`,
    '--label-arrow': `${t.label.arrowSize}em`,
    '--label-x-d': `${t.label.x}px`,
    '--label-y-d': `${t.label.y}px`,
    '--label-x-m': `${t.label.xMobile}px`,
    '--label-y-m': `${t.label.yMobile}px`,
    '--folder-tab': `${t.sheet.folder.tabHeight}px`,
  } as CSSProperties

  return (
    <section ref={sectionRef} className="works" data-surface="light" aria-labelledby="works-heading" style={style}>
      {t.sheet.preset === 'none' ? <div className="works__bg" aria-hidden="true" /> : <SheetLayers preset={t.sheet.preset} />}
      <div className="works__inner">
        <h2 id="works-heading" className="eyebrow works__eyebrow column">
          Selected works {t.label.arrow === 'down-left' ? <ArrowDownLeftIcon /> : <ArrowDownIcon />}
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
