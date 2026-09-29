/**
 * Momo (the Unwind cloud) floating in the middle of the Unwind card.
 *
 * Two transparent clips: VP9-alpha WebM for Chrome/Firefox, HEVC-alpha MOV for
 * WebKit. `clip` picks one looping clip, or both played
 * back to back: each clip plays once, then hands over to the other.
 *
 * The hand-over overlaps: the next clip starts `fadeMs` before the current one
 * ends and the two blend (opacity, blur, scale — compositor-only) so the loop
 * reads as one continuous animation.
 */
import { useEffect, useRef, type CSSProperties } from 'react'
import { useTuningController } from '../tuning/useTuning'

type Tuple = [number, number, number, number]
type Clip = 'listening' | 'floating'

const CLIPS: Clip[] = ['listening', 'floating']

/**
 * WebKit (Safari, every iOS browser) plays WebM but drops its alpha; Chrome plays
 * HEVC but drops *its* alpha. So pick by engine rather than by <source> order.
 */
const USE_HEVC =
  typeof navigator !== 'undefined' &&
  (/iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent)) ||
    (/Safari\//.test(navigator.userAgent) && !/Chrome|Chromium|Edg|Firefox|OPR/.test(navigator.userAgent)))
const clipUrl = (clip: Clip) => `/work/unwind/momo-${clip}.${USE_HEVC ? 'mov' : 'webm'}`

const CONFIG = {
  clip: { type: 'select' as const, options: ['listening', 'floating', 'both'], default: 'both' },
  /** Video height as % of the card height. */
  size: [40, 5, 120, 0.5] as Tuple,
  /** Offset from the card centre, % of card width / height. */
  x: [0, -50, 50, 0.5] as Tuple,
  y: [0, -50, 50, 0.5] as Tuple,
  /** How "both" hands one clip over to the other. */
  transition: {
    preset: {
      type: 'select' as const,
      options: ['cut', 'crossfade', 'soft blur', 'breathe', 'dip', 'custom'],
      default: 'breathe',
    },
    /** Blend length; the next clip starts this long before the current one ends. */
    fadeMs: [700, 0, 2500, 10] as Tuple,
    /** Blur at the ends of the blend (px). */
    blur: [4, 0, 20, 0.5] as Tuple,
    /** Scale the outgoing clip shrinks/grows to. */
    outScale: [0.94, 0.7, 1.3, 0.01] as Tuple,
    /** Scale the incoming clip starts from. */
    inScale: [1.06, 0.7, 1.3, 0.01] as Tuple,
    /** Fade fully out before fading in (no overlap). */
    dip: false,
    _collapsed: false,
  },
}

type Blend = { fadeMs: number; blur: number; outScale: number; inScale: number; dip: boolean }
const PRESETS: Record<string, Blend> = {
  cut: { fadeMs: 0, blur: 0, outScale: 1, inScale: 1, dip: false },
  crossfade: { fadeMs: 500, blur: 0, outScale: 1, inScale: 1, dip: false },
  'soft blur': { fadeMs: 700, blur: 6, outScale: 1, inScale: 1, dip: false },
  breathe: { fadeMs: 700, blur: 4, outScale: 0.94, inScale: 1.06, dip: false },
  dip: { fadeMs: 600, blur: 2, outScale: 0.97, inScale: 0.97, dip: true },
}

export function MomoCard() {
  const { values: t, setValue } = useTuningController('Unwind Momo', CONFIG)
  const hostRef = useRef<HTMLDivElement>(null)
  const videos = useRef<Record<Clip, HTMLVideoElement | null>>({ listening: null, floating: null })

  const tr = t.transition
  const blend: Blend = tr.preset === 'custom' ? tr : (PRESETS[tr.preset] ?? PRESETS.breathe)
  // Read by the playback loop without restarting it.
  const fadeRef = useRef(blend.fadeMs)
  fadeRef.current = blend.fadeMs

  // Moving a blend dial means "use my numbers": flip the preset to 'custom'.
  const blendKey = `${tr.fadeMs}|${tr.blur}|${tr.outScale}|${tr.inScale}|${tr.dip}`
  const blendKeyRef = useRef(blendKey)
  useEffect(() => {
    if (blendKeyRef.current === blendKey) return
    blendKeyRef.current = blendKey
    if (tr.preset !== 'custom') setValue('transition.preset', 'custom')
  }, [blendKey, tr.preset, setValue])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const order: Clip[] = t.clip === 'both' ? CLIPS : [t.clip as Clip]
    let active = 0
    let visible = false
    let handing = false
    let frame = 0
    let settle = 0

    // data-state: active (shown), out (blending away), idle (hidden, reset to its entry pose).
    const setState = (clip: Clip, state: 'active' | 'out' | 'idle') => {
      const v = videos.current[clip]
      if (v) v.dataset.state = state
    }
    const pauseAll = () => {
      cancelAnimationFrame(frame)
      frame = 0
      CLIPS.forEach((c) => videos.current[c]?.pause())
    }
    // Watch the playhead so the next clip can start `fadeMs` before this one ends.
    const tick = () => {
      frame = 0
      const v = videos.current[order[active]]
      if (!v || !visible) return
      if (!handing && v.duration && v.currentTime >= v.duration - fadeRef.current / 1000) handOver()
      frame = requestAnimationFrame(tick)
    }
    const play = () => {
      const v = videos.current[order[active]]
      if (!v || reduced || !visible) return
      void v.play().catch(() => {})
      if (order.length > 1 && !frame) frame = requestAnimationFrame(tick)
    }
    const handOver = () => {
      handing = true
      const from = order[active]
      active = (active + 1) % order.length
      const to = order[active]
      const next = videos.current[to]
      if (next) next.currentTime = 0
      setState(from, 'out')
      setState(to, 'active')
      play()
      window.clearTimeout(settle)
      settle = window.setTimeout(() => {
        const prev = videos.current[from]
        prev?.pause()
        if (prev) prev.currentTime = 0
        setState(from, 'idle')
        handing = false
      }, fadeRef.current + 20)
    }

    for (const c of CLIPS) {
      const v = videos.current[c]
      if (!v) continue
      v.pause()
      v.currentTime = 0
      // One clip loops natively; "both" hands over on `ended` instead.
      v.loop = order.length === 1
    }
    for (const c of CLIPS) setState(c, c === order[0] ? 'active' : 'idle')

    // Fallback for a zero-length blend (cut) or a missed frame near the end.
    const onEnded = () => {
      if (!handing) handOver()
    }
    const listeners = order.map((c) => {
      const v = videos.current[c]
      v?.addEventListener('ended', onEnded)
      return v
    })

    // Only decode while the card is on screen.
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) play()
      else pauseAll()
    })
    observer.observe(host)

    return () => {
      observer.disconnect()
      listeners.forEach((v) => v?.removeEventListener('ended', onEnded))
      window.clearTimeout(settle)
      pauseAll()
    }
  }, [t.clip])

  return (
    <div
      ref={hostRef}
      className="momo"
      aria-hidden="true"
      data-dip={blend.dip || undefined}
      style={
        {
          '--momo-size': `${t.size}%`,
          '--momo-x': `${t.x}%`,
          '--momo-y': `${t.y}%`,
          '--momo-fade': `${blend.fadeMs}ms`,
          '--momo-blur': `${blend.blur}px`,
          '--momo-out-scale': blend.outScale,
          '--momo-in-scale': blend.inScale,
        } as CSSProperties
      }
    >
      {CLIPS.map((clip) => (
        <video
          key={clip}
          ref={(el) => {
            videos.current[clip] = el
          }}
          className="momo__clip"
          muted
          playsInline
          preload="auto"
          data-state={clip === CLIPS[0] ? 'active' : 'idle'}
          src={clipUrl(clip)}
        />
      ))}
    </div>
  )
}
