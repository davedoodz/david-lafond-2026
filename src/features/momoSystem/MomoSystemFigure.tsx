import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { MomoMark } from '../momoIntro/MomoMark'
import { mountMomoSystem, TIP_ANIMATIONS, type TipAnimation, type MomoSystemHandle } from './mountMomoSystem'
import { cardSurface, GRADIENT_PALETTES, MATERIAL_FINISHES, materialSurface, PHOTO_FINISHES, publishSystemBase, type GradientDials, type MaterialFinish } from './systemSurface'
import { useTuningController } from '../../tuning/useTuning'
import { MomoSeal, SEAL_STYLES, type SealStyle } from './MomoSeal'
import { usePushTilt } from '../pushBubbles/usePushTilt'

type Tuple = [number, number, number, number]
type SequenceDials = {
  sequenceSpeed: number
  motionSpeed: number
  card: { show: boolean; finish: 'surface' | MaterialFinish; tone: string; radius: number; fill: string; scaleX: number; scaleY: number }
  pushTilt: { enabled: boolean; tilt: number; press: number; stiffness: number; damping: number; perspective: number }
  gradient: GradientDials
  glass: { show: boolean; tint: number; blur: number; saturate: number; edge: number; sheen: number; sheenAngle: number; glow: number }
  shadow: { show: boolean; color: string; opacity: number; x: number; y: number; blur: number; spread: number }
  momoLogo: { x: number; y: number; scale: number; outline: number; smile: number; color: string }
  momoText: { x: number; y: number; scale: number; color: string }
  lockupGlass: { x: number; y: number; scale: number }
  icons: { circleColor: string; circleStyle: 'glass' | 'flat' | 'embossed' | 'debossed' | 'ring' | 'pearl' | 'ring-art' | 'none'; glassTint: number; titleGap: number }
  system: { scale: number }
  stepHold: { youShare: number; dataIn: number; answersOut: number; backToYou: number }
  arrowTips: { animation: TipAnimation }
  labels: { size: number }
  text: { titles: string; labels: string; icons: string; arrows: string }
  seal: { style: SealStyle; scale: number; x: number; y: number }
  entrance: { preset: EntrancePreset; duration: number; distance: number; delay: number; stagger: number }
} & Record<`${NodeIcon}Icon`, { x: number; y: number; scale: number; saturation: number; brightness: number; contrast: number }>

/** Blue node illustrations with their own dials; `momo` is the runtime's `ai` node (see momoSystem.css). */
const NODE_ICONS = ['user', 'watch', 'phone', 'momo', 'experts'] as const
type NodeIcon = (typeof NODE_ICONS)[number]
/** Offsets in diagram units, layered on the studio's baked icon size and Momo position. */
const iconDials = () => ({
  x: [0, -60, 60, 1] as Tuple,
  y: [0, -60, 60, 1] as Tuple,
  scale: [1, 0.5, 1.6, 0.01] as Tuple,
  /** Colour of the blue illustration: 1 is the artwork as drawn. */
  saturation: [1, 0, 2.5, 0.01] as Tuple,
  brightness: [1, 0.4, 1.8, 0.01] as Tuple,
  contrast: [1, 0.4, 2, 0.01] as Tuple,
})

/** How the whole card arrives. Transform and opacity only; each frame is a "from" state that settles to the CSS value. */
const ENTRANCES = ['none', 'fade', 'rise', 'scale', 'tilt', 'cascade', 'unfold'] as const
type EntrancePreset = (typeof ENTRANCES)[number]
const EASE_OUT = 'cubic-bezier(.2,.8,.2,1)'

/** The visible card inside `.momo-system`, which is inset by the card scale dials. */
function visibleCardRect(el: HTMLElement): DOMRect {
  const r = el.getBoundingClientRect()
  const cs = getComputedStyle(el)
  const ix = (r.width * (parseFloat(cs.getPropertyValue('--system-card-inset-x')) || 0)) / 100
  const iy = (r.height * (parseFloat(cs.getPropertyValue('--system-card-inset-y')) || 0)) / 100
  return new DOMRect(r.left + ix, r.top + iy, r.width - 2 * ix, r.height - 2 * iy)
}

