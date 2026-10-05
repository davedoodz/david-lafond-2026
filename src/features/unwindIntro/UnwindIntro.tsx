import { useEffect, useRef, useState } from 'react'
import { useTuningController } from '../../tuning/useTuning'
import { drawBraid, setRT } from './braid'
import { drawPhoneFilm, loadPhoneFilm, PHONE_TIMELINE } from './phoneFilm'
import './unwindIntro.css'

type Tuple = [number, number, number, number]
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
  { key: 'openApp', end: PHONE_TIMELINE.ask },
  { key: 'reflectionChoice', end: PHONE_TIMELINE.pick },
  { key: 'momoEntrance', end: PHONE_TIMELINE.talk },
  { key: 'voiceReflection', end: PHONE_TIMELINE.calm },
  { key: 'heroHandoff', end: PHONE_TIMELINE.hero },
  { key: 'heroHold', end: PHONE_TIMELINE.dur },
] as const
type SequenceKey = (typeof SEQUENCES)[number]['key']
const TIMING = Object.fromEntries(SEQUENCES.map((sequence, i) => [
  sequence.key, [sequence.end - (i ? SEQUENCES[i - 1].end : 0), 0.05, 30, 0.05],
])) as Record<SequenceKey, Tuple>
const CONFIG = {
  enabled: true,
  replay: { type: 'action' as const, label: 'Replay intro' },
  speed: [1, 0.1, 1.5, 0.05] as Tuple,
  /** Seconds at speed 1. Applied on the next Replay intro, so edits never jump mid-scene. */
  timingSeconds: { ...TIMING, _collapsed: false },
  hero: {
    width: [360, 120, 900, 10] as Tuple,
    slot: [48, 16, 200, 1] as Tuple,
    energy: [0.15, 0, 1, 0.01] as Tuple,
  },
  startAt: [0.35, 0.05, 0.95, 0.01] as Tuple,
  returnToHero: true,
  _collapsed: false,
}

