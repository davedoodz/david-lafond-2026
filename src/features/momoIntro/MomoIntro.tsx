import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTuningController } from '../../tuning/useTuning'
import { drawBraid, setRT } from './braid'
import { drawPhoneFilm, loadPhoneFilm, PHONE_TIMELINE, setAppLaunch, setMomoAsleep, setPauseIcon, setPillText, setStatusGaps } from './phoneFilm'
import { BEAM_SCREEN, MomoVoiceBeam } from './MomoVoiceBeam'
import { stackedAlpha } from '../../lib/stackedAlpha'
import { ArrowDownIcon } from '../../components/icons'
import './momoIntro.css'

type Tuple = [number, number, number, number]
export const MOMO_BRAID_LAYOUT_EVENT = 'momo-braid-layout'
const MOMO_CLIPS = ['listening', 'floating'] as const
const clamp = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (v: number) => v * v * (3 - 2 * v)
// Ordered authored boundaries. Each dial retimes one whole sequence without changing its poses.
const SEQUENCES = [
  { key: 'phoneArrival', end: PHONE_TIMELINE.meet },
  { key: 'meetingNotice', end: PHONE_TIMELINE.luck },
  { key: 'goodLuckNotice', end: PHONE_TIMELINE.skip },
  { key: 'threePm', end: PHONE_TIMELINE.k[1] },
  { key: 'fivePm', end: PHONE_TIMELINE.k[2] },
  { key: 'evening', end: PHONE_TIMELINE.det },
  { key: 'bodySignals', end: PHONE_TIMELINE.risen },
  { key: 'signalChecks', end: PHONE_TIMELINE.buzz },
  { key: 'momoNudge', end: PHONE_TIMELINE.press },
  { key: 'openApp', end: PHONE_TIMELINE.voice },
  { key: 'momoEntrance', end: PHONE_TIMELINE.talk },
  { key: 'voiceReflection', end: PHONE_TIMELINE.calm },
  { key: 'heroHandoff', end: PHONE_TIMELINE.hero },
  { key: 'heroHold', end: PHONE_TIMELINE.dur },
] as const
const HANDOFF_INDEX = SEQUENCES.findIndex(sequence => sequence.key === 'heroHandoff')
const option = <T extends string>(...pairs: [T, string][]) => pairs.map(([value, label]) => ({ value, label }))
type SequenceKey = (typeof SEQUENCES)[number]['key']
const TIMING = Object.fromEntries(SEQUENCES.map((sequence, i) => [
  sequence.key, [sequence.end - (i ? SEQUENCES[i - 1].end : 0), 0.05, 30, 0.05],
])) as Record<SequenceKey, Tuple>
const SPEEDS = Object.fromEntries(SEQUENCES.map(sequence => [sequence.key, [1, 0.25, 3, 0.05]])) as Record<SequenceKey, Tuple>
const CONFIG = {
  enabled: true,
  replay: { type: 'action' as const, label: 'Replay intro' },
  /** Freezes the film on the current frame (clock, scroll, Momo videos); press again to resume. Not saved. */
  pause: { type: 'action' as const, label: 'Pause / play intro' },
  /** Scrub the film: dragging `time` (film seconds) jumps there and pauses; the step buttons move
   *  one `step` either way. Pausing writes the current time back here. Session-only, never saved. */
  playhead: {
    time: [0, 0, +PHONE_TIMELINE.dur.toFixed(2), 0.01] as Tuple,
    step: [0.03, 0.01, 1, 0.01] as Tuple,
    back: { type: 'action' as const, label: '◀ Step back' },
    forward: { type: 'action' as const, label: 'Step forward ▶' },
    _collapsed: false,
  },
  speed: [1, 0.1, 1.5, 0.05] as Tuple,
  /** Tap the nudge → Momo opens: the app window grows out of the notification. Film seconds; live. */
  appLaunch: {
    duration: [0.7, 0.2, 2.5, 0.05] as Tuple,
    spring: [9, 3, 20, 0.5] as Tuple,
    face: [0.15, 0.05, 1, 0.01] as Tuple,
    press: [0.05, 0, 0.15, 0.005] as Tuple,
    zoom: [0.05, 0, 0.2, 0.005] as Tuple,
    blur: [6, 0, 20, 0.5] as Tuple,
    dim: [0.22, 0, 0.6, 0.01] as Tuple,
    _collapsed: false,
  },
  /** Momo asleep, from the app opening until the record tap wakes it: body size and centre, in the
   *  phone screen's 390-wide units. Awake Momo is 230 at 383; asleep matches awake's body size at equal `size`. */
  momoAsleep: {
    size: [150, 80, 320, 1] as Tuple,
    y: [250, 150, 600, 1] as Tuple,
    _collapsed: false,
  },
  /** Freeform pill label in the voice screen's bottom bar, in screen px; live. Letter-spacing widens
   *  the pill with it; x/y nudge the text inside the pill. */
  freeformPill: {
    letterSpacing: [0, -1, 2, 0.01] as Tuple,
    x: [0, -12, 12, 0.25] as Tuple,
    y: [0, -6, 6, 0.25] as Tuple,
    /** Corner radius of the pill; 23 = fully round ends (pill is 46 tall). */
    radius: [23, 0, 23, 0.5] as Tuple,
    _collapsed: false,
  },
  /** Pause icon in the bottom bar: corner radius of its two 3×14 bars, in screen px (1.5 = capsule); live. */
  pauseIcon: {
    radius: [0, 0, 1.5, 0.05] as Tuple,
    _collapsed: false,
  },
  /** Gaps between the status bar icons, in pt; live. The battery stays put, the others move. */
  statusIcons: {
    wifi: [4.2, 0, 12, 0.1] as Tuple,
    battery: [5.8, 0, 12, 0.1] as Tuple,
    _collapsed: false,
  },
  /** Seconds at speed 1. Applied on the next Replay intro, so edits never jump mid-scene. */
  timingSeconds: { ...TIMING, _collapsed: false },
  /** Playback speed of each screen sequence (2 = twice as fast), on top of `speed`. Live: changes
   *  apply mid-scene without a jump. */
  sequenceSpeed: { ...SPEEDS, _collapsed: false },
  /** Vertical offsets in the film's 960×540 coordinates. Positive moves down; updates live. */
  phonePosition: {
    lockScreenY: [24, -120, 120, 1] as Tuple,
    signalCheckY: [0, -120, 120, 1] as Tuple,
    voiceReflectionY: [0, -120, 120, 1] as Tuple,
    _collapsed: false,
  },
  hero: {
    width: [360, 120, 900, 10] as Tuple,
    slot: [48, 16, 200, 1] as Tuple,
    energy: [0.15, 0, 1, 0.01] as Tuple,
    /** Extra space (px) between the top of the screen and the braid once the intro lands. */
    topGap: [0, 0, 300, 1] as Tuple,
  },
  startAt: [0.35, 0.05, 0.95, 0.01] as Tuple,
  returnToHero: true,
  /** "Skip intro" button shown while the film plays on the stage. */
  skip: {
    enabled: true,
    label: { type: 'text' as const, default: 'Skip intro' },
    /** Independent label offsets; these do not move the pill, progress ring, or arrow. */
    text: {
      x: [0, -80, 80, 0.5] as Tuple,
      y: [0, -40, 40, 0.5] as Tuple,
    },
    /** Independent icon geometry; offsets do not move the label or progress ring. */
    arrow: {
      style: { type: 'select' as const, options: ['arrow', 'chevrons'], default: 'arrow' },
      scale: [1, 0.4, 3, 0.05] as Tuple,
      x: [0, -40, 40, 0.5] as Tuple,
      y: [0, -40, 40, 0.5] as Tuple,
    },
    style: {
      type: 'select' as const,
      options: option(['glass', 'Frosted glass pill'], ['solid', 'Solid ink pill'], ['outline', 'Hairline outline'], ['text', 'Text only'], ['progress', 'Glass + progress ring']),
      default: 'glass',
    },
    hover: {
      type: 'select' as const,
      options: option(['nudge', 'Arrow nudges'], ['lift', 'Lift + shadow'], ['grow', 'Grow'], ['fill', 'Fill with ink'], ['none', 'None']),
      default: 'nudge',
    },
    click: {
      type: 'select' as const,
      options: option(['press', 'Press (scale down)'], ['squish', 'Squish + spring back'], ['sink', 'Sink (flatten shadow)'], ['none', 'None']),
      default: 'press',
    },
    placement: {
      type: 'select' as const,
      options: option(['top-right', 'Top right'], ['top-center', 'Top center'], ['top-left', 'Top left'], ['bottom-right', 'Bottom right'], ['bottom-center', 'Bottom center'], ['bottom-left', 'Bottom left']),
      default: 'top-right',
    },
    /** Distance from the screen edges for the chosen placement (px). */
    inset: [28, 0, 160, 1] as Tuple,
    /** Progress ring (Glass + progress ring style): stroke width (the 14px ring is drawn on a 16-unit grid); its outer edge stays put. */
    ringThickness: [1.6, 0.5, 4, 0.1] as Tuple,
    /** Thickness of the unfilled track, as a share of the ring thickness. */
    ringTrack: [1, 0.25, 1, 0.05] as Tuple,
    /** Nudge from the placement (px): + right / + down. */
    x: [0, -600, 600, 1] as Tuple,
    y: [0, -600, 600, 1] as Tuple,
    /** What skipping does: jump to the film's ending (band glides into the hero) or cut straight to the hero. */
    ending: {
      type: 'select' as const,
      options: option(['handoff', 'Glide into hero'], ['cut', 'Cut to hero']),
      default: 'handoff',
    },
  },
  /** On the hero, the band periodically hints that it replays the intro: the band animates and the
   * "Replay intro" pill shows for showFor seconds, then both rest for hideFor seconds, looping. */
  replayHint: {
    enabled: true,
    /** Seconds on the hero before the first hint. */
    firstDelay: [5, 0, 30, 0.5] as Tuple,
    /** Seconds each hint lasts. */
    showFor: [2.5, 0.5, 15, 0.1] as Tuple,
    /** Seconds of rest between hints (also the wait after the visitor hovers the band). */
    hideFor: [5, 0.5, 30, 0.5] as Tuple,
    braid: {
      type: 'select' as const,
      options: option(['swell', 'Swell (grow + brighten)'], ['pulse', 'Pulse twice'], ['breathe', 'Slow breathe'], ['shimmer', 'Shimmer (energy only)'], ['bob', 'Bob up and down'], ['none', 'None']),
      default: 'pulse',
    },
    intensity: [1, 0, 2, 0.05] as Tuple,
    pill: {
      type: 'select' as const,
      options: option(['drop', 'Drop in'], ['rise', 'Rise in'], ['fade', 'Fade'], ['pop', 'Pop'], ['none', 'No pill (band only)']),
      default: 'drop',
    },
    /** Where the "Replay intro" pill sits (hover and hint): under the band, or centred on it. */
    pillPosition: {
      type: 'select' as const,
      options: option(['below', 'Below the band'], ['center', 'Centred on the band']),
      default: 'below',
    },
    /** Pill nudge up (−) / down (+), px. */
    pillY: [0, -80, 80, 1] as Tuple,
  },
  _collapsed: false,
}
/** The playhead is a dev scrubber, never a tuned value. */
const SESSION_ONLY = ['playhead'] as const
const round2 = (v: number) => Math.round(v * 100) / 100

