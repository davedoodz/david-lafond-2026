/**
 * Momo (the Unwind cloud) floating in the middle of the Unwind card.
 *
 * Two transparent clips: VP9-alpha WebM for Chrome/Firefox, HEVC-alpha MOV for
 * WebKit. `clip` picks one looping clip, or both played
 * back to back: each clip plays once, then hands over to the other.
 */
import { useEffect, useRef, type CSSProperties } from 'react'
import { useTuning } from '../tuning/useTuning'

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
}

export function MomoCard() {
  const t = useTuning('Unwind Momo', CONFIG)
  const hostRef = useRef<HTMLDivElement>(null)
  const videos = useRef<Record<Clip, HTMLVideoElement | null>>({ listening: null, floating: null })

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const order: Clip[] = t.clip === 'both' ? CLIPS : [t.clip as Clip]
    let active = 0
    let visible = false

    const show = (clip: Clip) => {
      for (const c of CLIPS) {
        const v = videos.current[c]
        if (v) v.dataset.active = String(c === clip)
      }
    }
    const play = () => {
      const v = videos.current[order[active]]
      if (!v || reduced || !visible) return
      void v.play().catch(() => {})
    }
    const pauseAll = () => CLIPS.forEach((c) => videos.current[c]?.pause())

    for (const c of CLIPS) {
      const v = videos.current[c]
      if (!v) continue
      v.pause()
      v.currentTime = 0
      // One clip loops natively; "both" hands over on `ended` instead.
      v.loop = order.length === 1
    }
    show(order[0])

    const onEnded = () => {
      active = (active + 1) % order.length
      const next = videos.current[order[active]]
      if (next) next.currentTime = 0
      show(order[active])
      play()
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
      pauseAll()
    }
  }, [t.clip])

  return (
    <div
      ref={hostRef}
      className="momo"
      aria-hidden="true"
      style={{ '--momo-size': `${t.size}%`, '--momo-x': `${t.x}%`, '--momo-y': `${t.y}%` } as CSSProperties}
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
          data-active={clip === CLIPS[0]}
          src={clipUrl(clip)}
        />
      ))}
    </div>
  )
}
