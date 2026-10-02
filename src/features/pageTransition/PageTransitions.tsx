import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { navigate, setTransitionRunner, useRoute, type Route } from '../../lib/router'
import { preloadRoute } from '../../lib/routeChunks'
import { toCssTiming } from './cssTiming'
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
  /** Leaving a project page (Back → Work): its own speed and feel. Moving any dial switches `feel` to custom. */
  projectBack: {
    feel: { type: 'select' as const, options: ['smooth', 'glide', 'snappy', 'soft', 'slow', 'custom'], default: 'smooth' },
    preview: { type: 'action' as const, label: 'Preview back wipe' },
    /** right: the Work page slides in from the left, moving right. vertical: the regular mirrored wipe. */
    direction: { type: 'select' as const, options: ['right', 'left', 'vertical'], default: 'right' },
    /** The incoming Work page: duration + curve. */
    motion: { type: 'easing' as const, duration: 0.62, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
    /** Seconds before both pages move. Negative skips into the curve: same motion, no slow start. */
    delay: [0.06, -0.5, 0.8, 0.01] as [number, number, number, number],
    /** The project page leaving underneath: how long it drifts, how far, and how dim it ends. */
    oldDuration: [0.32, 0.1, 2.5, 0.01] as [number, number, number, number],
    oldDrift: [56, 0, 480, 1] as [number, number, number, number],
    oldOpacity: [0.35, 0, 1, 0.05] as [number, number, number, number],
    /** Leading-corner radius of the incoming page (px). */
    radius: [32, 0, 400, 1] as [number, number, number, number],
    _collapsed: false,
  },
  pin: {
    nav: true,
    headerShader: false,
  },
}

/** Page order sets the direction: Work → About plays forward, About → Work mirrors it. */
const ORDER: Record<Route, number> = { work: 0, unwind: 1, filo: 1, 'harvard-mit': 1, about: 2 }
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

type BackFeel = { duration: number; ease: [number, number, number, number]; delay: number; oldDuration: number; oldDrift: number; oldOpacity: number; radius: number }
const BACK_FEELS: Record<string, BackFeel> = {
  /** The current wipe. */
  smooth: { duration: 0.62, ease: [0.22, 1, 0.36, 1], delay: 0.06, oldDuration: 0.32, oldDrift: 56, oldOpacity: 0.35, radius: 32 },
  /** Both pages travel together on one long, even curve. */
  glide: { duration: 1.1, ease: [0.65, 0, 0.35, 1], delay: 0, oldDuration: 1.1, oldDrift: 180, oldOpacity: 0.55, radius: 48 },
  /** Quick and decisive. */
  snappy: { duration: 0.42, ease: [0.2, 0.9, 0.1, 1], delay: 0, oldDuration: 0.28, oldDrift: 36, oldOpacity: 0.2, radius: 20 },
  /** Gentle landing, big soft corners, the old page barely moves. */
  soft: { duration: 0.95, ease: [0.16, 1, 0.3, 1], delay: 0.1, oldDuration: 0.7, oldDrift: 24, oldOpacity: 0.6, radius: 90 },
  /** Unhurried: a long ease-in-out with a wide drift. */
  slow: { duration: 1.6, ease: [0.45, 0, 0.15, 1], delay: 0, oldDuration: 1.45, oldDrift: 140, oldOpacity: 0.4, radius: 60 },
}

