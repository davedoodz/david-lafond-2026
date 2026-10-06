import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { MomoMark } from '../unwindIntro/MomoMark'
import { mountUnwindSystem, TIP_ANIMATIONS, type TipAnimation, type UnwindSystemHandle } from './mountUnwindSystem'
import { useTuningController } from '../../tuning/useTuning'

type Tuple = [number, number, number, number]
type SequenceDials = {
  sequenceSpeed: number
  motionSpeed: number
  card: { show: boolean; radius: number; fill: string; scaleX: number; scaleY: number }
  shadow: { show: boolean; color: string; opacity: number; x: number; y: number; blur: number; spread: number }
  momoLogo: { x: number; y: number; scale: number; outline: number; smile: number; color: string }
  momoText: { x: number; y: number; scale: number; color: string }
  icons: { circleColor: string; titleGap: number }
  system: { scale: number }
  stepHold: { youShare: number; dataIn: number; answersOut: number; backToYou: number }
  arrowTips: { animation: TipAnimation }
  labels: { size: number }
  entrance: { preset: EntrancePreset; duration: number; distance: number; delay: number; stagger: number; play: 'once' | 'every entry' }
} & Record<`${NodeIcon}Icon`, { x: number; y: number; scale: number }>

/** Blue node illustrations with their own dials; `momo` is the runtime's `ai` node (see unwindSystem.css). */
const NODE_ICONS = ['user', 'watch', 'phone', 'momo', 'experts'] as const
type NodeIcon = (typeof NODE_ICONS)[number]
/** Offsets in diagram units, layered on the studio's baked icon size and Momo position. */
const iconDials = () => ({
  x: [0, -60, 60, 1] as Tuple,
  y: [0, -60, 60, 1] as Tuple,
  scale: [1, 0.5, 1.6, 0.01] as Tuple,
})

/** How the whole card arrives. Transform and opacity only; each frame is a "from" state that settles to the CSS value. */
const ENTRANCES = ['none', 'fade', 'rise', 'scale', 'tilt', 'cascade', 'unfold'] as const
type EntrancePreset = (typeof ENTRANCES)[number]
const EASE_OUT = 'cubic-bezier(.2,.8,.2,1)'