/**
 * Card insets (% of the figure, like the scale dials) that give the visible card the artwork's `aspect`:
 * the card keeps the height from `scaleY` and takes the matching width, or, if that is wider than the
 * figure, the full width and the matching height. Null when no artwork shapes the card.
 */
function usePhotoShape(ref: RefObject<HTMLElement | null>, aspect: number | null, scaleY: number) {
  const [inset, setInset] = useState<{ x: number; y: number } | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !aspect) return setInset(null)
    const measure = () => {
      const w = el.offsetWidth, h = el.offsetHeight
      if (!w || !h) return
      const width = Math.min(w, h * scaleY * aspect)
      const height = width / aspect
      setInset({ x: (1 - width / w) * 50, y: (1 - height / h) * 50 })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, aspect, scaleY])
  return aspect ? inset : null
}

/** Builds paused entrance animations at their first frame; the host plays them when the card is in view. */
function entranceAnimations(card: HTMLElement, e: SequenceDials['entrance']): Animation[] {
  const d = e.distance
  const timing = (i = 0, extra: KeyframeAnimationOptions = {}): KeyframeAnimationOptions =>
    ({ duration: e.duration * 1000, delay: (e.delay + i * e.stagger) * 1000, easing: EASE_OUT, fill: 'backwards', ...extra })
  // The Momo lockup is printed on the card: it moves with the surface, frame for frame. The seal is not:
  // it stamps down once the walkthrough is done (momoSystem.css, [data-done='true']).
  const fixtures = ['.momo-system__brand', '.momo-system__lockup-glass'].map((s) => card.querySelector<HTMLElement>(s))
    .filter((el): el is HTMLElement => !!el)
  const diagram = card.querySelector<HTMLElement>('.momo-system__diagram')
  // A lone keyframe defaults to offset 1 (an exit); offset 0 makes it the start, settling to the CSS value.
  const from = (frame: Keyframe): Keyframe[] => [{ ...frame, offset: 0 }]
  const whole = (frame: Keyframe) => [card.animate(from(frame), timing())]
  const content = () => (diagram ? [diagram.animate(from({ opacity: 0, transform: `translateY(${d / 2}px)` }), timing(1))] : [])
  // The surface's own frames, replayed on each fixture. `origin` is the surface's transform origin,
  // given as a y in card px, re-expressed in the fixture's own box so a scale pivots on the same line.
  const withSurface = (frames: Keyframe[], originY?: number) => fixtures.map((el) => el.animate(
    originY == null ? frames : frames.map((f) => ({ ...f, transformOrigin: `center ${originY - el.offsetTop}px` })),
    timing(0),
  ))
  const surfaceTop = () => card.offsetHeight * (parseFloat(getComputedStyle(card).getPropertyValue('--system-card-inset-y')) || 0) / 100
  switch (e.preset) {
    case 'fade': return whole({ opacity: 0 })
    case 'rise': return whole({ opacity: 0, transform: `translateY(${d}px)` })
    case 'scale': return whole({ opacity: 0, transform: `scale(${1 - d / 1000})` })
    case 'tilt': return whole({ opacity: 0, transform: `perspective(1600px) translateY(${d}px) rotateX(${Math.min(30, d / 4)}deg)` })
    // Surface (with its lockup) first, then the diagram.
    case 'cascade': {
      const rise = from({ opacity: 0, transform: `translateY(${d}px)` })
      return [
        card.animate(rise, timing(0, { pseudoElement: '::before' })),
        card.animate(from({ opacity: 0 }), timing(0, { pseudoElement: '::after' })),
        ...withSurface(rise),
        ...content(),
      ]
    }
    // The surface opens from its top edge, carrying its lockup; the diagram fades up inside it.
    case 'unfold': {
      const open: Keyframe[] = [{ offset: 0, opacity: 0, transform: 'scaleY(0.4)' }, { offset: 1 }]
      return [
        card.animate(open.map((f) => ({ ...f, transformOrigin: 'top center' })), timing(0, { pseudoElement: '::before' })),
        card.animate(from({ opacity: 0 }), timing(0, { pseudoElement: '::after' })),
        ...withSurface(open, surfaceTop()),
        ...content(),
      ]
    }
    default: return []
  }
}

