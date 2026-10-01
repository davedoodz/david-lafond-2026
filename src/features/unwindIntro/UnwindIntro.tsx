import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTuningController } from '../../tuning/useTuning'
import { CHAPTERS, G, HERO_PHONE, SIZE, hooks, renderParts, sequence, setRT } from './introEngine'
import './unwindIntro.css'

type Tuple = [number, number, number, number]
const opts = (id: string) => CHAPTERS.find((c) => c.id === id)!.variants.map((v) => v.name)
const pickOf = (id: string, name: string) => Math.max(0, opts(id).indexOf(name))

/**
 * Unwind case-study intro (designed in studio/unwind-intro-sections.html).
 * A fixed canvas over the hero plays: the voice bands wake as someone starts
 * talking → words link to past entries → the loop → the if-then plan → the
 * band drops into the phone. The canvas phone lands exactly on the hero video's
 * box, then the real page takes over. Plays every time the page opens; skipped for reduced
 * motion. Any wheel, key or tap skips it.
 */
const CONFIG = {
  enabled: true,
  replay: { type: 'action' as const, label: 'Replay intro' },
  /** Pull up at the top of the page to replay; the intro then lands back in the hero. */
  scrollReplay: true,
  /** How far to pull (wheel px or swipe px) before it replays. */
  pullDistance: [120, 20, 600, 10] as Tuple,
  speed: [0.5, 0.1, 1.5, 0.05] as Tuple,
  band: { type: 'select' as const, options: ['silk', 'strands', 'swell', 'braid', 'mist'], default: 'braid' },
  drift: [0.5, 0.2, 1, 0.05] as Tuple,
  listen: { type: 'select' as const, options: opts('listen'), default: 'Words surface' },
  connect: { type: 'select' as const, options: opts('connect'), default: 'Timeline' },
  restructure: { type: 'select' as const, options: opts('restructure'), default: 'The loop' },
  plan: { type: 'select' as const, options: opts('plan'), default: 'Strike & replace' },
  handoff: { type: 'select' as const, options: opts('handoff'), default: 'Into the phone' },
  _collapsed: false,
}

