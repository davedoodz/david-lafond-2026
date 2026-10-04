import { useEffect, useRef, useState } from 'react'
import { useTuningController } from '../../tuning/useTuning'
import { drawBraid, setRT } from './braid'
import { drawPhoneFilm, loadPhoneFilm, PHONE_TIMELINE } from './phoneFilm'
import './unwindIntro.css'

type Tuple = [number, number, number, number]
const clamp = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (v: number) => v * v * (3 - 2 * v)
const CONFIG = {
  enabled: true,
  replay: { type: 'action' as const, label: 'Replay intro' },
  speed: [1, 0.1, 1.5, 0.05] as Tuple,
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
    window.dispatchEvent(new Event('resize'))
    return () => { root.style.removeProperty('--braid-slot-h') }
  }, [t.hero.slot])

  useEffect(() => {
    if (!enabled) return
    const canvas = canvasRef.current!, stage = stageRef.current!
    const ctx = canvas.getContext('2d')!
    const filmCanvas = document.createElement('canvas'), filmCtx = filmCanvas.getContext('2d')!
    const root = document.documentElement
    let vw = 0, vh = 0, dpr = 1, stageH = 1, slotY = 0, slotX = 0
    let ready = false, disposed = false, playing = false, armed = true
    let time = 0, rt = 0, raf = 0, last = 0, handoffY: number | null = null
    let interrupted = false
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
      wake()
    }
    const start = () => {
      if (!ready) return
      playing = true; armed = false; time = 0; handoffY = null; interrupted = false
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
      if (!playing && p < .03) armed = true
      if (ready && !playing && armed && p > s.startAt) start()
      if (playing) {
        time += dt
        if (time >= PHONE_TIMELINE.calm && s.returnToHero && !interrupted) {
          handoffY ??= window.scrollY
          const k = smooth(clamp((time - PHONE_TIMELINE.calm) / (PHONE_TIMELINE.hero - PHONE_TIMELINE.calm)))
          window.scrollTo({ top: handoffY + (stageH - handoffY) * k, behavior: 'instant' })
          p = progress()
        }
        if (time >= PHONE_TIMELINE.dur) { playing = false; cbRef.current.onDone() }
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
      if (ay > -200 && ay < vh + 200) {
        const scale = Math.min(s.hero.width, vw * .72) / (2 * 320 * .87)
        setRT(rt)
        drawBraid(ctx, [scale * dpr, (slotX - 480 * scale) * dpr, (ay - 245 * scale) * dpr], { env: s.hero.energy, alpha: Math.max(ending, 1 - filmAlpha) })
      }
      root.toggleAttribute('data-unwind-stage', p > .5)
      if (!document.hidden && (playing || (ay > -200 && ay < vh + 200))) raf = requestAnimationFrame(frame)
      else last = 0
    }
    function wake() { if (!raf && !disposed) raf = requestAnimationFrame(frame) }
    replayRef.current = () => { window.scrollTo({ top: 0, behavior: 'instant' }); start(); wake() }
    measure()
    void loadPhoneFilm().then(() => {
      if (disposed) return
      ready = true
      if (progress() > tRef.current.startAt) start()
      else cbRef.current.onDone()
      wake()
    }).catch((error) => {
      if (disposed) return
      console.error('Unwind intro assets could not load', error)
      cbRef.current.onDone()
      window.scrollTo({ top: stageH, behavior: 'instant' })
    })
    const visibility = () => { last = 0; wake() }
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
    }
  }, [enabled])

  if (!enabled) return null
  return <>
    <div ref={stageRef} className="unwind-stage" aria-hidden="true" />
    <canvas ref={canvasRef} className="unwind-intro" aria-hidden="true" />
  </>
}