export const MOMO_SYSTEM_SEQUENCE_CONFIG = {
  /** Changes the hold between story beats. */
  sequenceSpeed: [1, 0.25, 3, 0.05] as Tuple,
  /** Changes line draws, text reveals and icon motion without changing their relative timing. */
  motionSpeed: [1, 0.25, 3, 0.05] as Tuple,
  card: {
    show: true,
    /** surface: the fill + gradient + glass dials below (shared with the story cards). paper / satin /
     *  pewter / metal: a material in `tone`, matched to the seal artwork, on this card only (systemSurface.ts). */
    finish: { type: 'select' as const, options: ['surface', ...MATERIAL_FINISHES], default: 'paper' },
    tone: { type: 'color' as const, default: '#E3E4E6' },
    radius: [48, 0, 160, 1] as Tuple,
    fill: { type: 'color' as const, default: '#53BFFE' },
    scaleX: [1, 0.5, 1.5, 0.01] as Tuple,
    scaleY: [1, 0.5, 1.5, 0.01] as Tuple,
  },
  /** The whole card tilts under the cursor as if pressed at that point, then springs back flat. */
  pushTilt: {
    enabled: true,
    tilt: [2.5, 0, 10, 0.1] as Tuple,
    press: [0.99, 0.94, 1, 0.001] as Tuple,
    stiffness: [120, 20, 400, 1] as Tuple,
    damping: [18, 2, 60, 1] as Tuple,
    perspective: [1600, 400, 4000, 10] as Tuple,
  },
  /** Mesh gradient over the fill. Palette presets set the four colours; pick `custom` to use the colour dials. */
  gradient: {
    show: true,
    opacity: [1, 0, 1, 0.01] as Tuple,
    palette: { type: 'select' as const, options: [...Object.keys(GRADIENT_PALETTES), 'custom'], default: 'prism' },
    deep: { type: 'color' as const, default: GRADIENT_PALETTES.prism.deep },
    mid: { type: 'color' as const, default: GRADIENT_PALETTES.prism.mid },
    glow: { type: 'color' as const, default: GRADIENT_PALETTES.prism.glow },
    light: { type: 'color' as const, default: GRADIENT_PALETTES.prism.light },
    /** Size of the colour blooms (1 = reference). */
    spread: [1, 0.4, 2, 0.01] as Tuple,
    /** Moves the blooms, % of the card. */
    x: [0, -50, 100, 1] as Tuple,
    y: [0, -50, 50, 1] as Tuple,
  },
  /** Frosted glass: see-through fill and gradient, blurred backdrop, white edge and sheen. Glow adds colour behind it. */
  glass: {
    show: false,
    /** How solid the fill and gradient stay (1 = opaque, lower = clearer glass). */
    tint: [0.55, 0.05, 1, 0.01] as Tuple,
    blur: [28, 0, 80, 1] as Tuple,
    saturate: [1.6, 1, 3, 0.05] as Tuple,
    /** White rim light (opacity). */
    edge: [0.6, 0, 1, 0.01] as Tuple,
    sheen: [0.35, 0, 1, 0.01] as Tuple,
    sheenAngle: [135, 0, 360, 1] as Tuple,
    glow: [0.7, 0, 1, 0.01] as Tuple,
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
  /** x/y are px on the full-size (1040px) card; the lockup scales with the card below that. */
  momoLogo: {
    x: [0, -400, 400, 1] as Tuple,
    y: [0, -160, 160, 1] as Tuple,
    scale: [1, 0.4, 2, 0.01] as Tuple,
    /** Stroke widths in the mark's viewBox units (MomoMark defaults). */
    outline: [4.5, 1, 10, 0.1] as Tuple,
    smile: [3.4, 1, 8, 0.1] as Tuple,
    color: { type: 'color' as const, default: '#159DD2' },
  },
  momoText: {
    x: [0, -400, 400, 1] as Tuple,
    y: [0, -160, 160, 1] as Tuple,
    scale: [1, 0.4, 2, 0.01] as Tuple,
    color: { type: 'color' as const, default: '#159DD2' },
  },
  /** glass-marks only: position/scale for the single pre-composed lockup image, independent of the
   *  SVG mark + wordmark's own momoLogo/momoText dials (that pair's tuning doesn't fit one image). */
  lockupGlass: {
    x: [0, -400, 400, 1] as Tuple,
    y: [0, -160, 160, 1] as Tuple,
    scale: [1, 0.4, 2, 0.01] as Tuple,
  },
  icons: {
    circleColor: { type: 'color' as const, default: '#FFFFFF' },
    /** Glass: a frosted white disc tinted by circleColor, with a white rim and soft shadow. Flat: the old tinted circle.
     *  Embossed / debossed / ring / pearl: discs in the card's own tone (raised, pressed in, a pressed line, matte).
     *  Ring art: the moulded ring artwork (public/work/momo/seal/ring.webp). None: no circle behind the icons. */
    circleStyle: { type: 'select' as const, options: ['glass', 'flat', 'embossed', 'debossed', 'ring', 'pearl', 'ring-art', 'none'], default: 'glass' },
    /** Glass only: how much circleColor tints the disc's lower corner. */
    glassTint: [0.18, 0, 0.6, 0.01] as Tuple,
    /** Px between each blue node icon and its title (studio "Title gap"). */
    titleGap: [14, 0, 48, 1] as Tuple,
  },
  /** Diagram colours: node titles (WATCH, USER…), arrow label text, label icons once lit, and the arrows. */
  text: {
    titles: { type: 'color' as const, default: '#3E4A63' },
    labels: { type: 'color' as const, default: '#3E4A63' },
    icons: { type: 'color' as const, default: '#5B8DEF' },
    arrows: { type: 'color' as const, default: '#5B8DEF' },
  },
  /** Pressed "Clinically informed · Wellness" seal in the card's bottom-right corner: scalloped or round
   *  artwork. x/y are px on the full-size card (+x right, +y down) from its default spot; scale 1 is 190px across. */
  seal: {
    style: { type: 'select' as const, options: [...SEAL_STYLES], default: 'scalloped' },
    scale: [1, 0.4, 2, 0.01] as Tuple,
    x: [0, -400, 200, 1] as Tuple,
    y: [0, -400, 200, 1] as Tuple,
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
    replay: { type: 'action' as const, label: 'Replay entrance' },
  },
  userIcon: iconDials(),
  watchIcon: iconDials(),
  phoneIcon: iconDials(),
  momoIcon: iconDials(),
  expertsIcon: iconDials(),
}

/** Below this width the diagram switches to the compact phone layout. */
const NARROW = '(max-width: 768px)'

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
export function MomoSystemFigure() {
  const ref = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [narrow, setNarrow] = useState(() => matchMedia(NARROW).matches)
  const [entranceKey, setEntranceKey] = useState(0)
  const { values } = useTuningController('Momo system sequence', MOMO_SYSTEM_SEQUENCE_CONFIG, {
    onAction: (action) => { if (action === 'entrance.replay') setEntranceKey((k) => k + 1) },
  })
  const speed = values as unknown as SequenceDials
  const material = speed.card.show && speed.card.finish !== 'surface' ? speed.card.finish : null
  const photo = material ? PHOTO_FINISHES[material] ?? null : null
  // Phone layout: the diagram is taller than wide, so a photo can't set the card's shape; it crops instead.
  const photoShaped = !!photo && !narrow
  // Cropped: the card's own scale dials are tuned for the shaped desktop card and don't describe a
  // crop, so narrow instead takes the full figure — the card's own lockup and seal (not baked into
  // the crop) are drawn to that same full box and never sit outside it.
  const cropped = !!photo && narrow
  const photoInset = usePhotoShape(cardRef, photoShaped ? photo.aspect : null, speed.card.scaleY)
  const glass = speed.card.show && speed.glass.show && !material ? speed.glass : null
  const colors = cardColors(speed.card.show ? (material ? speed.card.tone : speed.card.fill) : '#F5F5F5')
  const surface = material ? materialSurface(material, speed.card.tone, cropped) : cardSurface(speed.card.fill, speed.gradient, glass)
  // The story art cards take this fill + gradient and apply their own glass (see systemSurface.ts).
  useEffect(() => publishSystemBase({ fill: speed.card.fill, gradient: speed.gradient }))
  usePushTilt(cardRef, visibleCardRect, speed.pushTilt)
  const style = {
    '--system-card-fill': surface.fill,
    '--system-card-gradient': surface.gradient,
    '--system-card-backdrop': surface.backdrop,
    '--system-card-edge': surface.edge,
    '--system-card-glow': surface.glow,
    '--system-card-opacity': speed.card.show ? 1 : 0,
    // Card size comes from insets (not a transform), so radius and shadow stay undistorted.
    '--system-card-radius': `${speed.card.radius}px`,
    // A shaped photo finish overrides the card scale dials with the artwork's own proportions. On
    // phones (narrow) the card fills its column: the scale dials are a desktop composition choice.
    '--system-card-inset-x': photoInset ? `${photoInset.x.toFixed(3)}%` : cropped || narrow ? '0%' : `${((1 - speed.card.scaleX) * 50).toFixed(3)}%`,
    '--system-card-inset-y': photoInset ? `${photoInset.y.toFixed(3)}%` : cropped || narrow ? '0%' : `${((1 - speed.card.scaleY) * 50).toFixed(3)}%`,
    '--system-card-shadow': speed.card.show && speed.shadow.show
      ? `${speed.shadow.x}px ${speed.shadow.y}px ${speed.shadow.blur}px ${speed.shadow.spread}px color-mix(in srgb, ${speed.shadow.color} ${Math.round(speed.shadow.opacity * 100)}%, transparent)`
      : '0 0 #0000',
    '--system-logo-x': speed.momoLogo.x,
    '--system-logo-y': speed.momoLogo.y,
    '--system-logo-scale': speed.momoLogo.scale,
    '--system-logo-color': speed.momoLogo.color,
    '--system-text-x': speed.momoText.x,
    '--system-text-y': speed.momoText.y,
    '--system-text-scale': speed.momoText.scale,
    '--system-text-color': speed.momoText.color,
    '--system-lockup-x': speed.lockupGlass.x,
    '--system-lockup-y': speed.lockupGlass.y,
    '--system-lockup-scale': speed.lockupGlass.scale,
    '--system-seal-scale': speed.seal.scale,
    '--system-seal-x': speed.seal.x,
    '--system-seal-y': speed.seal.y,
    '--system-icon-circle': speed.icons.circleColor,
    '--system-title-color': speed.text.titles,
    '--system-label-color': speed.text.labels,
    '--system-label-icon': speed.text.icons,
    '--system-arrow-color': speed.text.arrows,
    '--system-glass-tint': `${Math.round(speed.icons.glassTint * 100)}%`,
    '--system-diagram-scale': speed.system.scale,
    ...Object.fromEntries(NODE_ICONS.flatMap((n) => [
      [`--system-${n}-x`, `${speed[`${n}Icon`].x}px`],
      [`--system-${n}-y`, `${speed[`${n}Icon`].y}px`],
      [`--system-${n}-scale`, speed[`${n}Icon`].scale],
      [`--system-${n}-filter`, `saturate(${speed[`${n}Icon`].saturation}) brightness(${speed[`${n}Icon`].brightness}) contrast(${speed[`${n}Icon`].contrast})`],
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
  const handleRef = useRef<MomoSystemHandle | undefined>(undefined)
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
  // The replay button shows only once the walkthrough has fully finished ('momosystem:done' from the
  // diagram); every start or rewind hides it again until the next finish.
  const [done, setDone] = useState(false)
  useEffect(() => {
    const card = cardRef.current
    if (!card) return
    const onDone = () => setDone(true)
    card.addEventListener('momosystem:done', onDone)
    return () => card.removeEventListener('momosystem:done', onDone)
  }, [])
  useEffect(() => {
    if (tipRef.current === speed.arrowTips.animation) return
    tipRef.current = speed.arrowTips.animation
    handleRef.current?.setTipAnimation(speed.arrowTips.animation)
    if (inViewRef.current) {
      setDone(false)
      handleRef.current?.start()
    }
  }, [speed.arrowTips.animation])

  // Card entrance: built paused on its first frame (so the card never flashes in before it plays),
  // played once 15% of the card is in view, and re-armed only once the card has fully left the
  // viewport, so every scroll back replays it. Changing a dial rebuilds it and replays it if in view.
  const { preset, duration, distance, delay, stagger } = speed.entrance
  useEffect(() => {
    const card = cardRef.current
    if (!card || preset === 'none' || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const dials = { preset, duration, distance, delay, stagger }
    let anims: Animation[] = []
    const arm = () => {
      anims.forEach((a) => a.cancel())
      anims = entranceAnimations(card, dials)
      anims.forEach((a) => a.pause())
    }
    arm()
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.15) anims.forEach((a) => { if (a.playState === 'paused') a.play() })
      else if (!entry.isIntersecting) arm()
    }, { threshold: [0, 0.15] })
    observer.observe(card)
    return () => {
      observer.disconnect()
      anims.forEach((a) => a.cancel())
    }
  }, [preset, duration, distance, delay, stagger, entranceKey])

  // The layout is built once per mount, so a width change across NARROW remounts the diagram.
  useEffect(() => {
    const host = ref.current
    if (!host) return
    // Each mount gets its own box, so an earlier mount still resolving can't clear a newer one.
    const root = host.appendChild(document.createElement('div'))
    let cancelled = false
    let handle: MomoSystemHandle | undefined
    let observer: IntersectionObserver | undefined
    mountMomoSystem(root, {
      mode: 'sequence', narrow, sequenceSpeed: speed.sequenceSpeed, motionSpeed: speed.motionSpeed,
      titleGap: titleGapRef.current, stepHolds: stepHoldsRef.current, tipAnimation: tipRef.current, labelScale: speed.labels.size,
    }).then((mounted) => {
      if (cancelled) return mounted.destroy()
      handle = handleRef.current = mounted
      inViewRef.current = false
      setDone(false)
      // Entering restarts from step 01; the run then rests on the full loop. Once fully off screen it is
      // rewound to step 01's first frame, so scrolling back shows the start, never the old end state.
      observer = new IntersectionObserver(([entry]) => {
        if (entry.intersectionRatio >= 0.35 && !inViewRef.current) {
          inViewRef.current = true
          setDone(false)
          mounted.start()
        } else if (!entry.isIntersecting) {
          inViewRef.current = false
          setDone(false)
          mounted.rewind()
        }
      }, { threshold: [0, 0.35] })
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
    <div ref={cardRef} className="case__figure momo-system" style={style} data-done={done} data-circles={speed.icons.circleStyle}>
      {/* Photo finishes already carry the seal (and, for logo photos, the lockup); the lockup keeps its space
          so the diagram doesn't shift. A cropped photo (phone layout) loses its lockup, so the card shows its
          own; it also drops the baked seal (an extreme crop ratio would blow it up), showing its own seal too.
          glass-marks: the brand slot stays as an empty spacer and the glass lockup image is pinned to the
          card's top-left corner like the seal is to the bottom-right. */}
      <div className="momo-system__brand" aria-label={material === 'glass-marks' ? undefined : 'Momo'} style={photo?.logo && photoShaped ? { visibility: 'hidden' } : undefined}>
        {material !== 'glass-marks' && (
          <>
            <MomoMark className="momo-system__mark" color="var(--system-logo-color)" outline={speed.momoLogo.outline} smile={speed.momoLogo.smile} />
            <span className="momo-system__type" aria-hidden="true" />
          </>
        )}
      </div>
      {material === 'glass-marks' && (
        <img className="momo-system__lockup-glass" src="/work/momo/seal/lockup-glass.webp" width={1200} height={298} alt="Momo" loading="eager" decoding="sync" />
      )}
      <div ref={ref} className="momo-system__diagram" />
      {(!photo || cropped) && <MomoSeal style={speed.seal.style} />}
    </div>
  )
}
