import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { navigate, setTransitionRunner, useRoute, type Route } from '../../lib/router'
import { preloadRoute } from '../../lib/routeChunks'
import { toCssTiming, type Easing, type Spring } from './cssTiming'
import { playProjectSlide, RAIL_MOTIONS, setProjectSlide, SLIDE_FEELS, type RailMotion, type SlideFeel } from './projectSlide'
import { useTuningController } from '../../tuning/useTuning'
import './pageTransition.css'

/**
 * Page-to-page transitions on the View Transitions API: the browser
 * snapshots both pages and animates the snapshots on the compositor, so the
 * pages themselves never re-layout mid-animation. Browsers without the API,
 * reduced motion, and the `none` preset swap instantly.
 */
export const PRESETS = ['rise', 'fade', 'slide', 'zoom', 'blur', 'wipe', 'none'] as const
export type Preset = (typeof PRESETS)[number]

const CONFIG = {
  preset: { type: 'select' as const, options: [...PRESETS], default: 'wipe' },
  preview: { type: 'action' as const, label: 'Preview (go to other page)' },
  timing: {
    out: { type: 'easing' as const, duration: 0.32, ease: [0.4, 0, 1, 1] as [number, number, number, number] },
    in: { type: 'easing' as const, duration: 0.62, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
    inDelay: [0.06, 0, 0.8, 0.01] as [number, number, number, number],
  },
  look: {
    distance: [56, 0, 480, 1] as [number, number, number, number],
    scale: [0.96, 0.8, 1, 0.005] as [number, number, number, number],
    blur: [10, 0, 40, 0.5] as [number, number, number, number],
    outOpacity: [0, 0, 1, 0.05] as [number, number, number, number],
    /** Radius of the two leading corners of the incoming page (px); they square off over the last 20% as it lands. */
    wipeRadius: [40, 0, 400, 1] as [number, number, number, number],
    /** slide: the page moves up (smoothest). reveal: the page stays put and is uncovered. */
    wipeStyle: { type: 'select' as const, options: ['slide', 'reveal'], default: 'slide' },
    mirrorOnBack: true,
  },
  /**
   * Work ⇄ project page: the project card slides in from the right over the Work page, and
   * back off to the right. Pick a feel; moving any dial below it switches the feel to custom.
   */
  projectSlide: {
    feel: { type: 'select' as const, options: [...Object.keys(SLIDE_FEELS), 'custom'], default: 'smooth' },
    preview: { type: 'action' as const, label: 'Preview (open Momo, then back)' },
    motion: { type: 'easing' as const, duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
    /** The Work page under the card: how far it drifts left (px) and how much it darkens. */
    drift: [60, 0, 400, 1] as [number, number, number, number],
    dim: [0.12, 0, 0.8, 0.01] as [number, number, number, number],
    /** Leading corners of the moving card (px). */
    radius: [24, 0, 120, 1] as [number, number, number, number],
    /** The strip beside the card (Work + back arrow): slides in with the card, or fades. */
    rail: { type: 'select' as const, options: [...RAIL_MOTIONS], default: 'slide' },
    _collapsed: false,
  },
  pin: {
    nav: true,
    headerShader: false,
  },
}

/** Page order sets the direction: Work → About plays forward, About → Work mirrors it. */
const ORDER: Record<Route, number> = { work: 0, momo: 1, filo: 1, 'harvard-mit': 1, about: 2 }
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

type Settings = { preset: Preset; mirror: boolean; pinNav: boolean; pinShader: boolean }
const PROJECT_ROUTES: Route[] = ['momo', 'filo', 'harvard-mit']

/** Pin an element only if it is on screen; an off-screen pin would fly in from its scrolled position. */
function pinIfVisible(selector: string, attribute: string) {
  const el = document.querySelector(selector)
  if (!el) return
  const rect = el.getBoundingClientRect()
  if (rect.bottom > 0 && rect.top < window.innerHeight) document.documentElement.setAttribute(attribute, '')
}

function run(settings: Settings, update: () => void, to: Route, from: Route) {
  const root = document.documentElement
  const skip =
    settings.preset === 'none' ||
    typeof document.startViewTransition !== 'function' ||
    window.matchMedia(REDUCED_MOTION).matches
  if (skip) {
    update()
    return
  }

  const commit = async () => {
    // Load the next page's chunk before committing, so the new snapshot is the real page.
    await preloadRoute(to)
    flushSync(update)
  }

  // Work ⇄ project page: the project card slides over (or off) the Work page.
  const slide = from === 'work' && PROJECT_ROUTES.includes(to) ? 'in' : PROJECT_ROUTES.includes(from) && to === 'work' ? 'out' : null
  if (slide) {
    void playProjectSlide(document.startViewTransition(commit), slide)
    return
  }

  root.dataset.vt = settings.preset
  root.dataset.vtDir = settings.mirror && ORDER[to] < ORDER[from] ? 'back' : 'forward'
  if (settings.pinNav) pinIfVisible('.nav', 'data-vt-pin-nav')
  if (settings.pinShader) pinIfVisible('.dither-band--header', 'data-vt-pin-shader')

  const transition = document.startViewTransition(commit)
  void transition.finished.finally(() => {
    // A newer transition may have started; only clean up our own state.
    if (root.dataset.vt !== settings.preset) return
    delete root.dataset.vt
    delete root.dataset.vtDir
    root.removeAttribute('data-vt-pin-nav')
    root.removeAttribute('data-vt-pin-shader')
  })
}

export function PageTransitions() {
  const route = useRoute()
  const routeRef = useRef(route)
  routeRef.current = route

  const slideMsRef = useRef(0)
  const { values, setValue } = useTuningController('Page transition', CONFIG, {
    onAction: (action) => {
      if (action === 'preview') navigate(routeRef.current === 'work' ? 'about' : 'work')
      if (action === 'projectSlide.preview') {
        // From a project page, go back; from anywhere else, open Momo first, then come back.
        if (PROJECT_ROUTES.includes(routeRef.current)) navigate('work')
        else {
          navigate('momo')
          window.setTimeout(() => navigate('work'), 1400 + slideMsRef.current)
        }
      }
    },
  })

  const { preset, timing, look, pin } = values
  const ps = values.projectSlide
  const custom: SlideFeel = { motion: ps.motion as Easing | Spring, drift: ps.drift, dim: ps.dim, radius: ps.radius, rail: ps.rail as RailMotion }
  const slide = ps.feel === 'custom' ? custom : (SLIDE_FEELS[ps.feel] ?? SLIDE_FEELS.smooth)
  useEffect(() => setProjectSlide(slide))
  slideMsRef.current = parseFloat(toCssTiming(slide.motion).duration) * 1000

  // Picking a feel loads its numbers into the dials, so custom always starts from it.
  const seedingUntil = useRef(0)
  const feelRef = useRef(ps.feel)
  useEffect(() => {
    if (feelRef.current === ps.feel) return
    feelRef.current = ps.feel
    const feel = SLIDE_FEELS[ps.feel]
    if (!feel) return
    seedingUntil.current = performance.now() + 400
    const { motion } = feel
    setValue(
      'projectSlide.motion',
      motion.type === 'easing' ? { type: 'easing', duration: motion.duration, ease: [...motion.ease] as [number, number, number, number] } : { ...motion },
    )
    setValue('projectSlide.drift', feel.drift)
    setValue('projectSlide.dim', feel.dim)
    setValue('projectSlide.radius', feel.radius)
    setValue('projectSlide.rail', feel.rail)
  }, [ps.feel, setValue])

  // Moving a slide dial yourself means "use my numbers": flip the feel to 'custom'.
  const slideKey = JSON.stringify([ps.motion, ps.drift, ps.dim, ps.radius, ps.rail])
  const [slideKeySeen] = useState(slideKey)
  const slideKeyRef = useRef(slideKeySeen)
  useEffect(() => {
    if (slideKeyRef.current === slideKey) return
    slideKeyRef.current = slideKey
    if (performance.now() < seedingUntil.current) return
    if (ps.feel !== 'custom') setValue('projectSlide.feel', 'custom')
  }, [slideKey, ps.feel, setValue])

  useEffect(() => {
    const style = document.documentElement.style
    const out = toCssTiming(timing.out)
    const into = toCssTiming(timing.in)
    style.setProperty('--vt-out-dur', out.duration)
    style.setProperty('--vt-out-ease', out.easing)
    style.setProperty('--vt-in-dur', into.duration)
    style.setProperty('--vt-in-ease', into.easing)
    style.setProperty('--vt-in-delay', `${timing.inDelay}s`)
    style.setProperty('--vt-dist', `${look.distance}px`)
    style.setProperty('--vt-scale', String(look.scale))
    style.setProperty('--vt-blur', `${look.blur}px`)
    style.setProperty('--vt-out-opacity', String(look.outOpacity))
    style.setProperty('--vt-wipe-radius', `${look.wipeRadius}px`)
    document.documentElement.dataset.vtWipe = look.wipeStyle
  }, [timing, look])

  useEffect(() => {
    const settings: Settings = {
      preset: preset as Preset,
      mirror: look.mirrorOnBack,
      pinNav: pin.nav,
      pinShader: pin.headerShader,
    }
    setTransitionRunner((update, to, from) => run(settings, update, to, from))
  }, [preset, look.mirrorOnBack, pin.nav, pin.headerShader])

  return null
}
