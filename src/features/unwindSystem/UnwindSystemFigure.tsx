import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { MomoMark } from '../unwindIntro/MomoMark'
import { mountUnwindSystem, type UnwindSystemHandle } from './mountUnwindSystem'
import { useTuningController } from '../../tuning/useTuning'

type Tuple = [number, number, number, number]
type SequenceDials = {
  sequenceSpeed: number
  motionSpeed: number
  card: { show: boolean; radius: number; fill: string; scaleX: number; scaleY: number }
  momoLogo: { x: number; y: number; scale: number }
  momoText: { x: number; y: number; scale: number }
  icons: { circleColor: string }
}

export const UNWIND_SYSTEM_SEQUENCE_CONFIG = {
  /** Changes the hold between story beats. */
  sequenceSpeed: [1, 0.25, 3, 0.05] as Tuple,
  /** Changes line draws, text reveals and icon motion without changing their relative timing. */
  motionSpeed: [1, 0.25, 3, 0.05] as Tuple,
  card: {
    show: true,
    radius: [48, 0, 160, 1] as Tuple,
    fill: { type: 'color' as const, default: '#53BFFE' },
    scaleX: [1, 0.5, 1.5, 0.01] as Tuple,
    scaleY: [1, 0.5, 1.5, 0.01] as Tuple,
  },
  momoLogo: {
    x: [0, -200, 200, 1] as Tuple,
    y: [0, -160, 160, 1] as Tuple,
    scale: [1, 0.4, 2, 0.01] as Tuple,
  },
  momoText: {
    x: [0, -200, 200, 1] as Tuple,
    y: [0, -160, 160, 1] as Tuple,
    scale: [1, 0.4, 2, 0.01] as Tuple,
  },
  icons: {
    circleColor: { type: 'color' as const, default: '#FFFFFF' },
  },
}

/** Below this width the diagram switches to the diamond layout. */
const NARROW = '(max-width: 720px)'

/** Light fills use blue/ink artwork; saturated or dark fills use white. */
function cardColors(fill: string) {
  const hex = fill.trim().replace('#', '')
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex
  if (!/^[0-9a-f]{6}$/i.test(full)) return { ink: '#FFFFFF', accent: '#FFFFFF', muted: 'rgb(255 255 255 / 0.68)' }
  const channels = [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16) / 255)
  const linear = channels.map((c) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
  return luminance > 0.58
    ? { ink: '#171717', accent: '#159DD2', muted: '#6F6B68' }
    : { ink: '#FFFFFF', accent: '#FFFFFF', muted: 'rgb(255 255 255 / 0.68)' }
}

/**
 * The case study's system figure: the studio walkthrough's exact timed sequence,
 * without its caption, controls or step navigation.
 */
export function UnwindSystemFigure() {
  const ref = useRef<HTMLDivElement>(null)
  const [narrow, setNarrow] = useState(() => matchMedia(NARROW).matches)
  const { values } = useTuningController('Unwind system sequence', UNWIND_SYSTEM_SEQUENCE_CONFIG)
  const speed = values as unknown as SequenceDials
  const colors = cardColors(speed.card.show ? speed.card.fill : '#F5F5F5')
  const style = {
    '--system-card-fill': speed.card.fill,
    '--system-card-opacity': speed.card.show ? 1 : 0,
    '--system-card-radius': `${speed.card.radius}px`,
    '--system-card-scale-x': speed.card.scaleX,
    '--system-card-scale-y': speed.card.scaleY,
    '--system-logo-x': `${speed.momoLogo.x}px`,
    '--system-logo-y': `${speed.momoLogo.y}px`,
    '--system-logo-scale': speed.momoLogo.scale,
    '--system-text-x': `${speed.momoText.x}px`,
    '--system-text-y': `${speed.momoText.y}px`,
    '--system-text-scale': speed.momoText.scale,
    '--system-icon-circle': speed.icons.circleColor,
    '--system-card-ink': colors.ink,
    '--system-card-accent': colors.accent,
    '--system-card-muted': colors.muted,
  } as CSSProperties

  useEffect(() => {
    const query = matchMedia(NARROW)
    const onChange = () => setNarrow(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  // The layout is built once per mount, so a width change across NARROW remounts the diagram.
  useEffect(() => {
    const host = ref.current
    if (!host) return
    // Each mount gets its own box, so an earlier mount still resolving can't clear a newer one.
    const root = host.appendChild(document.createElement('div'))
    let cancelled = false
    let handle: UnwindSystemHandle | undefined
    let observer: IntersectionObserver | undefined
    mountUnwindSystem(root, { mode: 'sequence', narrow, sequenceSpeed: speed.sequenceSpeed, motionSpeed: speed.motionSpeed }).then((mounted) => {
      if (cancelled) return mounted.destroy()
      handle = mounted
      observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) mounted.start()
        else mounted.pause()
      }, { threshold: 0.35 })
      observer.observe(root)
    })
    return () => {
      cancelled = true
      observer?.disconnect()
      handle?.destroy()
      root.remove()
    }
  }, [narrow, speed.sequenceSpeed, speed.motionSpeed])

  return (
    <div className="case__figure unwind-system" style={style}>
      <div className="unwind-system__brand" aria-label="Momo">
        <MomoMark className="unwind-system__mark" color="var(--system-card-accent)" />
        <span className="unwind-system__type" aria-hidden="true" />
      </div>
      <div ref={ref} className="unwind-system__diagram" />
    </div>
  )
}
