import { useEffect, useRef, type CSSProperties, type PointerEvent } from 'react'
import type { ResolvedValues } from 'dialkit'
import { ArrowUpRightIcon } from '../../components/icons'

type Tuple = [number, number, number, number]

export const videoDials = {
  scaleDesktop: [1, 0.3, 1, 0.01] as Tuple,
  scaleMobile: [1, 0.3, 1, 0.01] as Tuple,
  radius: [12, 0, 40, 1] as Tuple,
  speed: [2, 0.25, 10, 0.25] as Tuple,
  autoplay: true,
  hoverLabel: { type: 'text' as const, default: '200k+ views on YouTube!' },
  pill: { type: 'select' as const, options: ['light', 'dark'], default: 'dark' },
  label: {
    pillScale: [1, 0.5, 2, 0.05] as Tuple,
    textScale: [1, 0.5, 2, 0.05] as Tuple,
    arrowScale: [1, 0.25, 2.5, 0.05] as Tuple,
    arrowX: [0, -40, 40, 1] as Tuple,
    arrowY: [0, -40, 40, 1] as Tuple,
    entrance: {
      type: 'select' as const,
      options: ['burst', 'slingshot', 'stamp', 'whip', 'cannonball', 'uppercut', 'rubberband', 'flip', 'ricochet', 'spin-in'],
      default: 'burst',
    },
    duration: [480, 150, 1000, 10] as Tuple,
    idle: {
      type: 'select' as const,
      options: ['off', 'heartbeat', 'bounce', 'wiggle', 'jelly', 'pulse', 'levitate'],
      default: 'pulse',
    },
    idleIntensity: [1, 0, 2, 0.05] as Tuple,
    idleDuration: [1800, 1000, 5000, 50] as Tuple,
    pulse: {
      feel: { type: 'select' as const, options: ['soft', 'punchy', 'snappy'], default: 'snappy' },
      speed: [1.25, 0.25, 4, 0.05] as Tuple,
      growMs: [100, 50, 3000, 10] as Tuple,
      holdMs: [0, 0, 2000, 10] as Tuple,
      shrinkMs: [140, 50, 3000, 10] as Tuple,
      pauseMs: [800, 0, 5000, 50] as Tuple,
    },
  },
  tilt: {
    enabled: true,
    angle: [5, 0, 16, 0.5] as Tuple,
    push: [0.018, 0, 0.08, 0.001] as Tuple,
    perspective: [1600, 600, 3000, 50] as Tuple,
    smoothing: [320, 80, 900, 10] as Tuple,
    glare: [0.12, 0, 0.4, 0.01] as Tuple,
    shadow: [0.6, 0, 1, 0.05] as Tuple,
  },
}

const VIDEO_START_SECONDS = 9 * 60

/**
 * Portfolio book → Video tunes speed (2× default, 0.25–10×), Label appearance,
 * entrance plus idle motion, and Tilt angle/push/perspective/smoothing/glare/shadow.
 * Media: the full Rv-e5doUc0E walkthrough, H.264 720p, audio removed, fast-start MP4.
 * Keep its native timeline: speed belongs to playbackRate, not a baked time warp.
 * The media fragment and each ended event seek to 9:00; native loop would restart at zero.
 * Label entrance and idle use separate transform layers. Idle waits for entrance
 * duration, then repeats at its own duration/intensity; Off disables it.
 * Pulse uses grow/peak-hold/shrink/rest timings in milliseconds; other idle presets
 * use Idle Duration. Pulse timing changes do not alter entrance duration.
 * Offscreen, hidden-tab, inactive-mode, and reduced-motion previews pause.
 * The stationary link owns the hit area; only its child tilts, avoiding edge jitter.
 * On hover the pill is centered on the pointer and replaces the global dot.
 * Cursor ownership is released on pointer exit, mode changes, and unmount.
 */
