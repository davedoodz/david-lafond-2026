/**
 * Scroll-in reveal presets for a block of items (label + card grid).
 *
 * Items wait, hidden, until the block scrolls into view, then animate in. Only
 * `transform`, `opacity` and `filter` animate (WAAPI), and `transform` leaves the
 * cards' own `scale` hover free. Presets follow the site's existing motion:
 *
 *   rise     fade + lift + unblur, staggered in reading order (the hero/story entrance)
 *   cascade  a diagonal wave from the top-left card, settling from slightly small
 *   spring   cards pop up on a spring (the Selected works sheet intro)
 *   deal     cards start stacked at the grid centre and deal out to their slots
 *            (the About photo stack, spread out)
 */
import { useEffect, type RefObject } from 'react'
import { springEasing } from './springEasing'

type Tuple = [number, number, number, number]

export const REVEAL_PRESETS = ['none', 'rise', 'cascade', 'spring', 'deal'] as const

export const revealDials = () => ({
  preset: { type: 'select' as const, options: [...REVEAL_PRESETS], default: 'rise' },
  /** once: plays the first time. always: replays whenever the block re-enters from below. */
  repeat: { type: 'select' as const, options: ['once', 'always'], default: 'once' },
  /** How far up the viewport (0 = bottom edge, 1 = top) the block's top must come before it starts. */
  trigger: [0.15, 0, 0.8, 0.01] as Tuple,
  delayMs: [0, 0, 1500, 10] as Tuple,
  durationMs: [800, 150, 2500, 10] as Tuple,
  staggerMs: [70, 0, 400, 5] as Tuple,
  distance: [28, 0, 200, 1] as Tuple,
  blur: [8, 0, 24, 0.5] as Tuple,
  bounce: [0.3, 0, 1, 0.01] as Tuple,
  replay: { type: 'action' as const, label: 'Replay' },
  _collapsed: false,
})

export type RevealValues = {
  preset: string
  repeat: string
  trigger: number
  delayMs: number
  durationMs: number
  staggerMs: number
  distance: number
  blur: number
  bounce: number
}

const EXPO_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)'
const QUART_OUT = 'cubic-bezier(0.25, 1, 0.5, 1)'

/**
 * `selector` picks the items inside `ref`, in order. `replayKey` changes re-run it
 * in place (DialKit Replay).
 */
export function useReveal(ref: RefObject<HTMLElement | null>, selector: string, v: RevealValues, replayKey = 0) {
  const key = JSON.stringify(v)
  useEffect(() => {
    const root = ref.current
    if (!root || v.preset === 'none') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const items = Array.from(root.querySelectorAll<HTMLElement>(selector))
    if (!items.length) return

    // Grid position from layout, so the wave/deal follow the real rows and columns.
    const rects = items.map((el) => el.getBoundingClientRect())
    const rows = [...new Set(rects.map((r) => Math.round(r.top)))].sort((a, b) => a - b)
    const cols = [...new Set(rects.map((r) => Math.round(r.left)))].sort((a, b) => a - b)
    const box = rects.reduce(
      (b, r) => ({ l: Math.min(b.l, r.left), t: Math.min(b.t, r.top), r: Math.max(b.r, r.right), b: Math.max(b.b, r.bottom) }),
      { l: Infinity, t: Infinity, r: -Infinity, b: -Infinity },
    )
    const cx = (box.l + box.r) / 2
    const cy = (box.t + box.b) / 2
    const d = v.distance

    const animations = items.map((el, i) => {
      const r = rects[i]
      const row = rows.indexOf(Math.round(r.top))
      const col = cols.indexOf(Math.round(r.left))
      let frames: Keyframe[]
      let easing = EXPO_OUT
      let order = i
      switch (v.preset) {
        case 'cascade':
          order = row + col
          easing = QUART_OUT
          frames = [
            { opacity: 0, transform: `translateY(${d}px) scale(0.92)` },
            { opacity: 1, transform: 'none' },
          ]
          break
        case 'spring':
          easing = springEasing(v.bounce)
          frames = [
            { opacity: 0, transform: `translateY(${d}px) scale(0.85)`, easing: 'linear' },
            { opacity: 1, offset: 0.25 },
            { opacity: 1, transform: 'none' },
          ]
          break
        case 'deal': {
          // Stack at the centre with a small alternating tilt, then fan out.
          const dx = cx - (r.left + r.width / 2)
          const dy = cy - (r.top + r.height / 2) + d
          const tilt = (i % 2 ? 1 : -1) * (2 + (i % 3))
          easing = springEasing(v.bounce * 0.6)
          frames = [
            { opacity: 0, transform: `translate(${dx}px, ${dy}px) rotate(${tilt}deg) scale(0.9)`, easing: 'linear' },
            { opacity: 1, offset: 0.2 },
            { opacity: 1, transform: 'none' },
          ]
          break
        }
        default:
          frames = [
            { opacity: 0, transform: `translateY(${d}px)`, filter: `blur(${v.blur}px)` },
            { opacity: 1, transform: 'none', filter: 'blur(0px)' },
          ]
      }
      const animation = el.animate(frames, {
        duration: v.durationMs,
        delay: v.delayMs + order * v.staggerMs,
        easing,
        fill: 'backwards',
      })
      animation.pause()
      return animation
    })

    const play = () => animations.forEach((a) => a.play())
    const reset = () =>
      animations.forEach((a) => {
        a.pause()
        a.currentTime = 0
      })

    let played = false
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!played) play()
          played = true
          if (v.repeat === 'once') observer.disconnect()
        } else if (v.repeat === 'always' && entry.boundingClientRect.top > 0) {
          // Only re-arm once it is back below the fold, so scrolling up past it does not blink.
          reset()
          played = false
        }
      },
      { rootMargin: `0px 0px -${v.trigger * 100}% 0px` },
    )
    observer.observe(root)

    return () => {
      observer.disconnect()
      animations.forEach((a) => a.cancel())
    }
    // `key` captures every dial.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, replayKey, selector])
}
