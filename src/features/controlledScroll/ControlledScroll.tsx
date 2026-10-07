import { useEffect, useRef } from 'react'
import { useTuning } from '../../tuning/useTuning'

type Tuple = [number, number, number, number]

/**
 * Wheel / trackpad scrolling with a speed limit, so a hard swipe glides instead of flinging
 * the page. Each wheel event is capped (`maxStep`), the page eases toward the target
 * (`ease`) and never moves faster than `downSpeed` / `upSpeed`. Keyboard, scrollbar and touch scrolling
 * stay native. Inner scroll areas, zoom (ctrl+wheel) and anything that already handled the
 * wheel (flip book, project-open overlay) are left alone.
 */
type Feel = { snap: 'none' | 'proximity' | 'mandatory' | 'stop'; maxStep?: number; speed?: number; ease?: number; reach?: number }
/**
 * Snap feels for Selected works: each sets the snap strength plus (except `free`) the glide.
 * `free` has no snap and leaves distance/speed to the up/down dials; `custom` uses all the
 * dials and the snap chosen in Selected works › spacing.
 *   stop: mandatory snap that also refuses to pass a project (scroll-snap-stop: always).
 */
const FEELS: Record<string, Feel> = {
  soft: { snap: 'proximity', maxStep: 66, speed: 1950, ease: 0.14, reach: 1 },
  firm: { snap: 'mandatory', maxStep: 70, speed: 2200, ease: 0.16, reach: 1 },
  'one at a time': { snap: 'stop', maxStep: 80, speed: 2600, ease: 0.18, reach: 0.8 },
  'slow glide': { snap: 'proximity', maxStep: 40, speed: 1200, ease: 0.08, reach: 0.7 },
  heavy: { snap: 'mandatory', maxStep: 45, speed: 1500, ease: 0.07, reach: 0.9 },
  quick: { snap: 'proximity', maxStep: 120, speed: 4000, ease: 0.25, reach: 1.5 },
  free: { snap: 'none' },
}

const SCROLL_CONFIG = {
  /** controlled: capped, eased wheel scrolling. native: the browser's own; every dial below is then ignored. */
  mode: {
    type: 'select' as const,
    options: [
      { value: 'controlled', label: 'controlled' },
      { value: 'scaled', label: 'native, scaled (multiplier + max step)' },
      { value: 'native', label: 'native (dials off)' },
    ],
    default: 'controlled',
  },
  /** Snap feel preset (Selected works); custom = the dials below. */
  feel: { type: 'select' as const, options: [...Object.keys(FEELS), 'custom'], default: 'free' },
  /** Largest distance one wheel event may add (px). Lower = a hard swipe travels less. */
  maxStep: [70, 10, 240, 1] as Tuple,
  /** Furthest one swipe can travel, in screen heights (scrolling down / up). */
  downDistance: [1, 0.2, 5, 0.05] as Tuple,
  upDistance: [1, 0.2, 5, 0.05] as Tuple,
  /** Top speed, px per second (scrolling down / up). */
  downSpeed: [2200, 300, 8000, 50] as Tuple,
  upSpeed: [2200, 300, 8000, 50] as Tuple,
  /** Share of the remaining distance covered each frame (higher = snappier). */
  ease: [0.14, 0.04, 0.5, 0.01] as Tuple,
  /** Scales every wheel event (1 = as the device reports it). */
  multiplier: [1, 0.3, 2, 0.05] as Tuple,
  _collapsed: true,
}

/** Nearest ancestor (below the page) that can still scroll in this direction. */
function scrollableAncestor(start: EventTarget | null, dy: number): boolean {
  let el = start instanceof Element ? start : null
  while (el && el !== document.body && el !== document.documentElement) {
    if (el.closest('.dialkit-root, [class*="dialkit"]')) return true
    const { overflowY } = getComputedStyle(el)
    if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 1) {
      const atTop = el.scrollTop <= 0
      const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 1
      if ((dy < 0 && !atTop) || (dy > 0 && !atEnd)) return true
    }
    el = el.parentElement
  }
  return false
}

