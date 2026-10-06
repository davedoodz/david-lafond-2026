import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { ShaderFitOptions, ShaderMount, getShaderColorFromString, meshGradientFragmentShader } from '@paper-design/shaders'
import { Momo, type MomoMode } from '../../components/MomoCard'
import { releaseShader } from '../../lib/releaseShader'
import { useTuningController } from '../../tuning/useTuning'
import { toCssTiming } from '../pageTransition/cssTiming'
import { MomoMark } from './MomoMark'
import './momoWelcome.css'

type Tuple = [number, number, number, number]

const CONFIG = {
  blackOverlay: [0.34, 0, 0.85, 0.01] as Tuple,
  prototypeWidth: [380, 180, 600, 5] as Tuple,
  /** Button look. flat: the original fills · glass: clear Liquid Glass · tinted: blue glass primary · frosted: heavier frost · prominent: white primary. */
  buttons: {
    style: { type: 'select' as const, options: ['flat', 'glass', 'tinted', 'frosted', 'prominent'], default: 'flat' },
    /** White stroke inside the Get started button. */
    primaryStroke: false,
    strokeWidth: [1.5, 0.25, 6, 0.25] as Tuple,
    _collapsed: false,
  },
  /** After the intro hands off, the phone rises into place; the welcome loop starts once it lands. */
  rise: {
    distance: [160, 0, 600, 5] as Tuple,
    delay: [0.15, 0, 2, 0.05] as Tuple,
    spring: { type: 'spring' as const, visualDuration: 0.8, bounce: 0.22 },
    fade: [0.35, 0, 1.5, 0.05] as Tuple,
    replay: { type: 'action' as const, label: 'Replay rise' },
    _collapsed: false,
  },
  /** Seconds on one looping clock. Each element fades up at its start time, holds, then fades out together. */
  timing: {
    /** Scales the full authored 12-second sequence while preserving every relative cue. */
    fullLoopDuration: [12, 4, 30, 0.5] as Tuple,
    shadeAt: [0.6, 0, 6, 0.1] as Tuple,
    shadeIn: [1.2, 0, 4, 0.1] as Tuple,
    shadeOut: [0.96, 0, 4, 0.05] as Tuple,
    momoAt: [2, 0, 10, 0.05] as Tuple,
    logoAt: [3.1, 0, 10, 0.05] as Tuple,
    buttonsAt: [4, 0, 10, 0.05] as Tuple,
    legalAt: [4.7, 0, 10, 0.05] as Tuple,
    fadeIn: [1.1, 0.1, 4, 0.05] as Tuple,
    lift: [10, 0, 60, 1] as Tuple,
    holdUntil: [9.84, 2, 30, 0.05] as Tuple,
    fadeOut: [1.2, 0.1, 4, 0.05] as Tuple,
    restart: { type: 'action' as const, label: 'Restart loop' },
    _collapsed: false,
  },
  momo: {
    size: [120, 50, 180, 1] as Tuple,
    x: [0, -30, 30, 1] as Tuple,
    y: [0, -30, 30, 1] as Tuple,
    mode: { type: 'select' as const, options: ['asleep', 'awake', 'both'], default: 'asleep' },
    _collapsed: false,
  },
  /** Brand lockup. Sizes are % of screen width; x/y offsets are % of screen width from the default spot. */
  logo: {
    size: [19.8, 5, 50, 0.1] as Tuple,
    x: [0, -50, 50, 0.1] as Tuple,
    y: [0, -80, 80, 0.1] as Tuple,
    /** Stroke widths in logo units; they scale with size. */
    outlineStroke: [4.5, 0.5, 12, 0.1] as Tuple,
    smileStroke: [3.4, 0.5, 8, 0.1] as Tuple,
    _collapsed: false,
  },
  wordmark: {
    size: [37.8, 10, 80, 0.1] as Tuple,
    x: [0, -50, 50, 0.1] as Tuple,
    y: [0, -80, 80, 0.1] as Tuple,
    _collapsed: false,
  },
}

// Paper file 01M2EBW39E793RGX29545TP971, shader 3K9-0; same package/version as the card shader.
const UNIFORMS = {
  u_colors: ['#E9EEF8', '#CBEFFE', '#53BFFE', '#00D0FF'].map(getShaderColorFromString),
  u_colorsCount: 4, u_distortion: 0.8, u_swirl: 0.1, u_grainMixer: 0, u_grainOverlay: 0,
  u_fit: ShaderFitOptions.contain, u_scale: 1, u_rotation: 0, u_offsetX: 0, u_offsetY: 0,
  u_originX: 0.5, u_originY: 0.5, u_worldWidth: 0, u_worldHeight: 0,
}

