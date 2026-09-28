import { useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import { navigate, setTransitionRunner, useRoute, type Route } from '../../lib/router'
import { preloadRoute } from '../../lib/routeChunks'
import { toCssTiming } from './cssTiming'
import { useTuning } from '../../tuning/useTuning'
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
  pin: {
    nav: true,
    headerShader: false,
  },
}

/** Page order sets the direction: Work → About plays forward, About → Work mirrors it. */
const ORDER: Record<Route, number> = { work: 0, 'harvard-mit': 1, about: 2 }
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

type Settings = { preset: Preset; mirror: boolean; pinNav: boolean; pinShader: boolean }

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
  root.dataset.vtDir = settings.mirror && ORDER[to] < ORDER[from] ? 'back' : 'forward'
  if (settings.pinNav) pinIfVisible('.nav', 'data-vt-pin-nav')
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

  const values = useTuning('Page transition', CONFIG, {
    onAction: (action) => {
      if (action === 'preview') navigate(routeRef.current === 'work' ? 'about' : 'work')
    },
  })

  const { preset, timing, look, pin } = values

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