export function ControlledScroll() {
  const t = useTuning('Scroll', SCROLL_CONFIG)
  const preset = FEELS[t.feel]
  const ref = useRef(t)
  ref.current = preset?.speed
    ? { ...t, ...preset, downSpeed: preset.speed, upSpeed: preset.speed, downDistance: preset.reach ?? t.downDistance, upDistance: preset.reach ?? t.upDistance }
    : t

  // The feel's snap strength overrides Selected works › spacing › snap while a preset is active.
  useEffect(() => {
    const root = document.documentElement
    // Native mode: the browser scrolls and Selected works › spacing decides the snap.
    if (preset && t.mode === 'controlled') root.dataset.scrollFeel = preset.snap
    else delete root.dataset.scrollFeel
    return () => void delete root.dataset.scrollFeel
  }, [preset, t.mode])

  useEffect(() => {
    const root = document.documentElement
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let target = window.scrollY
    // Float position we drive; scrollY rounds to device pixels and would never settle.
    let pos = target
    // Where the current swipe started; a swipe ends after a short pause in wheel events.
    let origin: number | null = null
    let frame = 0
    let last = 0
    let gestureEnd = 0
    let snapHeld = false
    // Snap is paused while gliding (it would yank each step) and restored afterwards, so the
    // page still settles on a section.
    const holdSnap = () => {
      if (snapHeld || !(root.dataset.caseSnap || root.dataset.worksSnap)) return
      snapHeld = true
      root.style.scrollSnapType = 'none'
    }
    const releaseSnap = () => {
      if (!snapHeld) return
      snapHeld = false
      root.style.scrollSnapType = ''
      window.scrollTo({ top: window.scrollY, behavior: 'instant' })
    }
    const max = () => root.scrollHeight - window.innerHeight

    const step = (now: number) => {
      if (root.dataset.playgroundZoomOpen) {
        frame = 0
        target = pos = window.scrollY
        origin = null
        releaseSnap()
        return
      }
      frame = 0
      const dt = Math.min(64, now - (last || now - 16))
      last = now
      const gap = target - pos
      if (Math.abs(gap) < 0.5) {
        pos = target
        window.scrollTo({ top: target, behavior: 'instant' })
        last = 0
        if (origin === null) releaseSnap()
        return
      }
      const { ease, downSpeed, upSpeed } = ref.current
      const maxSpeed = gap > 0 ? downSpeed : upSpeed
      const k = 1 - Math.pow(1 - ease, dt / 16.67)
      const limit = (maxSpeed * dt) / 1000
      pos += Math.max(-limit, Math.min(limit, gap * k))
      window.scrollTo({ top: pos, behavior: 'instant' })
      frame = requestAnimationFrame(step)
    }

    const onWheel = (e: WheelEvent) => {
      if (root.dataset.playgroundZoomOpen) {
        e.preventDefault()
        return
      }
      const mode = ref.current.mode
      if (mode === 'native') return
      if (e.defaultPrevented || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      const { maxStep, multiplier, downDistance, upDistance } = ref.current
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1
      const dy = Math.max(-maxStep, Math.min(maxStep, e.deltaY * unit * multiplier))
      if (!dy || scrollableAncestor(e.target, dy)) return
      e.preventDefault()
      // Scaled: each trackpad/wheel event moves the page straight away, so the OS momentum
      // curve still drives the feel; only its size changes (multiplier, capped by maxStep).
      if (mode === 'scaled') return void window.scrollBy({ top: dy, behavior: 'instant' })
      if (!frame) target = pos = window.scrollY
      if (origin === null) origin = window.scrollY
      target += dy
      const vh = window.innerHeight
      target = Math.max(0, origin - upDistance * vh, Math.min(max(), origin + downDistance * vh, target))
      holdSnap()
      clearTimeout(gestureEnd)
      gestureEnd = window.setTimeout(() => {
        origin = null
        if (!frame) releaseSnap()
      }, 160)
      if (reduced) return void window.scrollTo({ top: target, behavior: 'instant' })
      if (!frame) frame = requestAnimationFrame(step)
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.removeEventListener('wheel', onWheel)
      cancelAnimationFrame(frame)
      clearTimeout(gestureEnd)
      releaseSnap()
    }
  }, [])

  return null
}