const ENTER_EASE = 'cubic-bezier(.22, 1, .36, 1)'

/** Hidden → shown → hidden on a loop of `loop` seconds; times clamp to the loop and never run backwards. */
function loopFrames(loop: number, inAt: number, inDur: number, outAt: number, outDur: number, hidden: Keyframe, shown: Keyframe, easing: string): Keyframe[] {
  let prev = 0
  const at = (s: number) => (prev = Math.min(1, Math.max(prev, s / loop)))
  return [
    { ...hidden, offset: 0 },
    { ...hidden, offset: at(inAt), easing },
    { ...shown, offset: at(inAt + inDur) },
    { ...shown, offset: at(outAt), easing },
    { ...hidden, offset: at(outAt + outDur) },
    { ...hidden, offset: 1 },
  ]
}

type Phase = 'waiting' | 'rising' | 'landed'

/** Non-interactive welcome loop; rises into place after the intro, holds the complete UI, then fades to shader only. */
export function MomoWelcome({ active = true }: { active?: boolean }) {
  const host = useRef<HTMLDivElement>(null)
  const phone = useRef<HTMLDivElement>(null)
  const shader = useRef<HTMLDivElement>(null)
  const shade = useRef<HTMLDivElement>(null)
  const mascot = useRef<HTMLDivElement>(null)
  const brand = useRef<HTMLDivElement>(null)
  const actions = useRef<HTMLDivElement>(null)
  const legal = useRef<HTMLParagraphElement>(null)
  const mountRef = useRef<ShaderMount | null>(null)
  const loopRef = useRef<Animation[]>([])
  const [visible, setVisible] = useState(false)
  const [phase, setPhaseState] = useState<Phase>('waiting')
  const phaseRef = useRef<Phase>('waiting')
  const setPhase = (p: Phase) => { phaseRef.current = p; setPhaseState(p) }
  const [riseKey, setRiseKey] = useState(0)
  const [loopKey, setLoopKey] = useState(0)
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const { values: t } = useTuningController('Momo welcome', CONFIG, {
    onAction: (action) => {
      if (action === 'rise.replay') { setPhase('waiting'); setRiseKey(k => k + 1) }
      if (action === 'timing.restart') setLoopKey(k => k + 1)
    },
  })

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setReduced(media.matches)
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0 })
    observer.observe(host.current!)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const mount = new ShaderMount(shader.current!, meshGradientFragmentShader, UNIFORMS, undefined, 0, 3861815.999999438, 1)
    mountRef.current = mount
    return () => { releaseShader(mount); mountRef.current = null }
  }, [])

  useEffect(() => {
    const update = () => mountRef.current?.setSpeed(visible && !document.hidden && !reduced ? 1 : 0)
    update()
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [visible, reduced])

  // Rise: starts once the intro is done and the phone is on screen; the loop begins when it lands.
  // Replaying the intro (active → false) hides the phone again so it rises once more at the handoff.
  const { distance, delay, fade } = t.rise
  const springKey = JSON.stringify(t.rise.spring)
  useLayoutEffect(() => {
    if (!active) { setPhase('waiting'); return }
    if (reduced) { setPhase('landed'); return }
    if (phaseRef.current === 'landed' || !visible) return
    const el = phone.current!
    const motion = toCssTiming(JSON.parse(springKey))
    const anims = [
      el.animate([{ transform: `translate3d(0, ${distance}px, 0)` }, { transform: 'translate3d(0, 0, 0)' }], { duration: parseFloat(motion.duration) * 1000, delay: delay * 1000, easing: motion.easing, fill: 'backwards' }),
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: Math.max(1, fade * 1000), delay: delay * 1000, easing: 'ease-out', fill: 'backwards' }),
    ]
    setPhase('rising')
    let cancelled = false
    void Promise.all(anims.map(a => a.finished)).then(() => { if (!cancelled) setPhase('landed') }, () => {})
    return () => {
      cancelled = true
      anims.forEach(a => a.cancel())
      if (phaseRef.current === 'rising') setPhase('waiting')
    }
  }, [active, visible, reduced, riseKey, distance, delay, fade, springKey])

  // Welcome loop on one shared clock, rebuilt whenever a timing dial moves.
  const T = t.timing
  useEffect(() => {
    if (phase !== 'landed' || reduced) return
    const timeScale = T.fullLoopDuration / 12
    const loop = T.fullLoopDuration * 1000
    const s = (authoredSeconds: number) => authoredSeconds * timeScale * 1000
    const hidden = { opacity: 0, transform: `translateY(${T.lift}px)` }
    const shown = { opacity: 1, transform: 'none' }
    const element = (el: HTMLElement, at: number) =>
      el.animate(loopFrames(loop, s(at), s(T.fadeIn), s(T.holdUntil), s(T.fadeOut), hidden, shown, ENTER_EASE), { duration: loop, iterations: Infinity })
    const anims = [
      shade.current!.animate(loopFrames(loop, s(T.shadeAt), s(T.shadeIn), loop - s(T.shadeOut), s(T.shadeOut), { opacity: 0 }, { opacity: t.blackOverlay }, 'ease-in-out'), { duration: loop, iterations: Infinity }),
      element(mascot.current!, T.momoAt),
      element(brand.current!, T.logoAt),
      // Each button fades itself: an animating parent's opacity would cut the glass blur off from the shader behind it.
      ...Array.from(actions.current!.children as HTMLCollectionOf<HTMLElement>, el => element(el, T.buttonsAt)),
      element(legal.current!, T.legalAt),
    ]
    const start = document.timeline.currentTime
    for (const a of anims) a.startTime = start
    loopRef.current = anims
    return () => { anims.forEach(a => a.cancel()); loopRef.current = [] }
  }, [phase, reduced, loopKey, t.blackOverlay, T.fullLoopDuration, T.shadeAt, T.shadeIn, T.shadeOut, T.momoAt, T.logoAt, T.buttonsAt, T.legalAt, T.fadeIn, T.lift, T.holdUntil, T.fadeOut])

  // Off screen: hold the loop where it is.
  useEffect(() => {
    for (const a of loopRef.current) visible ? a.play() : a.pause()
  }, [visible, phase])

  const style = {
    '--welcome-width': `${t.prototypeWidth}px`,
    '--welcome-overlay': t.blackOverlay,
    '--welcome-mark-size': `${t.logo.size}cqw`,
    '--welcome-mark-x': `${t.logo.x}cqw`,
    '--welcome-mark-y': `${t.logo.y}cqw`,
    '--welcome-type-size': `${t.wordmark.size}cqw`,
    '--welcome-type-x': `${t.wordmark.x}cqw`,
    '--welcome-type-y': `${t.wordmark.y}cqw`,
    '--welcome-stroke': t.buttons.primaryStroke ? `${t.buttons.strokeWidth}px` : '0px',
  } as CSSProperties

  return <div className="momo-welcome" ref={host} role="img" aria-label="Animated Momo welcome screen" style={style}>
    <div className="momo-welcome__phone" ref={phone} data-phase={phase} data-reduced={reduced || undefined}>
      <div className="momo-welcome__screen">
        <div className="momo-welcome__shader" ref={shader} aria-hidden="true" />
        <div className="momo-welcome__shade" ref={shade} aria-hidden="true" />
        <div className="momo-welcome__content" aria-hidden="true">
          <div className="momo-welcome__mascot momo-welcome__enter" ref={mascot}>
            {reduced ? <img src="/work/unwind/intro/momo-open.webp" alt="" /> : <Momo mode={t.momo.mode as MomoMode} size={`${t.momo.size}%`} x={`${t.momo.x}%`} y={`${t.momo.y}%`} />}
          </div>
          <div className="momo-welcome__brand momo-welcome__enter" ref={brand}>
            <MomoMark className="momo-welcome__mark" outline={t.logo.outlineStroke} smile={t.logo.smileStroke} />
            <img className="momo-welcome__type" src="/work/unwind/hero/momo-type.png" alt="" />
          </div>
          <div className="momo-welcome__actions" ref={actions} data-style={t.buttons.style}>
            <div className="momo-welcome__primary momo-welcome__enter">Get started</div>
            <div className="momo-welcome__secondary momo-welcome__enter">I already have an account</div>
          </div>
          <p className="momo-welcome__legal momo-welcome__enter" ref={legal}>
            By continuing, you agree to Momo’s<br /><u>Terms of Service</u> and <u>Privacy Policy</u>
          </p>
        </div>
      </div>
      <img className="momo-welcome__frame" src="/work/unwind/hero/phone-frame.png" width={1312} height={2672} alt="" draggable={false} />
    </div>
  </div>
}