export function UnwindIntro({ onDone, onStart }: { onDone: () => void; onStart?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [run, setRun] = useState(() => {
    if (typeof window === 'undefined') return 0
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1
  })
  const { values: t } = useTuningController('Unwind intro', CONFIG, {
    onAction: (a) => {
      if (a === 'replay') setRun((r) => r + 1)
    },
  })
  const tRef = useRef(t)
  tRef.current = t
  const enabled = t.enabled && run > 0
  const [playing, setPlaying] = useState(enabled)

  useEffect(() => {
    if (!enabled) onDone()
    // onDone is stable enough for this one-shot signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  // Pull up past the top of the page (wheel up, swipe down, ↑/PageUp/Home) to replay the intro;
  // it lands back in the hero, so it reads as the start of the overview, not a section of its own.
  useEffect(() => {
    if (!t.enabled || !t.scrollReplay || playing) return
    let pull = 0
    let touchY = 0
    const atTop = () => window.scrollY <= 2
    const replay = () => {
      pull = 0
      onStart?.()
      setRun((r) => r + 1)
    }
    const wheel = (e: WheelEvent) => {
      if (!atTop() || e.deltaY >= 0) return void (pull = 0)
      pull -= e.deltaY
      if (pull > t.pullDistance) replay()
    }
    const touchStart = (e: TouchEvent) => (touchY = e.touches[0].clientY)
    const touchMove = (e: TouchEvent) => {
      if (atTop() && e.touches[0].clientY - touchY > t.pullDistance) replay()
    }
    const key = (e: KeyboardEvent) => {
      if (atTop() && (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'Home')) replay()
    }
    // Ignore the momentum tail of the scroll that brought us to the top.
    const arm = window.setTimeout(() => {
      window.addEventListener('wheel', wheel, { passive: true })
      window.addEventListener('touchstart', touchStart, { passive: true })
      window.addEventListener('touchmove', touchMove, { passive: true })
      window.addEventListener('keydown', key)
    }, 400)
    return () => {
      window.clearTimeout(arm)
      window.removeEventListener('wheel', wheel)
      window.removeEventListener('touchstart', touchStart)
      window.removeEventListener('touchmove', touchMove)
      window.removeEventListener('keydown', key)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.enabled, t.scrollReplay, t.pullDistance, playing])

  useLayoutEffect(() => {
    if (!enabled) return
    setPlaying(true)
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const cur = tRef.current
    const { parts, total } = sequence({
      listen: pickOf('listen', cur.listen),
      connect: pickOf('connect', cur.connect),
      restructure: pickOf('restructure', cur.restructure),
      plan: pickOf('plan', cur.plan),
      handoff: pickOf('handoff', cur.handoff),
    })
    hooks.page = true
    window.scrollTo(0, 0)
    document.documentElement.dataset.introLock = ''

    // Fit the whole 960×540 scene to the viewport, then move the scene's target
    // phone onto the hero video's box so the hand-off lands exactly on it.
    let m: [number, number, number] = [1, 0, 0]
    const fit = () => {
      const w = window.innerWidth, h = window.innerHeight
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
      // Narrow screens crop the scene's empty sides (the story lives in its middle ~600 units) so words stay legible.
      const s = Math.min(w / (w < 700 ? 600 : SIZE.W), h / SIZE.H), ox = (w - SIZE.W * s) / 2, oy = (h - SIZE.H * s) / 2
      m = [s * dpr, ox * dpr, oy * dpr]
      const r = document.querySelector<HTMLElement>('.case__section--hero .case__media')?.getBoundingClientRect()
      if (r && r.height > 0) {
        HERO_PHONE.cx = (r.left + r.width / 2 - ox) / s
        HERO_PHONE.cy = (r.top + r.height / 2 - oy) / s
        HERO_PHONE.pw = r.width / s
      }
    }
    fit()
    window.addEventListener('resize', fit)

    let raf = 0, last = performance.now(), clock = 0, rt = 0, done = false, landed = false
    delete document.documentElement.dataset.introLanded
    hooks.landed = false
    const finish = () => {
      if (done) return
      done = true
      canvas.dataset.out = ''
      window.setTimeout(() => {
        cancelAnimationFrame(raf)
        hooks.page = false
        delete document.documentElement.dataset.introLock
        delete document.documentElement.dataset.introLanded
        setPlaying(false)
        onDone()
      }, 450)
    }
    const frame = (now: number) => {
      const s = tRef.current
      G.band = s.band
      G.speed = s.drift
      const dt = ((now - last) / 1000) * s.speed
      last = now
      clock += dt; rt += dt
      setRT(rt)
      hooks.reveal = 0
      const T = Math.min(clock, total)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      renderParts(ctx, parts, T, m, { bg: false })
      // Veil hides the page until the hand-off reveals it.
      canvas.style.setProperty('--veil', String(1 - Math.min(1, hooks.reveal)))
      // Phone landed: the real welcome prototype takes over right away (no blank phone, no wait).
      if (hooks.reveal > 0.98 && !landed) {
        landed = true
        hooks.landed = true
        document.documentElement.dataset.introLanded = ''
      }
      if (T >= total) finish()
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    // Skip forward only: scrolling down, a tap, or a key other than the replay keys.
    const skip = () => finish()
    const wheelSkip = (e: WheelEvent) => e.deltaY > 0 && finish()
    const started = performance.now()
    const keySkip = () => performance.now() - started > 400 && finish()
    window.addEventListener('wheel', wheelSkip, { passive: true })
    window.addEventListener('touchstart', skip, { passive: true })
    window.addEventListener('keydown', keySkip)
    return () => {
      cancelAnimationFrame(raf)
      hooks.page = false
      delete document.documentElement.dataset.introLock
      window.removeEventListener('resize', fit)
      window.removeEventListener('wheel', wheelSkip)
      window.removeEventListener('touchstart', skip)
      window.removeEventListener('keydown', keySkip)
    }
    // Re-run on replay; live dial changes are read through tRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, run])

  if (!enabled) return null
  return <canvas key={run} ref={canvasRef} className="unwind-intro" aria-hidden="true" />
}