export function VideoCard({ active, look }: { active: boolean; look: ResolvedValues<typeof videoDials> }) {
  const pane = useRef<HTMLDivElement>(null)
  const link = useRef<HTMLAnchorElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const label = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (video.current) video.current.playbackRate = look.speed
  }, [look.speed])

  useEffect(() => {
    const media = video.current
    const card = link.current
    if (!media || !card) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let visible = false
    let disposed = false
    const shouldPlay = () => active && visible && look.autoplay && !reduced.matches && !document.hidden && !disposed
    const sync = () => {
      if (!shouldPlay()) media.pause()
      else void media.play().then(() => { if (!shouldPlay()) media.pause() }).catch(() => {
        // Autoplay can be denied by browser policy; the poster remains a working YouTube link.
      })
    }
    const repeat = () => {
      media.currentTime = VIDEO_START_SECONDS
      sync()
    }
    media.addEventListener('ended', repeat)
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync() })
    observer.observe(card)
    reduced.addEventListener('change', sync)
    document.addEventListener('visibilitychange', sync)
    return () => {
      disposed = true
      observer.disconnect()
      media.removeEventListener('ended', repeat)
      reduced.removeEventListener('change', sync)
      document.removeEventListener('visibilitychange', sync)
      media.pause()
    }
  }, [active, look.autoplay])

  const ownsCursor = useRef(false)
  useEffect(() => () => {
    if (ownsCursor.current) {
      ownsCursor.current = false
      window.dispatchEvent(new Event('cursor:show'))
    }
  }, [active])

  const move = (event: PointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType === 'touch' || !pane.current || !label.current) return
    const rect = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty('--hx', String((event.clientX - rect.left) / rect.width * 2 - 1))
    event.currentTarget.style.setProperty('--hy', String((event.clientY - rect.top) / rect.height * 2 - 1))
    const bounds = pane.current.getBoundingClientRect()
    const width = label.current.offsetWidth * look.label.pillScale
    const height = label.current.offsetHeight * look.label.pillScale
    // The pill replaces the dot: center its resting bounds on the pointer.
    const x = event.clientX - width / 2
    const y = event.clientY - height / 2
    pane.current.style.setProperty('--x', `${x - bounds.left}px`)
    pane.current.style.setProperty('--y', `${y - bounds.top}px`)
  }

  const pulse = look.label.pulse
  const beatMs = pulse.growMs + pulse.holdMs + pulse.shrinkMs
  const pulseTotal = beatMs * 2 + pulse.pauseMs
  const peak = pulse.feel === 'soft' ? 0.65 : pulse.feel === 'punchy' ? 1.25 : 1
  const second = pulse.feel === 'punchy' ? 0.85 : 0.6
  const attack = pulse.feel === 'snappy' ? 0.85 : pulse.feel === 'punchy' ? 0.7 : 0.5
  const point = (value: number, ms: number) => `${value} ${ms * 100 / pulseTotal}%`
  // Two quick beats, then a rest. Feel shapes the attack and second-beat strength;
  // speed scales the complete rhythm without changing those proportions.
  const beat = (start: number, strength: number) => [
    point(0, start),
    point(strength * attack, start + pulse.growMs * 0.5),
    point(strength, start + pulse.growMs),
    point(strength, start + pulse.growMs + pulse.holdMs),
    point(strength * 0.25, start + pulse.growMs + pulse.holdMs + pulse.shrinkMs * 0.5),
    point(0, start + beatMs),
  ]
  const pulseEase = `linear(${[...beat(0, peak), ...beat(beatMs, peak * second), point(0, pulseTotal)].join(', ')})`

  const style = {
    '--pill-scale': look.label.pillScale,
    '--pill-text-scale': look.label.textScale,
    '--arrow-scale': look.label.arrowScale,
    '--arrow-x': `${look.label.arrowX}px`,
    '--arrow-y': `${look.label.arrowY}px`,
    '--pill-ms': `${look.label.duration}ms`,
    '--pill-idle-ms': `${look.label.idleDuration}ms`,
    '--pill-idle-strength': look.label.idleIntensity,
    '--pill-pulse-ms': `${pulseTotal / pulse.speed}ms`,
    '--pill-pulse-ease': pulseEase,
    '--tilt-angle': `${look.tilt.enabled ? look.tilt.angle : 0}deg`,
    '--tilt-scale': 1 - (look.tilt.enabled ? look.tilt.push : 0),
    '--tilt-perspective': `${look.tilt.perspective}px`,
    '--tilt-ms': `${look.tilt.smoothing}ms`,
    '--tilt-glare': look.tilt.enabled ? look.tilt.glare : 0,
    '--tilt-shadow': look.tilt.shadow,
  } as CSSProperties

  return (
    <div ref={pane} className="viewer__video" data-pill={look.pill} data-entrance={look.label.entrance}
      data-idle={look.label.idle} style={style} aria-hidden={!active} inert={!active}>
      <a ref={link} className="viewer__video-frame" href="https://www.youtube.com/watch?v=Rv-e5doUc0E"
        target="_blank" rel="noopener noreferrer" aria-label="Watch the Harvard & MIT portfolio walkthrough on YouTube (opens in a new tab)"
        onPointerEnter={(event) => {
          if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
          ownsCursor.current = true
          window.dispatchEvent(new Event('cursor:hide'))
          move(event)
        }} onPointerMove={move}
        onPointerLeave={(event) => {
          if (ownsCursor.current) {
            ownsCursor.current = false
            window.dispatchEvent(new Event('cursor:show'))
          }
          event.currentTarget.style.setProperty('--hx', '0')
          event.currentTarget.style.setProperty('--hy', '0')
        }}>
        <span className="viewer__video-surface">
          <video ref={video} src={`/work/harvard-mit/walkthrough.mp4#t=${VIDEO_START_SECONDS}`} poster="/work/harvard-mit/walkthrough.webp"
            muted playsInline preload="metadata" disablePictureInPicture aria-hidden="true" />
          <span className="viewer__video-glare" />
        </span>
      </a>
      <span className="viewer__video-label" aria-hidden="true">
        <span className="viewer__video-label-scale">
          <span className="viewer__video-label-entrance">
            <span ref={label} className="viewer__video-pill">
              <span className="viewer__video-label-text">{look.hoverLabel}</span>
              <ArrowUpRightIcon className="viewer__video-arrow" />
            </span>
          </span>
        </span>
      </span>
    </div>
  )
}
