/**
 * White "Selected works" panel.
 *
 * At landing the panel peeks above the fold as a dome (side inset + elliptical top). Scrolling pulls
 * its top edge up and the dome flattens until the white bleeds edge to edge. At the end the bottom
 * edge mirrors it exactly: the same dome shape, side inset, distance and curve, fully domed when the
 * panel's bottom sits as far below the viewport top as its top peeked above the viewport bottom.
 * The page's tail (contact + footer) is at least as tall as the landing, so that mirror state is
 * reachable.
 *
 *   top k:    1 at scroll 0, flat once the panel top has risen `enterDistance` × its rise (the
 *             distance from the peek to the screen top), so at 1 it lands flat on the top edge
 *   bottom k: 1 when the panel bottom is `peek` from the viewport top, flat the same distance lower
 *
 * Only a clip-path on a flat background layer changes, so cards never re-layout.
 * Optional scroll snap centres one project per stop.
 */
import { useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react'
import { WORKS } from '../data/works'
import { DOME_CURVES, arcClip, domeClip } from '../lib/domeClip'
import { springEasing } from '../lib/springEasing'
import { TOUCH_ARCS, TOUCH_LANDING as TOUCH, smallViewportHeight, touchDome } from '../lib/touchLanding'
import saved from '../data/tuning.json'
import { useTuningController } from '../tuning/useTuning'
import { EditableText } from './EditableText'
import { ArrowDownIcon, ArrowDownRightIcon } from './icons'
import { HarvardMitCard } from './HarvardMitCard'
import { FiloCard } from './FiloCard'
import { FiloLayers } from './FiloLayers'
import { MeshCard } from './MeshCard'
import { MomoThumb } from './MomoThumb'
import { useProjectOpen } from '../features/projectOpen/useProjectOpen'
import { PATH_BY_ROUTE } from '../lib/router'
import './SelectedWorks.css'

type Tuple = [number, number, number, number]

const CONFIG = {
  /** Which case study leads the list; the rest keep their order. */
  order: {
    first: { type: 'select' as const, options: ['Momo', 'Filo'], default: 'Momo' },
  },
  cards: {
    momo: { type: 'color' as const, default: '#57BFFF' },
    filo: { type: 'color' as const, default: '#ECE6DC' },
    'harvard-mit': { type: 'color' as const, default: '#171717' },
  },
  titles: {
    momoDesktop: { type: 'text' as const, default: WORKS[0].title },
    momoMobile: { type: 'text' as const, default: WORKS[0].shortTitle },
    filoDesktop: { type: 'text' as const, default: WORKS[1].title },
    filoMobile: { type: 'text' as const, default: WORKS[1].shortTitle },
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
  /**
   * One dome for both ends: the bottom mirrors the top. Side in % of viewport width, arch in % of
   * viewport height. enterDistance is in rises (peek → screen top): 1 flattens it exactly as its
   * edge reaches the top. `smooth` eases in and out, so the dome lifts off and lands without a jolt.
   */
  morph: {
    curve: { type: 'select' as const, options: Object.keys(DOME_CURVES), default: 'smooth' },
    enterDistance: [1, 0.2, 2.5, 0.01] as Tuple,
    startSide: [14, 0, 45, 0.5] as Tuple,
    startArch: [40, 0, 100, 1] as Tuple,
    startRadius: [45, 0, 200, 1] as Tuple,
    _collapsed: false,
  },
  /** Same dome, used at ≤640px wide (touch screens use lib/touchLanding's shape). */
  morphMobile: {
    curve: { type: 'select' as const, options: Object.keys(DOME_CURVES), default: 'smooth' },
    enterDistance: [1, 0.2, 2.5, 0.01] as Tuple,
    startSide: [0, 0, 45, 0.5] as Tuple,
    startArch: [70, 0, 100, 1] as Tuple,
    startRadius: [0, 0, 200, 1] as Tuple,
    _collapsed: false,
  },
  /**
   * Phones and tablets: curvature of the sheet's edge (top on landing, mirrored at the page end).
   * Presets are circular arcs, flattest to roundest; "Ellipse (before)" is the earlier stretched
   * shape for comparison; "Custom" uses `height` (arc height, % of screen width).
   */
  touchArc: {
    preset: { type: 'select' as const, options: [...Object.keys(TOUCH_ARCS), 'Ellipse (before)', 'Custom'], default: 'Soft' },
    height: [18, 2, 50, 0.5] as Tuple,
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
    /** Native scroll keeps its momentum, but a fast fling can't fly past a project (scroll-snap-stop). */
    noSkip: { type: 'boolean' as const, default: false },
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
    /** Mobile thumbnail width: space left on each side of the screen (px). */
    cardMarginMobile: [41, 0, 150, 1] as Tuple,
    /** Mobile thumbnail height as % of its width (57 = desktop's 867 × 493). */
    cardHeightMobile: [57, 25, 200, 1] as Tuple,
    _collapsed: false,
  },
  /** "Selected works" label above the first project. */
  label: {
    text: { type: 'text' as const, default: 'Selected works' },
    color: { type: 'color' as const, default: '#171717' },
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

/**
 * The "Selected works" label's distance from the sheet top edge (px), as saved in tuning.json.
 * Other sheets (About's playground) place their label with it so every sheet label sits alike.
 */
export const SHEET_LABEL_TOP = (() => {
  const label = (saved as Record<string, { label?: { topDesktop?: number; topMobile?: number } }>)['Selected works']?.label
  return {
    desktop: label?.topDesktop ?? CONFIG.label.topDesktop[0],
    mobile: label?.topMobile ?? CONFIG.label.topMobile[0],
  }
})()

type Morph = { curve: string; enterDistance: number; startSide: number; startArch: number; startRadius: number }
/**
 * The Selected projects sheet's dome as saved in tuning.json: its morph dials (desktop and ≤640px)
 * and its peek (the Work page's Hero dials). About's playground sheet draws and moves its dome with
 * them, so both sheets arc and flatten alike.
 */
export const SHEET_DOME = (() => {
  const all = saved as Record<string, Record<string, unknown> | undefined>
  const works = all['Selected works']
  const hero = all['Hero']
  const morph = (key: 'morph' | 'morphMobile'): Morph => {
    const dials = CONFIG[key]
    const s = (works?.[key] ?? {}) as Partial<Morph>
    return {
      curve: s.curve ?? dials.curve.default,
      enterDistance: s.enterDistance ?? dials.enterDistance[0],
      startSide: s.startSide ?? dials.startSide[0],
      startArch: s.startArch ?? dials.startArch[0],
      startRadius: s.startRadius ?? dials.startRadius[0],
    }
  }
  const peek = (key: 'peekDesktop' | 'peekMobile', fallback: number) =>
    typeof hero?.[key] === 'number' ? (hero[key] as number) : fallback
  return {
    morph: morph('morph'),
    morphMobile: morph('morphMobile'),
    peekDesktop: peek('peekDesktop', 40),
    peekMobile: peek('peekMobile', 28),
  }
})()

const TITLE_KEYS = {
  momo: ['momoDesktop', 'momoMobile'],
  filo: ['filoDesktop', 'filoMobile'],
  'harvard-mit': ['harvardMitDesktop', 'harvardMitMobile'],
} as const

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const smooth = (x: number) => x * x * (3 - 2 * x)

export function SelectedWorks() {
  const { values: t, setValue } = useTuningController('Selected works', CONFIG)
  const openProject = useProjectOpen()
  const sectionRef = useRef<HTMLElement>(null)
  const morphDesktop = t.morph
  const morphMobile = t.morphMobile
  const touchArc = t.touchArc
  const morphKey = JSON.stringify([morphDesktop, morphMobile, touchArc])

  useEffect(() => {
    const section = sectionRef.current
    // Written on the background layer itself (its only consumer): set on the section it
    // would restyle every card underneath on each scroll frame.
    const bg = section?.querySelector<HTMLElement>('.works__bg')
    if (!section || !bg) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const mobile = window.matchMedia('(max-width: 640px)')
    const touch = window.matchMedia(TOUCH)
    let frame = 0
    let vh = window.innerHeight
    let vw = document.documentElement.clientWidth
    let panelTop = 0
    let panelHeight = 0
    let arch = 0
    let lastClip = ''
    const measure = () => {
      vh = window.innerHeight
      vw = document.documentElement.clientWidth
      panelTop = section.getBoundingClientRect().top + window.scrollY
      panelHeight = section.offsetHeight
      const height = touchArc.preset === 'Ellipse (before)' ? 0.36
        : touchArc.preset === 'Custom' ? touchArc.height / 100
        : TOUCH_ARCS[touchArc.preset as keyof typeof TOUCH_ARCS] ?? TOUCH_ARCS.Soft
      arch = Math.min(touchDome(smallViewportHeight(), height).arch, Math.max(0, vh - panelTop) * 0.85)
    }

    const update = () => {
      frame = 0
      const morph = mobile.matches || touch.matches ? morphMobile : morphDesktop
      const curve = DOME_CURVES[morph.curve] ?? DOME_CURVES.smooth
      const peek = Math.max(0, vh - panelTop)
      // The rise: how far the panel top travels from the peek to the screen top.
      const travel = morph.enterDistance * Math.max(1, vh - peek)
      const top = reduced ? 0 : 1 - curve(clamp01(window.scrollY / travel))
      const bottom = reduced ? 0 : 1 - curve(clamp01((panelTop + panelHeight - window.scrollY - peek) / travel))
      let clip: string
      if (touch.matches) {
        if (touchArc.preset === 'Ellipse (before)') {
          const edge = { radius: 0, arch: arch / vh * 100 }
          clip = domeClip(0, edge, top, edge, bottom, vh)
        } else clip = arcClip(vw, panelHeight, arch * top, arch * bottom)
      } else {
        const shape = { radius: morph.startRadius, arch: morph.startArch }
        const side = ((morph.startSide * vw) / 100) * Math.max(top, bottom)
        clip = domeClip(side, shape, top, shape, bottom, vh)
      }
      // Geometry is measured only when layout changes. Flat sections need no style writes.
      if (clip !== lastClip) {
        bg.style.setProperty('--works-clip', clip)
        lastClip = clip
      }
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    const resize = () => {
      measure()
      schedule()
    }

    measure()
    update()
    // The touch arc's clip is drawn in px over the background's box, so redraw when it resizes.
    const sized = new ResizeObserver(resize)
    sized.observe(section)
    if (section.previousElementSibling) sized.observe(section.previousElementSibling)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', resize)
    touch.addEventListener('change', resize)
    return () => {
      cancelAnimationFrame(frame)
      sized.disconnect()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', resize)
      touch.removeEventListener('change', resize)
    }
    // `morphKey` captures every morph dial.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [morphKey])

  // Touch landing (see touchDome): the peek is written on the page (WorkPage.css reads --works-peek),
  // the label is centred in it and the first thumbnail stays below the visible fold.
  useLayoutEffect(() => {
    const section = sectionRef.current
    const page = section?.parentElement
    const label = section?.querySelector<HTMLElement>('.works__eyebrow')
    const first = section?.querySelector<HTMLElement>('.works__list > li')
    if (!section || !page || !label || !first) return
    const touch = window.matchMedia(TOUCH)
    const clear = () => {
      delete section.dataset.touchLanding
      for (const v of ['--works-touch-label-top', '--works-touch-first']) section.style.removeProperty(v)
    }
    const place = () => {
      if (!touch.matches) return clear()
      const measuredPeek = parseFloat(getComputedStyle(page).getPropertyValue('--works-peek'))
      const peek = Number.isFinite(measuredPeek) ? measuredPeek : touchDome(smallViewportHeight()).peek
      section.dataset.touchLanding = ''
      section.style.setProperty('--works-touch-label-top', `${(peek / 2 - label.offsetHeight / 2).toFixed(2)}px`)
      // Safari's translucent bottom toolbar can show content below the visible viewport. Keep the
      // first card past both the landing peek and a conservative phone-toolbar clearance.
      const fold = Math.max(smallViewportHeight(), window.innerHeight, window.visualViewport?.height ?? 0)
      const sectionTop = section.getBoundingClientRect().top + window.scrollY
      const chromeClearance = Math.max(peek, 96)
      section.style.setProperty('--works-touch-first', `${Math.max(chromeClearance, fold - sectionTop + chromeClearance).toFixed(2)}px`)
    }
    place()
    const landingResize = new ResizeObserver(place)
    if (section.previousElementSibling) landingResize.observe(section.previousElementSibling)
    window.addEventListener('resize', place)
    window.visualViewport?.addEventListener('resize', place)
    touch.addEventListener('change', place)
    void document.fonts.ready.then(place)
    return () => {
      landingResize.disconnect()
      window.removeEventListener('resize', place)
      window.visualViewport?.removeEventListener('resize', place)
      touch.removeEventListener('change', place)
      clear()
    }
  }, [])
  // Mirror reach: the page below the panel (contact + footer) is exactly as tall as the landing above
  // it (capped at one viewport), so scrolling to the end brings the panel's bottom to `peek` below the
  // viewport top, where its bottom dome matches the landing's top dome. The section right after the
  // panel (the contact CTA) grows to make up a shortfall, or gives up padding (top first, down to
  // 16px each) when the tail is too tall.
  useLayoutEffect(() => {
    const section = sectionRef.current
    const tail = section?.nextElementSibling as HTMLElement | null
    if (!section || !tail) return
    let frame = 0
    const phone = window.matchMedia('(max-width: 640px)')
    const fit = () => {
      frame = 0
      for (const p of ['min-height', 'padding-top', 'padding-bottom']) tail.style.removeProperty(p)
      const doc = document.documentElement
      const top = section.getBoundingClientRect().top + window.scrollY
      const below = doc.scrollHeight - (section.getBoundingClientRect().bottom + window.scrollY)
      let short = Math.min(top, window.innerHeight) - below
      if (short > 0.5) tail.style.minHeight = `${(tail.offsetHeight + short).toFixed(1)}px`
      for (const side of ['top', 'bottom'] as const) {
        if (short >= -0.5) break
        const pad = parseFloat(getComputedStyle(tail).getPropertyValue(`padding-${side}`))
        const next = Math.max(16, pad + short)
        tail.style.setProperty(`padding-${side}`, `${next.toFixed(1)}px`)
        short += pad - next
      }
      // Phones: centre the contact text in the dark space between the panel's bottom dome tip and the
      // footer links, i.e. dome tip → title top equals "Let's chat" bottom → first footer link top.
      // Padding moves from one side to the other, so the tail keeps its height.
      const title = tail.querySelector('.cta__title')
      const pill = tail.lastElementChild
      const links = Array.from(document.querySelectorAll('.footer__inner :is(a, button)'), (el) => el.getBoundingClientRect().top)
      if (!phone.matches || !title || !pill || !links.length) return
      const gapAbove = title.getBoundingClientRect().top - section.getBoundingClientRect().bottom
      const gapBelow = Math.min(...links) - pill.getBoundingClientRect().bottom
      const style = getComputedStyle(tail)
      const padTop = parseFloat(style.paddingTop), padBottom = parseFloat(style.paddingBottom)
      // When the tail was grown (min-height), the slack sits below the text, so the shift can exceed
      // the bottom padding; the min-height keeps the tail's height either way.
      const shift = Math.max(-padTop, (gapBelow - gapAbove) / 2)
      tail.style.setProperty('padding-top', `${(padTop + shift).toFixed(1)}px`)
      tail.style.setProperty('padding-bottom', `${Math.max(0, padBottom - shift).toFixed(1)}px`)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(fit) }
    fit()
    const resize = new ResizeObserver(schedule)
    if (section.previousElementSibling) resize.observe(section.previousElementSibling)
    addEventListener('resize', schedule)
    phone.addEventListener('change', schedule)
    void document.fonts.ready.then(schedule)
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      removeEventListener('resize', schedule)
      phone.removeEventListener('change', schedule)
      for (const p of ['min-height', 'padding-top', 'padding-bottom']) tail.style.removeProperty(p)
    }
  }, [])

  // Project focus scale, written as --focus-scale on each <li> (the card's own
  // `scale` stays free for hover). Phones keep every card at full size while scrolling.
  const listRef = useRef<HTMLUListElement>(null)
  const focus = t.focus
  const focusKey = JSON.stringify(focus)
  useEffect(() => {
    const items = Array.from(listRef.current?.children ?? []) as HTMLElement[]
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const phone = window.matchMedia('(max-width: 640px)')
    const clear = () => items.forEach((li) => li.style.removeProperty('--focus-scale'))
    let frame = 0
    const update = () => {
      frame = 0
      if (focus.mode === 'off' || reduced.matches || phone.matches) return clear()
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
    phone.addEventListener('change', schedule)
    reduced.addEventListener('change', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      phone.removeEventListener('change', schedule)
      reduced.removeEventListener('change', schedule)
      clear()
    }
    // `focusKey` captures every focus dial.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey])

  // Sheet intro: only the background layer moves, so cards and scroll math are untouched.
  // Keep the content hidden during the intro so a settling layout cannot flash a thumbnail.
  // Layout effect, so the sheet is already lowered on the first painted frame; and it starts
  // fully below the fold (at least the dial distance), so no white shows before it springs up.
  const intro = t.intro
  const introKey = JSON.stringify(intro)
  useLayoutEffect(() => {
    const bg = sectionRef.current?.querySelector<HTMLElement>('.works__bg')
    if (!bg || intro.preset === 'none') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.scrollY > 10) return
    // 24px spare: the hero can still settle a little after this runs (WorkPage's useHeroFit).
    const touch = window.matchMedia(TOUCH).matches
    const d = Math.max(intro.distance, window.innerHeight - bg.getBoundingClientRect().top + 24, touch ? window.innerHeight + 24 : 0)
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
    const inner = sectionRef.current?.querySelector<HTMLElement>('.works__inner')
    const contentAnimation = touch && inner
      ? inner.animate([{ visibility: 'hidden' }, { visibility: 'hidden' }], {
          duration: intro.durationMs, delay: intro.delayMs, fill: 'backwards',
        })
      : null
    // Never finish the entrance on scroll: the section's normal document movement carries the
    // still-running arc upward with the gesture. Finishing here made the arc pop into place.
    return () => {
      animation.cancel()
      contentAnimation?.cancel()
    }
    // `introKey` captures every intro dial.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introKey])

  // Scroll snap lives on <html>; only while this page is mounted. Layout effect so
  // the attribute is gone in the same commit that swaps pages: otherwise the next
  // page would snap to its footer before this cleanup ran.
  const snap = t.spacing.snap
  const noSkip = t.spacing.noSkip
  useLayoutEffect(() => {
    if (snap === 'off') return
    const root = document.documentElement
    root.dataset.worksSnap = snap
    if (noSkip) root.dataset.worksNoSkip = ''
    return () => {
      delete root.dataset.worksSnap
      delete root.dataset.worksNoSkip
    }
  }, [snap, noSkip])

  const sp = t.spacing
  const style = {
    '--works-card-radius-d': `${t.shape.cardRadiusDesktop}px`,
    '--works-card-radius-m': `${t.shape.cardRadiusMobile}px`,
    '--works-card-margin-m': `${t.shape.cardMarginMobile}px`,
    '--works-card-ratio-m': `100 / ${t.shape.cardHeightMobile}`,
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
      <div className="works__bg" data-arc-edge aria-hidden="true" />
      <div className="works__inner">
        <h2
          id="works-heading"
          className={`eyebrow works__eyebrow column${t.label.show ? '' : ' visually-hidden'}`}
          data-align-label={t.label.align}
          style={{ color: t.label.color }}
        >
          <EditableText as="span" label="Selected works label" value={t.label.text} onChange={(next) => setValue('label.text', next)} />
          {t.label.arrow === 'down' && <ArrowDownIcon />}
          {t.label.arrow === 'down-right' && <ArrowDownRightIcon />}
        </h2>
        <ul ref={listRef} className="works__list" data-focus={t.focus.mode}>
          {(t.order.first === 'Filo' ? [...WORKS].sort((a, b) => Number(b.id === 'filo') - Number(a.id === 'filo')) : WORKS).map((work) => {
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
                  {work.id === 'momo' && <MeshCard />}
                  {work.id === 'momo' && <MomoThumb />}
                  {work.id === 'filo' && <FiloCard />}
                  {work.id === 'filo' && <FiloLayers />}
                  {work.id === 'harvard-mit' && <HarvardMitCard />}
                  <div className="card-shade" />
                  <h3 className="card-title works__title">
                    <EditableText as="span" className="works__title-desktop" label={`${work.id} desktop title`} value={t.titles[desktopKey]} onChange={(next) => setValue(`titles.${desktopKey}`, next)} />
                    <EditableText as="span" className="works__title-mobile" label={`${work.id} mobile title`} value={t.titles[mobileKey]} onChange={(next) => setValue(`titles.${mobileKey}`, next)} />
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
