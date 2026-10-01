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

export function UnwindIntro({ onDone }: { onDone: () => void }) {
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

  useEffect(() => {
    if (!enabled) onDone()
    // onDone is stable enough for this one-shot signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  useLayoutEffect(() => {
    if (!enabled) return
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
    const skip = () => finish()
    window.addEventListener('wheel', skip, { passive: true })
    window.addEventListener('touchstart', skip, { passive: true })
    window.addEventListener('keydown', skip)
    return () => {
      cancelAnimationFrame(raf)
      hooks.page = false
      delete document.documentElement.dataset.introLock
      window.removeEventListener('resize', fit)
      window.removeEventListener('wheel', skip)
      window.removeEventListener('touchstart', skip)
      window.removeEventListener('keydown', skip)
    }
    // Re-run on replay; live dial changes are read through tRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, run])

  if (!enabled) return null
  return <canvas key={run} ref={canvasRef} className="unwind-intro" aria-hidden="true" />
}