type Settings = { preset: Preset; mirror: boolean; projectBack: string; pinNav: boolean; pinShader: boolean }
const PROJECT_ROUTES: Route[] = ['unwind', 'filo', 'harvard-mit']

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

  root.dataset.vt = settings.preset
  const back = ORDER[to] < ORDER[from]
  root.dataset.vtDir =
    back && PROJECT_ROUTES.includes(from) && settings.projectBack !== 'vertical'
      ? settings.projectBack
      : settings.mirror && back
        ? 'back'
        : 'forward'
  // Sideways: each nav rides with its own page, so the wipe edge sweeps over it. Pinned,
  // the old and new nav would crossfade and the dark/light "Work" would wash out mid-way.
  const sideways = root.dataset.vtDir === 'left' || root.dataset.vtDir === 'right'
  if (settings.pinNav && !sideways) pinIfVisible('.nav', 'data-vt-pin-nav')
  if (settings.pinShader) pinIfVisible('.dither-band--header', 'data-vt-pin-shader')

  const transition = document.startViewTransition(async () => {
    // Load the next page's chunk before committing, so the new snapshot is the real page.
    await preloadRoute(to)
    flushSync(update)
  })
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

  const backMsRef = useRef(0)
  const { values, setValue } = useTuningController('Page transition', CONFIG, {
    onAction: (action) => {
      if (action === 'preview') navigate(routeRef.current === 'work' ? 'about' : 'work')
      if (action === 'projectBack.preview') {
        // From a project page, go back; from anywhere else, open Unwind first, then come back.
        if (PROJECT_ROUTES.includes(routeRef.current)) navigate('work')
        else {
          navigate('unwind')
          window.setTimeout(() => navigate('work'), 1400 + backMsRef.current)
        }
      }
    },
  })

  const { preset, timing, look, pin } = values
  const pb = values.projectBack
  const custom: BackFeel = { duration: pb.motion.type === 'easing' ? pb.motion.duration : 0.62, ease: (pb.motion.type === 'easing' ? pb.motion.ease : [0.22, 1, 0.36, 1]) as BackFeel['ease'], delay: pb.delay, oldDuration: pb.oldDuration, oldDrift: pb.oldDrift, oldOpacity: pb.oldOpacity, radius: pb.radius }
  const back = pb.feel === 'custom' ? custom : (BACK_FEELS[pb.feel] ?? BACK_FEELS.smooth)
  backMsRef.current = back.duration * 1000

  // Picking a preset loads its numbers into the dials, so custom always starts from it.
  const seedingUntil = useRef(0)
  const feelRef = useRef(pb.feel)
  useEffect(() => {
    if (feelRef.current === pb.feel) return
    feelRef.current = pb.feel
    const preset = BACK_FEELS[pb.feel]
    if (!preset) return
    seedingUntil.current = performance.now() + 400
    setValue('projectBack.motion', { type: 'easing', duration: preset.duration, ease: preset.ease })
    setValue('projectBack.delay', preset.delay)
    setValue('projectBack.oldDuration', preset.oldDuration)
    setValue('projectBack.oldDrift', preset.oldDrift)
    setValue('projectBack.oldOpacity', preset.oldOpacity)
    setValue('projectBack.radius', preset.radius)
  }, [pb.feel, setValue])

  // Moving a back-wipe dial yourself means "use my numbers": flip the feel to 'custom'.
  const backKey = JSON.stringify([pb.motion, pb.delay, pb.oldDuration, pb.oldDrift, pb.oldOpacity, pb.radius])
  const [backKeySeen] = useState(backKey)
  const backKeyRef = useRef(backKeySeen)
  useEffect(() => {
    if (backKeyRef.current === backKey) return
    backKeyRef.current = backKey
    if (performance.now() < seedingUntil.current) return
    if (pb.feel !== 'custom') setValue('projectBack.feel', 'custom')
  }, [backKey, pb.feel, setValue])

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

  const backCss = JSON.stringify(back)
  useEffect(() => {
    const style = document.documentElement.style
    style.setProperty('--vt-back-dur', `${back.duration}s`)
    style.setProperty('--vt-back-ease', `cubic-bezier(${back.ease.join(', ')})`)
    style.setProperty('--vt-back-delay', `${back.delay}s`)
    // A negative delay (head start) applies to both pages so they stay in step.
    style.setProperty('--vt-back-out-delay', `${Math.min(0, back.delay)}s`)
    style.setProperty('--vt-back-out-dur', `${back.oldDuration}s`)
    style.setProperty('--vt-back-dist', `${back.oldDrift}px`)
    style.setProperty('--vt-back-out-opacity', String(back.oldOpacity))
    style.setProperty('--vt-back-radius', `${back.radius}px`)
    // `back` is fully captured by backCss.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backCss])

  useEffect(() => {
    const settings: Settings = {
      preset: preset as Preset,
      mirror: look.mirrorOnBack,
      projectBack: pb.direction,
      pinNav: pin.nav,
      pinShader: pin.headerShader,
    }
    setTransitionRunner((update, to, from) => run(settings, update, to, from))
  }, [preset, look.mirrorOnBack, pb.direction, pin.nav, pin.headerShader])

  return null
}