/** Approved phone film on the stage; its final voice band hands off to the live hero. */
export function UnwindIntro({ onDone, onStart }: { onDone: () => void; onStart?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const replayRef = useRef<() => void>(() => {})
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const { values: t } = useTuningController('Unwind intro', CONFIG, {
    onAction: (action) => { if (action === 'replay') replayRef.current() },
  })
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

  useEffect(() => {
    if (!enabled) return
    const canvas = canvasRef.current!, stage = stageRef.current!
    const ctx = canvas.getContext('2d')!
    const filmCanvas = document.createElement('canvas'), filmCtx = filmCanvas.getContext('2d')!
    const root = document.documentElement
    let vw = 0, vh = 0, dpr = 1, stageH = 1, landingY = 1, slotY = 0, slotX = 0
    let ready = false, disposed = false, playing = false, armed = true
    let time = 0, rt = 0, raf = 0, last = 0, handoffY: number | null = null
    let interrupted = false, enteredStage = false
    let sequenceIndex = 0, sequenceTime = 0
    let sequenceDurations = tRef.current.timingSeconds
    // Hover to replay: the band in the hero is a button. Hovering eases `swell` 0 → 1 (band grows and
    // speaks a little louder, the "Replay intro" pill drops under it); clicking replays the film.
    // Delegated listeners + a fresh lookup, so a re-rendered hero keeps working.
    const SLOT = '.case__section--hero .case__braid-slot'
    const slotBtn = () => document.querySelector<HTMLButtonElement>(SLOT)
    let hovering = false, swell = 0, replayable = false
    const setHover = (on: boolean) => { hovering = on && replayable; slotBtn()?.toggleAttribute('data-hover', hovering); wake() }
    const setReplayable = (on: boolean) => {
      replayable = on
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
      vw = window.innerWidth; vh = window.innerHeight; dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = filmCanvas.width = Math.round(vw * dpr)
      canvas.height = filmCanvas.height = Math.round(vh * dpr)
      stageH = stage.offsetHeight || vh
      const box = document.querySelector('.case__section--hero .case__braid-slot')?.getBoundingClientRect()
      slotY = box ? box.top + box.height / 2 + window.scrollY : stageH + 120
      slotX = box ? box.left + box.width / 2 : vw / 2
      // Desktop landing matches the hero composition: band level with the navigation,
      // centered phone continuing below the fold. Keep the narrow-screen band below the nav.
      const nav = document.querySelector('.case .nav')?.getBoundingClientRect()
      landingY = vw > 800 && box && nav ? Math.max(stageH, slotY - (nav.top + nav.height / 2)) : stageH
      wake()
    }
    const start = () => {
      if (!ready) return
      playing = true; armed = false; time = 0; handoffY = null; interrupted = false
      sequenceIndex = 0; sequenceTime = 0
      sequenceDurations = { ...tRef.current.timingSeconds }
      enteredStage = progress() > .03
      setReplayable(false)
      cbRef.current.onStart?.()
    }
    const interrupt = () => { interrupted = true }
    const frame = (now: number) => {
      raf = 0
      if (disposed) return
      const s = tRef.current
      const dt = last && !document.hidden ? Math.min(0.1, (now - last) / 1000) * s.speed : 0
      last = now; rt += dt
      let p = progress()
      if (playing && p > .03) enteredStage = true
      // A manual skip ends playback now, not at the film's elapsed-time deadline.
      // During replay's scroll-up, wait until the stage has actually been entered.
      if (playing && enteredStage && p <= .03 && handoffY === null) {
        playing = false
        setReplayable(true)
        cbRef.current.onDone()
      }
      if (!playing && p < .03) armed = true
      if (ready && !playing && armed && p > s.startAt) start()
      if (playing) {
        sequenceTime += dt
        while (sequenceIndex < SEQUENCES.length && sequenceTime >= sequenceDurations[SEQUENCES[sequenceIndex].key]) {
          sequenceTime -= sequenceDurations[SEQUENCES[sequenceIndex].key]
          sequenceIndex++
        }
        if (sequenceIndex === SEQUENCES.length) time = PHONE_TIMELINE.dur
        else {
          const sequence = SEQUENCES[sequenceIndex]
          const from = sequenceIndex ? SEQUENCES[sequenceIndex - 1].end : 0
          time = from + (sequence.end - from) * sequenceTime / sequenceDurations[sequence.key]
        }
        if (time >= PHONE_TIMELINE.calm && s.returnToHero && !interrupted) {
          handoffY ??= window.scrollY
          const k = smooth(clamp((time - PHONE_TIMELINE.calm) / (PHONE_TIMELINE.hero - PHONE_TIMELINE.calm)))
          window.scrollTo({ top: handoffY + (landingY - handoffY) * k, behavior: 'instant' })
          p = progress()
        }
        if (time >= PHONE_TIMELINE.dur) { playing = false; setReplayable(true); cbRef.current.onDone() }
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height)
      const ending = playing ? smooth(clamp((time - PHONE_TIMELINE.hero + .35) / .35)) : 1
      const filmAlpha = playing ? (handoffY !== null && !interrupted ? 1 : smooth(p)) : 0
      if (filmAlpha > .001) {
        const scale = Math.min(vw / (vw < 700 ? 480 : 960), vh / 540)
        filmCtx.setTransform(1, 0, 0, 1, 0, 0); filmCtx.clearRect(0, 0, filmCanvas.width, filmCanvas.height)
        drawPhoneFilm(filmCtx, time, [scale * dpr, (vw - 960 * scale) / 2 * dpr, (vh - 540 * scale) / 2 * dpr], {
          x: (slotX - vw / 2) / scale + 480,
          y: (slotY - window.scrollY - vh / 2) / scale + 270,
          width: Math.min(s.hero.width, vw * .72) / scale,
        })
        ctx.globalAlpha = filmAlpha; ctx.drawImage(filmCanvas, 0, 0); ctx.globalAlpha = 1
      }
      const ay = slotY - window.scrollY
      swell += ((hovering ? 1 : 0) - swell) * (1 - Math.exp(-dt / s.speed * 10))
      if (ay > -200 && ay < vh + 200) {
        const scale = Math.min(s.hero.width, vw * .72) / (2 * 320 * .87) * (1 + .14 * swell)
        setRT(rt)
        drawBraid(ctx, [scale * dpr, (slotX - 480 * scale) * dpr, (ay - 245 * scale) * dpr], { env: s.hero.energy + .3 * swell, alpha: Math.max(ending, 1 - filmAlpha) })
      }
      root.toggleAttribute('data-unwind-stage', p > .5)
      if (!document.hidden && (playing || (ay > -200 && ay < vh + 200))) raf = requestAnimationFrame(frame)
      else last = 0
    }
    function wake() { if (!raf && !disposed) raf = requestAnimationFrame(frame) }
    // Replay from the hero: glide back up to the stage, then the film plays from its first frame.
    replayRef.current = () => {
      if (!ready) return
      start(); wake()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    measure()
    void loadPhoneFilm().then(() => {
      if (disposed) return
      ready = true
      if (progress() > tRef.current.startAt) start()
      else { setReplayable(true); cbRef.current.onDone() }
      wake()
    }).catch((error) => {
      if (disposed) return
      console.error('Unwind intro assets could not load', error)
      cbRef.current.onDone()
      window.scrollTo({ top: stageH, behavior: 'instant' })
    })
    const visibility = () => { last = 0; wake() }
    document.addEventListener('pointerover', onOver)
    document.addEventListener('pointerout', onOut)
    document.addEventListener('focusin', onOver)
    document.addEventListener('focusout', onOut)
    document.addEventListener('click', onClick)
    window.addEventListener('scroll', wake, { passive: true })
    window.addEventListener('resize', measure)
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
      window.removeEventListener('scroll', wake); window.removeEventListener('resize', measure)
      window.removeEventListener('wheel', interrupt); window.removeEventListener('touchstart', interrupt)
      window.removeEventListener('keydown', interrupt); document.removeEventListener('visibilitychange', visibility)
      root.removeAttribute('data-unwind-stage'); replayRef.current = () => {}
      document.removeEventListener('pointerover', onOver); document.removeEventListener('pointerout', onOut)
      document.removeEventListener('focusin', onOver); document.removeEventListener('focusout', onOut)
      document.removeEventListener('click', onClick); setReplayable(false)
    }
  }, [enabled])

  if (!enabled) return null
  return <>
    <div ref={stageRef} className="unwind-stage" aria-hidden="true" />
    <canvas ref={canvasRef} className="unwind-intro" aria-hidden="true" />
  </>
}