/** Builds paused entrance animations at their first frame; the host plays them when the card is in view. */
function entranceAnimations(card: HTMLElement, e: SequenceDials['entrance']): Animation[] {
  const d = e.distance
  const timing = (i = 0, extra: KeyframeAnimationOptions = {}): KeyframeAnimationOptions =>
    ({ duration: e.duration * 1000, delay: (e.delay + i * e.stagger) * 1000, easing: EASE_OUT, fill: 'backwards', ...extra })
  const parts = [card.querySelector<HTMLElement>('.unwind-system__brand'), card.querySelector<HTMLElement>('.unwind-system__diagram')]
    .filter((el): el is HTMLElement => !!el)
  // A lone keyframe defaults to offset 1 (an exit); offset 0 makes it the start, settling to the CSS value.
  const from = (frame: Keyframe): Keyframe[] => [{ ...frame, offset: 0 }]
  const whole = (frame: Keyframe) => [card.animate(from(frame), timing())]
  const content = () => parts.map((el, i) => el.animate(from({ opacity: 0, transform: `translateY(${d / 2}px)` }), timing(i + 1)))
  switch (e.preset) {
    case 'fade': return whole({ opacity: 0 })
    case 'rise': return whole({ opacity: 0, transform: `translateY(${d}px)` })
    case 'scale': return whole({ opacity: 0, transform: `scale(${1 - d / 1000})` })
    case 'tilt': return whole({ opacity: 0, transform: `perspective(1600px) translateY(${d}px) rotateX(${Math.min(30, d / 4)}deg)` })
    // Surface first, then the Momo lockup, then the diagram.
    case 'cascade': return [
      card.animate(from({ opacity: 0, transform: `translateY(${d}px)` }), timing(0, { pseudoElement: '::before' })),
      ...content(),
    ]
    // The surface opens from its top edge; the content fades up inside it.
    case 'unfold': return [
      card.animate([{ offset: 0, opacity: 0, transform: 'scaleY(0.4)', transformOrigin: 'top center' }, { offset: 1, transformOrigin: 'top center' }], timing(0, { pseudoElement: '::before' })),
      ...content(),
    ]
    default: return []
  }
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
  shadow: {
    show: false,
    color: { type: 'color' as const, default: '#0B3A5C' },
    opacity: [0.18, 0, 1, 0.01] as Tuple,
    x: [0, -80, 80, 1] as Tuple,
    y: [24, -80, 120, 1] as Tuple,
    blur: [64, 0, 200, 1] as Tuple,
    spread: [0, -60, 60, 1] as Tuple,
  },
  momoLogo: {
    x: [0, -200, 200, 1] as Tuple,
    y: [0, -160, 160, 1] as Tuple,
    scale: [1, 0.4, 2, 0.01] as Tuple,
    /** Stroke widths in the mark's viewBox units (MomoMark defaults). */
    outline: [4.5, 1, 10, 0.1] as Tuple,
    smile: [3.4, 1, 8, 0.1] as Tuple,
    color: { type: 'color' as const, default: '#159DD2' },
  },
  momoText: {
    x: [0, -200, 200, 1] as Tuple,
    y: [0, -160, 160, 1] as Tuple,
    scale: [1, 0.4, 2, 0.01] as Tuple,
    color: { type: 'color' as const, default: '#159DD2' },
  },
  icons: {
    circleColor: { type: 'color' as const, default: '#FFFFFF' },
    /** Px between each blue node icon and its title (studio "Title gap"). */
    titleGap: [14, 0, 48, 1] as Tuple,
  },
  system: {
    scale: [1, 0.5, 1.5, 0.01] as Tuple,
  },
  /** Seconds each step holds before the next begins (the full loop rests until the figure re-enters). */
  stepHold: {
    youShare: [3, 0.5, 15, 0.1] as Tuple,
    dataIn: [3, 0.5, 15, 0.1] as Tuple,
    answersOut: [3, 0.5, 15, 0.1] as Tuple,
    backToYou: [3, 0.5, 15, 0.1] as Tuple,
  },
  arrowTips: {
    animation: { type: 'select' as const, options: [...TIP_ANIMATIONS], default: 'fade' },
  },
  /** Arrow labels (bullet icon and text) for every arrow, as a multiple of the baked size. Rebuilds the diagram. */
  labels: {
    size: [1, 0.5, 2, 0.05] as Tuple,
  },
  /** How the card enters view. Seconds; distance in px (scale preset: 1000 px = full size). */
  entrance: {
    preset: { type: 'select' as const, options: [...ENTRANCES], default: 'rise' },
    duration: [0.9, 0.2, 3, 0.05] as Tuple,
    distance: [48, 0, 200, 1] as Tuple,
    delay: [0, 0, 1.5, 0.05] as Tuple,
    /** Cascade and unfold: seconds between the surface, the lockup and the diagram. */
    stagger: [0.15, 0, 0.8, 0.01] as Tuple,
    play: { type: 'select' as const, options: ['once', 'every entry'], default: 'once' },
    replay: { type: 'action' as const, label: 'Replay entrance' },
  },
  userIcon: iconDials(),
  watchIcon: iconDials(),
  phoneIcon: iconDials(),
  momoIcon: iconDials(),
  expertsIcon: iconDials(),
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
  const cardRef = useRef<HTMLDivElement>(null)
  const [narrow, setNarrow] = useState(() => matchMedia(NARROW).matches)
  const [entranceKey, setEntranceKey] = useState(0)
  const { values } = useTuningController('Unwind system sequence', UNWIND_SYSTEM_SEQUENCE_CONFIG, {
    onAction: (action) => { if (action === 'entrance.replay') setEntranceKey((k) => k + 1) },
  })
  const speed = values as unknown as SequenceDials
  const colors = cardColors(speed.card.show ? speed.card.fill : '#F5F5F5')
  const style = {
    '--system-card-fill': speed.card.fill,
    '--system-card-opacity': speed.card.show ? 1 : 0,
    // Card size comes from insets (not a transform), so radius and shadow stay undistorted.
    '--system-card-radius': `${speed.card.radius}px`,
    '--system-card-inset-x': `${((1 - speed.card.scaleX) * 50).toFixed(3)}%`,
    '--system-card-inset-y': `${((1 - speed.card.scaleY) * 50).toFixed(3)}%`,
    '--system-card-shadow': speed.card.show && speed.shadow.show
      ? `${speed.shadow.x}px ${speed.shadow.y}px ${speed.shadow.blur}px ${speed.shadow.spread}px color-mix(in srgb, ${speed.shadow.color} ${Math.round(speed.shadow.opacity * 100)}%, transparent)`
      : 'none',
    '--system-logo-x': `${speed.momoLogo.x}px`,
    '--system-logo-y': `${speed.momoLogo.y}px`,
    '--system-logo-scale': speed.momoLogo.scale,
    '--system-logo-color': speed.momoLogo.color,
    '--system-text-x': `${speed.momoText.x}px`,
    '--system-text-y': `${speed.momoText.y}px`,
    '--system-text-scale': speed.momoText.scale,
    '--system-text-color': speed.momoText.color,
    '--system-icon-circle': speed.icons.circleColor,
    '--system-diagram-scale': speed.system.scale,
    ...Object.fromEntries(NODE_ICONS.flatMap((n) => [
      [`--system-${n}-x`, `${speed[`${n}Icon`].x}px`],
      [`--system-${n}-y`, `${speed[`${n}Icon`].y}px`],
      [`--system-${n}-scale`, speed[`${n}Icon`].scale],
    ])),
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
  // Latest handle and gap, so the gap dial updates the live diagram without remounting it.
  const handleRef = useRef<UnwindSystemHandle | undefined>(undefined)
  const titleGapRef = useRef(speed.icons.titleGap)
  useEffect(() => {
    titleGapRef.current = speed.icons.titleGap
    handleRef.current?.setTitleGap(speed.icons.titleGap)
  }, [speed.icons.titleGap])

  // Step holds and tip preset also update live. A new tip preset replays the walkthrough so it can be seen.
  const { youShare, dataIn, answersOut, backToYou } = speed.stepHold
  const stepHoldsRef = useRef<number[]>([])
  useEffect(() => {
    stepHoldsRef.current = [youShare, dataIn, answersOut, backToYou].map((s) => s * 1000)
    handleRef.current?.setStepHolds(stepHoldsRef.current)
  }, [youShare, dataIn, answersOut, backToYou])
  const inViewRef = useRef(false)
  const tipRef = useRef(speed.arrowTips.animation)
  useEffect(() => {
    if (tipRef.current === speed.arrowTips.animation) return
    tipRef.current = speed.arrowTips.animation
    handleRef.current?.setTipAnimation(speed.arrowTips.animation)
    if (inViewRef.current) handleRef.current?.start()
  }, [speed.arrowTips.animation])

  // Card entrance: built paused on its first frame (so the card never flashes in before it plays),
  // played when the card comes into view. Changing a dial rebuilds it and replays it if in view.
  const { preset, duration, distance, delay, stagger, play } = speed.entrance
  useEffect(() => {
    const card = cardRef.current
    if (!card || preset === 'none' || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const dials = { preset, duration, distance, delay, stagger, play }
    let anims: Animation[] = []
    const arm = () => {
      anims.forEach((a) => a.cancel())
      anims = entranceAnimations(card, dials)
      anims.forEach((a) => a.pause())
    }
    arm()
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        anims.forEach((a) => a.play())
        if (play === 'once') observer.disconnect()
      } else arm()
    }, { threshold: 0.15 })
    observer.observe(card)
    return () => {
      observer.disconnect()
      anims.forEach((a) => a.cancel())
    }
  }, [preset, duration, distance, delay, stagger, play, entranceKey])

  // The layout is built once per mount, so a width change across NARROW remounts the diagram.
  useEffect(() => {
    const host = ref.current
    if (!host) return
    // Each mount gets its own box, so an earlier mount still resolving can't clear a newer one.
    const root = host.appendChild(document.createElement('div'))
    let cancelled = false
    let handle: UnwindSystemHandle | undefined
    let observer: IntersectionObserver | undefined
    mountUnwindSystem(root, {
      mode: 'sequence', narrow, sequenceSpeed: speed.sequenceSpeed, motionSpeed: speed.motionSpeed,
      titleGap: titleGapRef.current, stepHolds: stepHoldsRef.current, tipAnimation: tipRef.current, labelScale: speed.labels.size,
    }).then((mounted) => {
      if (cancelled) return mounted.destroy()
      handle = handleRef.current = mounted
      // Entering restarts from step 01; the run then rests on the full loop until the next re-entry.
      observer = new IntersectionObserver(([entry]) => {
        inViewRef.current = entry.isIntersecting
        if (entry.isIntersecting) mounted.start()
        else mounted.pause()
      }, { threshold: 0.35 })
      observer.observe(root)
    })
    return () => {
      cancelled = true
      observer?.disconnect()
      handle?.destroy()
      if (handleRef.current === handle) handleRef.current = undefined
      root.remove()
    }
  }, [narrow, speed.sequenceSpeed, speed.motionSpeed, speed.labels.size])

  return (
    <div ref={cardRef} className="case__figure unwind-system" style={style}>
      <div className="unwind-system__brand" aria-label="Momo">
        <MomoMark className="unwind-system__mark" color="var(--system-logo-color)" outline={speed.momoLogo.outline} smile={speed.momoLogo.smile} />
        <span className="unwind-system__type" aria-hidden="true" />
      </div>
      <div ref={ref} className="unwind-system__diagram" />
    </div>
  )
}