/** Approved phone film on the stage; its final voice band hands off to the live hero. */
export function MomoIntro({ onDone, onStart }: { onDone: () => void; onStart?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const replayRef = useRef<() => void>(() => {})
  const skipRef = useRef<() => void>(() => {})
  const pauseRef = useRef<() => boolean>(() => false)
  const seekRef = useRef<(to: number) => void>(() => {})
  const timeRef = useRef<() => number>(() => 0)
  const skipBtnRef = useRef<HTMLButtonElement>(null)
  const momoVideos = useRef<Record<string, HTMLVideoElement | null>>({})
  const momoCanvases = useRef<Record<string, HTMLCanvasElement | null>>({})
  // The prototype's VoiceBeam over the film's phone screen: placed per frame, fed the film's voice level.
  const beamRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLCanvasElement>(null)
  const beamLevel = useRef(0)
  const readBeamLevel = useRef(() => beamLevel.current).current
  const [beamActive, setBeamActive] = useState(false)
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const lastPlayhead = useRef(0)
  const tuning = useTuningController('Momo intro', CONFIG, {
    sessionOnly: SESSION_ONLY,
    onAction: (action) => {
      // Sync the playhead slider without it seeking again (see the playhead effect below).
      const setPlayhead = (to: number) => { lastPlayhead.current = to; tuning.setValue('playhead.time', to) }
      if (action === 'replay') replayRef.current()
      if (action === 'pause' && pauseRef.current()) setPlayhead(round2(timeRef.current()))
      if (action === 'playhead.back' || action === 'playhead.forward') {
        const step = tRef.current.playhead.step * (action === 'playhead.back' ? -1 : 1)
        const to = round2(clamp((timeRef.current() + step) / PHONE_TIMELINE.dur) * PHONE_TIMELINE.dur)
        setPlayhead(to); seekRef.current(to)
      }
    },
  })
  const t = tuning.values
  // Dragging the playhead slider seeks; values written by setPlayhead are already in place.
  useEffect(() => {
    const to = t.playhead.time
    if (Math.abs(to - lastPlayhead.current) < 1e-6) return
    lastPlayhead.current = to
    seekRef.current(to)
  }, [t.playhead.time])
  // Freeform pill, pause icon and status icon dials preview live: a change holds the film (paused; the
  // frame loop redraws with the new values every frame) on a moment that shows what the dial moves.
  // Status icons: just after the app opens, with the whole phone in frame. Pill and pause: the voice
  // screen while recording. Already paused inside that window? It stays on that frame.
  const barDials = JSON.stringify([t.freeformPill, t.pauseIcon])
  const statusDials = JSON.stringify(t.statusIcons)
  const lastDials = useRef({ bar: barDials, status: statusDials })
  useEffect(() => {
    const last = lastDials.current
    const T = PHONE_TIMELINE
    const span: [number, number, number] | null = statusDials !== last.status ? [T.voice + 0.8, T.voice + 1.6, T.voice + 1.2]
      : barDials !== last.bar ? [T.talk, T.calm, T.talk + 0.5] : null
    lastDials.current = { bar: barDials, status: statusDials }
    if (!span) return
    const [from, until, at] = span, now = timeRef.current(), to = round2(now >= from && now < until ? now : at)
    lastPlayhead.current = to; tuning.setValue('playhead.time', to)
    seekRef.current(to)
  }, [barDials, statusDials, tuning])
  const tRef = useRef(t)
  tRef.current = t
  const cbRef = useRef({ onDone, onStart })
  cbRef.current = { onDone, onStart }
  const enabled = t.enabled && !reduced

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setReduced(media.matches)
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])
  useEffect(() => { if (!enabled) cbRef.current.onDone() }, [enabled])
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--braid-slot-h', `${t.hero.slot}px`)
    // The replay button's hit area is the band itself, not the full-width slot.
    root.style.setProperty('--braid-w', `${t.hero.width}px`)
    window.dispatchEvent(new Event('resize'))
    return () => { root.style.removeProperty('--braid-slot-h'); root.style.removeProperty('--braid-w') }
  }, [t.hero.slot, t.hero.width])
  // The landing scroll is measured, not drawn: re-measure when the gap dial moves.
  useEffect(() => { window.dispatchEvent(new Event(MOMO_BRAID_LAYOUT_EVENT)) }, [t.hero.topGap])

  useEffect(() => {
    if (!enabled) return
    const canvas = canvasRef.current!, stage = stageRef.current!
    const ctx = canvas.getContext('2d')!
    const filmCanvas = document.createElement('canvas'), filmCtx = filmCanvas.getContext('2d')!
    const topCanvas = topRef.current!, topCtx = topCanvas.getContext('2d')!
    const root = document.documentElement
    let vw = 0, vh = 0, dpr = 1, filmDpr = 1, stageH = 1, landingY = 1, slotY = 0, slotX = 0
    let ready = false, disposed = false, playing = false, paused = false
    let time = 0, rt = 0, raf = 0, last = 0, handoffY: number | null = null
    let interrupted = false, enteredStage = false, handedOff = false, handoffCancelled = false, handoffSettled = false
    // `sequenceProgress` is 0–1 through the current sequence, so a speed dial can change mid-scene
    // without the film jumping.
    let sequenceIndex = 0, sequenceProgress = 0
    let sequenceDurations = tRef.current.timingSeconds
    /** Real seconds the sequence takes at speed 1: its authored seconds over its live speed dial. */
    const sequenceSeconds = (i: number) => sequenceDurations[SEQUENCES[i].key] / (tRef.current.sequenceSpeed[SEQUENCES[i].key] || 1)
    // Once the film has handed off to the hero, the stage above is closed: the page can't scroll back
    // up into it (only clicking the band replays). The floor ratchets up to the landing position, so a
    // visitor who scrolled past the stage short of the landing isn't yanked; they just can't go back up.
    let locked = false, floor = 0
    const setFloor = (y: number) => {
      floor = y
      if (locked) root.dataset.scrollMin = String(Math.round(floor))
      else delete root.dataset.scrollMin
    }
    const lock = (on: boolean) => {
      locked = on
      setFloor(on ? Math.min(window.scrollY, landingY) : 0)
    }
    // From mount until the film has loaded, and then while it plays (until its own handoff glide), the
    // page can't go down: Skip intro is the only way past. Holding during the load matters: a quick
    // scroll right after a refresh used to slip under the stage before the film could start. The
    // ceiling ratchets down with any upward scroll (Replay's glide), and every downward input is
    // cancelled before it scrolls; programmatic scrolls (skip, handoff) run after the hold ends.
    let loading = true
    let ceil = window.scrollY
    const holding = () => (loading || playing) && handoffY === null
    const holdFloor = () => {
      const y = window.scrollY
      if (holding()) {
        if (y < ceil) ceil = y
        else if (y > ceil + 1) { window.scrollTo({ top: ceil, behavior: 'instant' }); return }
      }
      if (!locked) return
      if (y > floor && floor < landingY) setFloor(Math.min(y, landingY))
      else if (y < floor - 1) window.scrollTo({ top: floor, behavior: 'instant' })
    }
    // Input that starts inside something that scrolls on its own (the DialKit panel, any overflow
    // list) belongs to that element, never to the page, so the locks below leave it alone.
    const ownScroller = (target: EventTarget | null) => {
      for (let el = target instanceof Element ? target : null; el && el !== document.body && el !== root; el = el.parentElement) {
        const y = getComputedStyle(el).overflowY
        if ((y === 'auto' || y === 'scroll') && el.scrollHeight > el.clientHeight + 1) return true
      }
      return false
    }
    // Stop wheel/touch before anything scrolls (capture phase, so the site's ControlledScroll sees
    // defaultPrevented and doesn't glide): down while the film plays, up at the floor once handed off.
    const blockWheel = (e: WheelEvent) => {
      if (((holding() && e.deltaY > 0) || (locked && e.deltaY < 0 && window.scrollY <= floor + 1)) && !ownScroller(e.target)) e.preventDefault()
    }
    let touchY = 0
    const onTouchStart = (e: TouchEvent) => { touchY = e.touches[0]?.clientY ?? 0 }
    const blockTouch = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? 0
      if (((holding() && y < touchY) || (locked && y > touchY && window.scrollY <= floor + 1)) && !ownScroller(e.target)) e.preventDefault()
    }
    const DOWN_KEYS = new Set([' ', 'PageDown', 'ArrowDown', 'End'])
    const blockKeys = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (!holding() || !DOWN_KEYS.has(e.key) || el?.isContentEditable || el?.closest('input, textarea, select, button') || ownScroller(el)) return
      e.preventDefault()
    }
    const completeHandoff = () => {
      if (handedOff) return
      handedOff = true
      lock(true)
      cbRef.current.onDone()
    }
    // Skip button: shown only while the film plays on the stage and before its own handoff starts.
    // Toggled straight on the element from the frame loop, so the film never re-renders React.
    let skipShown = false
    const showSkip = (on: boolean) => {
      const b = skipBtnRef.current
      skipShown = on && !!b
      if (!b || on === b.hasAttribute('data-shown')) return
      b.toggleAttribute('data-shown', on); b.inert = !on
    }
    const videos = MOMO_CLIPS.map(clip => momoVideos.current[clip]!)
    const canvases = MOMO_CLIPS.map(clip => momoCanvases.current[clip]!)
    const stopDecoders = videos.map((video, i) => stackedAlpha(video, canvases[i]))
    const momoFrames: { awake?: CanvasImageSource; asleep?: CanvasImageSource } = {}
    let momoPlaying = false
    const syncMomo = (on: boolean) => {
      if (on === momoPlaying) return
      momoPlaying = on
      for (const video of videos) {
        if (on) void video.play().catch(error => console.error('Intro Momo playback failed', error))
        else video.pause()
      }
    }
    // Hover to replay: the band in the hero is a button. Hovering eases `swell` 0 → 1 (band grows and
    // speaks a little louder, the "Replay intro" pill drops under it); clicking replays the film.
    // Delegated listeners + a fresh lookup, so a re-rendered hero keeps working.
    // Idle hint (replayHint dials): while replayable and not hovered, the band animates and the pill
    // shows for showFor seconds every showFor + hideFor, starting firstDelay after landing.
    const SLOT = '.case__section--hero .case__braid-slot'
    const slotBtn = () => document.querySelector<HTMLButtonElement>(SLOT)
    let hovering = false, swell = 0, replayable = false, hintFrom = 0, hint = 0
    const setHover = (on: boolean) => {
      const next = on && replayable
      // Leaving the band restarts the hint cycle with a rest, so the hint never fires right after a hover.
      if (hovering && !next) hintFrom = performance.now() + (tRef.current.replayHint.hideFor - tRef.current.replayHint.firstDelay) * 1000
      hovering = next
      slotBtn()?.toggleAttribute('data-hover', hovering)
      wake()
    }
    const setReplayable = (on: boolean) => {
      replayable = on
      if (on) hintFrom = performance.now()
      const b = slotBtn()
      if (b) { b.disabled = !on; b.toggleAttribute('aria-hidden', !on) }
      if (!on) setHover(false)
    }
    const inSlot = (n: EventTarget | null) => n instanceof Element && !!n.closest(SLOT)
    const onOver = (e: Event) => { if (inSlot(e.target)) setHover(true) }
    const onOut = (e: Event) => { if (inSlot(e.target) && !inSlot((e as PointerEvent | FocusEvent).relatedTarget)) setHover(false) }
    const onClick = (e: Event) => { if (replayable && inSlot(e.target)) replayRef.current() }
    const progress = () => 1 - clamp(window.scrollY / stageH)
    const measure = () => {
      if (disposed) return
      vw = window.innerWidth; vh = window.innerHeight; dpr = Math.min(1.5, window.devicePixelRatio || 1)
      // Both layers are dominated by soft gradients and source art near CSS-pixel resolution.
      // Capping the display canvas at 1.5× keeps edges crisp while avoiding a 2× buffer's 78%
      // extra pixels during the scroll handoff; the heavier offscreen film stays at 1×.
      filmDpr = 1
      canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr)
      topCanvas.width = canvas.width; topCanvas.height = canvas.height
      filmCanvas.width = Math.round(vw * filmDpr); filmCanvas.height = Math.round(vh * filmDpr)
      stageH = stage.offsetHeight || vh
      const box = document.querySelector('.case__section--hero .case__braid-slot')?.getBoundingClientRect()
      slotY = box ? box.top + box.height / 2 + window.scrollY : stageH + 120
      slotX = box ? box.left + box.width / 2 : vw / 2
      // Desktop landing matches the hero composition: band level with the navigation,
      // centered phone continuing below the fold. Keep the narrow-screen band below the nav.
      const nav = document.querySelector('.case .nav')?.getBoundingClientRect()
      const previousLanding = landingY
      landingY = vw > 800 && box && nav ? Math.max(stageH, slotY - (nav.top + nav.height / 2) - tRef.current.hero.topGap) : stageH
      if (locked) setFloor(floor >= previousLanding ? landingY : Math.min(floor, landingY))
      wake()
    }
    const start = () => {
      if (!ready) return
      playing = true; paused = false; time = 0; handoffY = null; interrupted = false; handedOff = false; handoffCancelled = false; handoffSettled = false
      ceil = window.scrollY
      sequenceIndex = 0; sequenceProgress = 0
      for (const video of videos) video.currentTime = 0
      sequenceDurations = { ...tRef.current.timingSeconds }
      enteredStage = progress() > .03
      setReplayable(false)
      cbRef.current.onStart?.()
    }
    const interrupt = (event: Event) => {
      interrupted = true
      // Wheel/touch is an explicit takeover. A key event may come from DialKit or another
      // control without moving the page, so it must not cancel the automatic handoff.
      if (event.type !== 'keydown' && handoffY !== null && !handoffSettled) handoffCancelled = true
    }
    const frame = (now: number) => {
      raf = 0
      if (disposed) return
      const s = tRef.current
      const realDt = last && !document.hidden ? Math.min(0.1, (now - last) / 1000) : 0
      const dt = paused ? 0 : realDt * s.speed
      last = now; rt += dt
      let p = progress()
      if (playing && p > .03) enteredStage = true
      // A manual skip ends playback now, not at the film's elapsed-time deadline.
      // During replay's scroll-up, wait until the stage has actually been entered.
      if (playing && enteredStage && p <= .03 && handoffY === null) {
        playing = false
        setReplayable(true)
        completeHandoff()
      }
      if (playing) {
        sequenceProgress += dt / sequenceSeconds(sequenceIndex)
        while (sequenceIndex < SEQUENCES.length && sequenceProgress >= 1) {
          const spill = (sequenceProgress - 1) * sequenceSeconds(sequenceIndex)
          sequenceIndex++
          sequenceProgress = sequenceIndex < SEQUENCES.length ? spill / sequenceSeconds(sequenceIndex) : 0
        }
        if (sequenceIndex === SEQUENCES.length) time = PHONE_TIMELINE.dur
        else {
          const sequence = SEQUENCES[sequenceIndex]
          const from = sequenceIndex ? SEQUENCES[sequenceIndex - 1].end : 0
          time = from + (sequence.end - from) * sequenceProgress
        }
        // Drive the scroll from the film clock, in this same frame, before drawing. The canvas
        // then reads the exact scrollY the page will paint with: braid and page move as one.
        // (Native smooth scroll ran on its own ~0.5s curve and the canvas trailed it a frame.)
        const userScrolledBeforeHandoff = interrupted && p <= .03
        if (time >= PHONE_TIMELINE.calm && s.returnToHero && !handoffCancelled && !handoffSettled && (handoffY !== null || !userScrolledBeforeHandoff)) {
          if (handoffY === null) { interrupted = false; handoffY = window.scrollY }
          const k = clamp((time - PHONE_TIMELINE.calm) / (PHONE_TIMELINE.hero - PHONE_TIMELINE.calm))
          const eased = 0.5 - 0.5 * Math.cos(Math.PI * k) // same curve as the braid's own move
          window.scrollTo(0, Math.round(handoffY + (landingY - handoffY) * eased))
          if (k >= 1) handoffSettled = true
          p = progress()
        }
        // The visual handoff is complete when the braid reaches its hero slot. Reveal the
        // live phone now instead of waiting through the film's trailing hold.
        if (time >= PHONE_TIMELINE.hero) completeHandoff()
        if (time >= PHONE_TIMELINE.dur) { playing = false; setReplayable(true); completeHandoff() }
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height)
      const ending = playing ? smooth(clamp((time - PHONE_TIMELINE.hero + .35) / .35)) : 1
      const filmAlpha = playing ? (handoffY !== null && !handoffCancelled ? 1 : smooth(p)) : 0
      syncMomo(playing && !paused && !document.hidden && filmAlpha > .001 && time >= PHONE_TIMELINE.voice - .2 && time < PHONE_TIMELINE.calm + 1)
      // A painted clip canvas keeps its last frame (preserveDrawingBuffer), so use it even while the
      // video seeks at its loop point: falling back to the still for that frame read as a glitch.
      momoFrames.awake = canvases[0].width > 1 ? canvases[0] : undefined
      momoFrames.asleep = canvases[1].width > 1 ? canvases[1] : undefined
      if (filmAlpha > .001) {
        const scale = Math.min(vw / (vw < 700 ? 480 : 960), vh / 540)
        const ox = (vw - 960 * scale) / 2, oy = (vh - 540 * scale) / 2
        filmCtx.setTransform(1, 0, 0, 1, 0, 0); filmCtx.clearRect(0, 0, filmCanvas.width, filmCanvas.height)
        topCtx.setTransform(1, 0, 0, 1, 0, 0); topCtx.clearRect(0, 0, topCanvas.width, topCanvas.height)
        setAppLaunch(s.appLaunch); setMomoAsleep(s.momoAsleep); setPillText(s.freeformPill); setPauseIcon(s.pauseIcon); setStatusGaps(s.statusIcons)
        const beam = drawPhoneFilm(filmCtx, time, [scale * filmDpr, ox * filmDpr, oy * filmDpr], {
          x: (slotX - vw / 2) / scale + 480,
          y: (slotY - window.scrollY - vh / 2) / scale + 270,
          width: Math.min(s.hero.width, vw * .72) / scale,
          env: s.hero.energy,
        }, s.phonePosition, momoFrames, topCtx, [scale * dpr, ox * dpr, oy * dpr])
        // The page band carries on from the film band's phase, so the hand-off cross-fade lines up.
        rt = beam.rt
        topCanvas.style.opacity = String(filmAlpha)
        ctx.globalAlpha = filmAlpha
        ctx.drawImage(filmCanvas, 0, 0, canvas.width, canvas.height)
        ctx.globalAlpha = 1
        beamLevel.current = beam.level
        setBeamActive(beam.active)
        const el = beamRef.current
        if (el) {
          el.style.transform = `translate(${ox + beam.x * scale}px, ${oy + beam.y * scale}px) scale(${(beam.w * scale) / BEAM_SCREEN.w})`
          el.style.opacity = String(filmAlpha)
        }
      } else {
        beamLevel.current = 0
        setBeamActive(false)
        if (beamRef.current) beamRef.current.style.opacity = '0'
        topCanvas.style.opacity = '0'
      }
      const ay = slotY - window.scrollY
      swell += ((hovering ? 1 : 0) - swell) * (1 - Math.exp(-dt / s.speed * 10))
      const h = s.replayHint
      const hintAt = (now - hintFrom) / 1000 - h.firstDelay // seconds into the hint loop
      const hintPhase = hintAt >= 0 ? hintAt % (h.showFor + h.hideFor) : 0
      const hinting = h.enabled && replayable && !hovering && hintAt >= 0 && hintPhase < h.showFor
      hint += ((hinting ? 1 : 0) - hint) * (1 - Math.exp(-realDt * 6))
      const slot = slotBtn()
      if (slot) {
        if (slot.hasAttribute('data-hint') !== hinting) slot.toggleAttribute('data-hint', hinting)
        if (slot.dataset.hintPill !== h.pill) slot.dataset.hintPill = h.pill
        if (slot.dataset.pillPosition !== h.pillPosition) slot.dataset.pillPosition = h.pillPosition
        const pillY = `${h.pillY}px`
        if (slot.style.getPropertyValue('--pill-y') !== pillY) slot.style.setProperty('--pill-y', pillY)
      }
      // Idle hint on the band itself: extra scale, energy and vertical offset, faded in/out by `hint`.
      const a = hint * h.intensity
      const wave = h.braid === 'pulse' ? Math.sin(Math.PI * 2 * clamp(hintPhase / h.showFor)) ** 2
        : h.braid === 'breathe' ? 0.5 - 0.5 * Math.cos(Math.PI * 2 * hintPhase / 1.6)
        : h.braid === 'bob' ? Math.sin(Math.PI * 2 * hintPhase / 1.2)
        : 1
      const hintScale = h.braid === 'swell' || h.braid === 'pulse' ? .14 * a * wave : h.braid === 'breathe' ? .08 * a * wave : 0
      const hintEnv = h.braid === 'swell' || h.braid === 'pulse' ? .3 * a * wave : h.braid === 'breathe' ? .15 * a * wave : h.braid === 'shimmer' ? .6 * a : 0
      const hintY = h.braid === 'bob' ? -6 * a * wave : 0
      if (ay > -200 && ay < vh + 200) {
        const scale = Math.min(s.hero.width, vw * .72) / (2 * 320 * .87) * (1 + .14 * swell + hintScale)
        setRT(rt)
        drawBraid(ctx, [scale * dpr, (slotX - 480 * scale) * dpr, (ay + hintY - 245 * scale) * dpr], { env: s.hero.energy + .3 * swell + hintEnv, alpha: Math.max(ending, 1 - filmAlpha) })
      }
      root.toggleAttribute('data-momo-stage', p > .5)
      showSkip(playing && handoffY === null && time < PHONE_TIMELINE.calm && p > .5)
      if (skipShown) skipBtnRef.current?.style.setProperty('--momo-skip-p', String(clamp(time / PHONE_TIMELINE.calm)))
      if (!document.hidden && (playing || (ay > -200 && ay < vh + 200))) raf = requestAnimationFrame(frame)
      else last = 0
    }
    function wake() { if (!raf && !disposed) raf = requestAnimationFrame(frame) }
    // DialKit "Pause / play intro": freeze or resume the film where it is. Replay always starts playing.
    // Returns whether the film is now paused, so the playhead slider can pick up the current time.
    pauseRef.current = () => { paused = !paused; wake(); return paused }
    timeRef.current = () => time
    // DialKit playhead: hold the film at `to` (film seconds), paused. If the film has ended or handed
    // off, or the scrub goes back before the hand-off, the stage reopens first, as Replay does but
    // without the glide; from there the film clock drives the scroll as usual.
    seekRef.current = (to: number) => {
      if (!ready) return
      to = clamp(to / PHONE_TIMELINE.dur) * PHONE_TIMELINE.dur
      if (!playing || handedOff || (handoffY !== null && to < PHONE_TIMELINE.calm)) {
        lock(false); start()
        window.scrollTo({ top: 0, behavior: 'instant' })
      }
      paused = true; enteredStage = true
      let i = SEQUENCES.findIndex(sequence => to < sequence.end)
      if (i < 0) i = SEQUENCES.length - 1
      const from = i ? SEQUENCES[i - 1].end : 0, sequence = SEQUENCES[i]
      sequenceIndex = i; sequenceProgress = (to - from) / (sequence.end - from)
      time = to
      // Momo's clips loop from the moment Momo appears; put them where plain playback would be.
      for (const video of videos) if (video.duration) video.currentTime = Math.max(0, to - (PHONE_TIMELINE.voice - .2)) % video.duration
      wake()
    }
    // Replay (clicking the band is the only way back): reopen the stage, glide up, play from frame one.
    replayRef.current = () => {
      if (!ready) return
      lock(false)
      start(); wake()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    // Skip: either jump the film clock to its ending, so the band glides into the hero exactly as it
    // does at the end of the film, or stop the film and cut straight to the hero.
    skipRef.current = () => {
      if (!playing || handoffY !== null) return
      const s = tRef.current
      if (s.skip.ending === 'handoff' && s.returnToHero) {
        sequenceIndex = HANDOFF_INDEX; sequenceProgress = 0; time = PHONE_TIMELINE.calm
        enteredStage = true; interrupted = false; handoffCancelled = false; handoffSettled = false
      } else {
        playing = false; handoffSettled = true
        setReplayable(true); completeHandoff()
        window.scrollTo({ top: landingY, behavior: 'instant' })
      }
      showSkip(false)
      wake()
    }
    measure()
    void loadPhoneFilm().then(() => {
      if (disposed) return
      ready = true; loading = false
      if (progress() > tRef.current.startAt) start()
      else { setReplayable(true); completeHandoff() }
      wake()
    }).catch((error) => {
      if (disposed) return
      console.error('Momo intro assets could not load', error)
      loading = false
      window.scrollTo({ top: stageH, behavior: 'instant' })
      completeHandoff()
    })
    const visibility = () => { last = 0; if (document.hidden) syncMomo(false); wake() }
    document.addEventListener('pointerover', onOver)
    document.addEventListener('pointerout', onOut)
    document.addEventListener('focusin', onOver)
    document.addEventListener('focusout', onOut)
    document.addEventListener('click', onClick)
    window.addEventListener('scroll', wake, { passive: true })
    window.addEventListener('scroll', holdFloor, { passive: true })
    window.addEventListener('wheel', blockWheel, { passive: false, capture: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', blockTouch, { passive: false })
    window.addEventListener('keydown', blockKeys, { capture: true })
    window.addEventListener('resize', measure)
    window.addEventListener(MOMO_BRAID_LAYOUT_EVENT, measure)
    window.addEventListener('wheel', interrupt, { passive: true })
    window.addEventListener('touchstart', interrupt, { passive: true })
    window.addEventListener('keydown', interrupt)
    document.addEventListener('visibilitychange', visibility)
    const ro = new ResizeObserver(measure)
    const hero = document.querySelector('.case__section--hero')
    if (hero) ro.observe(hero)
    void document.fonts.ready.then(measure)
    return () => {
      disposed = true; cancelAnimationFrame(raf); ro.disconnect()
      syncMomo(false); stopDecoders.forEach(stop => stop())
      window.removeEventListener('scroll', wake); window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', holdFloor); window.removeEventListener('wheel', blockWheel, { capture: true })
      window.removeEventListener('touchstart', onTouchStart); window.removeEventListener('touchmove', blockTouch)
      window.removeEventListener('keydown', blockKeys, { capture: true })
      lock(false); slotBtn()?.removeAttribute('data-hint')
      window.removeEventListener(MOMO_BRAID_LAYOUT_EVENT, measure)
      window.removeEventListener('wheel', interrupt); window.removeEventListener('touchstart', interrupt)
      window.removeEventListener('keydown', interrupt); document.removeEventListener('visibilitychange', visibility)
      root.removeAttribute('data-momo-stage'); replayRef.current = () => {}; skipRef.current = () => {}; pauseRef.current = () => false; seekRef.current = () => {}; timeRef.current = () => 0; showSkip(false)
      document.removeEventListener('pointerover', onOver); document.removeEventListener('pointerout', onOut)
      document.removeEventListener('focusin', onOver); document.removeEventListener('focusout', onOut)
      document.removeEventListener('click', onClick); setReplayable(false)
    }
  }, [enabled])

  if (!enabled) return null
  return <>
    <div ref={stageRef} className="momo-stage" aria-hidden="true" />
    <canvas ref={canvasRef} className="momo-intro" aria-hidden="true" />
    <MomoVoiceBeam ref={beamRef} active={beamActive} level={readBeamLevel} />
    {/* The phone's bottom controls and tap cursor, above the beam. */}
    <canvas ref={topRef} className="momo-intro" aria-hidden="true" />
    {t.skip.enabled && <button
      ref={skipBtnRef}
      type="button"
      className="momo-skip"
      inert
      data-style={t.skip.style}
      data-hover-feel={t.skip.hover}
      data-click-feel={t.skip.click}
      data-placement={t.skip.placement}
      style={{ '--momo-skip-inset': `${t.skip.inset}px`, '--momo-skip-x': `${t.skip.x}px`, '--momo-skip-y': `${t.skip.y}px` } as CSSProperties}
      onClick={() => skipRef.current()}
    >
      {t.skip.style === 'progress' && <svg className="momo-skip__ring" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r={7.4 - t.skip.ringThickness / 2} pathLength={1} strokeWidth={t.skip.ringThickness * t.skip.ringTrack} />
        <circle className="momo-skip__ring-fill" cx="8" cy="8" r={7.4 - t.skip.ringThickness / 2} pathLength={1} strokeWidth={t.skip.ringThickness} />
      </svg>}
      <span className="momo-skip__label" style={{ '--momo-skip-label-x': `${t.skip.text.x}px`, '--momo-skip-label-y': `${t.skip.text.y}px` } as CSSProperties}>{t.skip.label}</span>
      <span className="momo-skip__arrow" style={{ display: 'inline-flex' }}>
        <span style={{ display: 'inline-flex', width: '100%', height: '100%', transform: `translate(${t.skip.arrow.x}px, ${t.skip.arrow.y}px) scale(${t.skip.arrow.scale}) rotate(${t.skip.arrow.style === 'arrow' ? -90 : 0}deg)` }}>
          {t.skip.arrow.style === 'arrow' ? <ArrowDownIcon /> : <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3.5 3.5 8 8l-4.5 4.5M8.5 3.5 13 8l-4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>}
        </span>
      </span>
    </button>}
    <div className="momo-intro__decoders" aria-hidden="true">
      {MOMO_CLIPS.map(clip => <div key={clip}>
        <video ref={node => { momoVideos.current[clip] = node }} src={`/work/momo/momo-${clip}.mp4`} muted playsInline loop preload="auto" />
        <canvas ref={node => { momoCanvases.current[clip] = node }} width={1} height={1} />
      </div>)}
    </div>
  </>
}
