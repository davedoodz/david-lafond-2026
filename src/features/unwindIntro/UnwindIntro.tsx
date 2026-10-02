import { useEffect, useRef, useState } from 'react'
import { useTuningController } from '../../tuning/useTuning'
import { BANDS, CHAPTERS, G, SIZE, drawBraid, renderParts, sequence, setRT, type Part } from './introEngine'
import './unwindIntro.css'

type Tuple = [number, number, number, number]
const opts = (id: string) => CHAPTERS.find((c) => c.id === id)!.variants.map((v) => v.name)
const pickOf = (id: string, name: string) => Math.max(0, opts(id).indexOf(name))
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (v: number) => v * v * (3 - 2 * v)
const lerp = (a: number, b: number, p: number) => a + (b - a) * p

/**
 * Unwind case-study intro (designed in studio/unwind-intro-sections.html), as a real
 * screen-tall stage above the hero. The braided voice band lives on one fixed canvas:
 *   - on the stage (top of the page) it fills the screen and the story plays: the band wakes
 *     as someone talks → words link to past entries → the loop → the if-then plan;
 *   - on the hero it is small and keeps moving in the slot above the title (where the eyebrow was).
 * Scrolling between the two is physical: the band shrinks or zooms with the scroll position.
 * Scrolling up into the stage starts the story; scrolling back down never skips it, it keeps
 * playing (its words fade as the band shrinks). When it ends on the stage, the page glides
 * down to the hero. Reduced motion: no stage, no story.
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
  hero: {
    /** Width of the band above the title (px). */
    width: [360, 120, 900, 10] as Tuple,
    /** Height of the band's slot above the title (px); sets the space it takes. */
    slot: [48, 16, 200, 1] as Tuple,
    /** Nudge the band up (−) or down (+) within its slot (px). */
    y: [0, -100, 100, 1] as Tuple,
    /** How lively the idle band is (voice level, 0 = still). */
    energy: [0.15, 0, 1, 0.01] as Tuple,
  },
  /** Share of the way up the stage at which the story starts. */
  startAt: [0.35, 0.05, 0.95, 0.01] as Tuple,
  /** When the story ends while you're on the stage, glide down to the hero. */
  returnToHero: true,
  _collapsed: false,
}

const STORY = ['listen', 'connect', 'restructure', 'plan'] as const
/** Story → idle band crossfade after the last chapter (s). */
const SETTLE = 0.7

export function UnwindIntro({ onDone, onStart }: { onDone: () => void; onStart?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [reduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const { values: t } = useTuningController('Unwind intro', CONFIG, {
    onAction: (a) => {
      if (a === 'replay') window.scrollTo({ top: 0, behavior: 'smooth' })
    },
  })
  const tRef = useRef(t)
  tRef.current = t
  const cbRef = useRef({ onDone, onStart })
  cbRef.current = { onDone, onStart }
  const enabled = t.enabled && !reduced

  useEffect(() => {
    if (!enabled) cbRef.current.onDone()
  }, [enabled])

  // The slot above the title takes the band's height; the band itself is drawn on the canvas.
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--braid-slot-h', `${t.hero.slot}px`)
    window.dispatchEvent(new Event('resize'))
    return () => void root.style.removeProperty('--braid-slot-h')
  }, [t.hero.slot])

  useEffect(() => {
    if (!enabled) return
    const canvas = canvasRef.current!
    const stage = stageRef.current!
    const ctx = canvas.getContext('2d')!
    const root = document.documentElement
    const dpr = Math.min(2, window.devicePixelRatio || 1)

    // Layout, measured on resize/font load only (never per frame): stage height and the
    // document position of the band's slot above the hero title.
    let vw = 0, vh = 0, stageH = 1, slotDocY = 0
    const measure = () => {
      vw = window.innerWidth
      vh = window.innerHeight
      canvas.width = Math.round(vw * dpr)
      canvas.height = Math.round(vh * dpr)
      stageH = stage.offsetHeight || vh
      const slot = document.querySelector<HTMLElement>('.case__section--hero .case__braid-slot')?.getBoundingClientRect()
      slotDocY = slot ? slot.top + slot.height / 2 + window.scrollY : stageH + 120
      wake()
    }

    // Story state.
    let playing = false, clock = 0, total = 0, rt = 0, minGlow = 0
    let parts: Part[] = []
    // Re-armed once you're back on the hero, so each trip up the stage replays once.
    let armed = true
    const start = (fromBlank: boolean) => {
      const cur = tRef.current
      ;({ parts, total } = sequence(
        { listen: pickOf('listen', cur.listen), connect: pickOf('connect', cur.connect), restructure: pickOf('restructure', cur.restructure), plan: pickOf('plan', cur.plan) },
        [...STORY],
      ))
      playing = true
      armed = false
      clock = 0
      // The first open grows the band out of nothing; a replay starts from the band already on screen.
      minGlow = fromBlank ? 0 : 1
      cbRef.current.onStart?.()
    }

    const progress = () => 1 - clamp01(window.scrollY / stageH)

    let raf = 0, last = 0
    const frame = (now: number) => {
      raf = 0
      const s = tRef.current
      const dt = last ? Math.min(0.1, (now - last) / 1000) * s.speed : 0
      last = now
      rt += dt
      setRT(rt)
      G.band = s.band
      G.speed = s.drift

      const p = progress()
      if (p < 0.03) armed = true
      if (!playing && armed && p > s.startAt) start(false)
      if (playing) {
        clock += dt
        if (clock >= total + SETTLE) {
          playing = false
          cbRef.current.onDone()
          if (s.returnToHero && progress() > 0.5) window.scrollTo({ top: stageH, behavior: 'smooth' })
        }
      }

      // Scene transform: full-screen fit on the stage → small band in its slot above the hero title.
      const sFull = Math.min(vw / (vw < 700 ? 600 : SIZE.W), vh / SIZE.H)
      const full = [sFull, (vw - SIZE.W * sFull) / 2, (vh - SIZE.H * sFull) / 2]
      const half = ((BANDS[s.band] ?? BANDS.braid).width ?? 320) * 0.87
      const sSmall = Math.min(s.hero.width, vw * 0.72) / (2 * half)
      const ay = slotDocY - window.scrollY + s.hero.y
      const small = [sSmall, vw / 2 - 480 * sSmall, ay - 245 * sSmall]
      const k = smooth(p)
      const sc = lerp(small[0], full[0], k)
      const m: [number, number, number] = [sc * dpr, lerp(small[1], full[1], k) * dpr, lerp(small[2], full[2], k) * dpr]

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const visible = ay > -200 || p > 0
      if (visible) {
        // Words and marks belong to the full-screen story; they fade out as the band shrinks.
        const words = smooth(clamp01((p - 0.3) / 0.55))
        if (playing) {
          const settle = clamp01((clock - total) / SETTLE)
          renderParts(ctx, parts, Math.min(clock, total), m, { bg: false, alpha: words * (1 - settle), glowAlpha: 1 - settle, minGlow })
          if (settle > 0) drawBraid(ctx, m, { env: s.hero.energy, alpha: settle })
        } else drawBraid(ctx, m, { env: s.hero.energy })
      }
      root.toggleAttribute('data-unwind-stage', p > 0.5)

      // Keep drawing while the band is on screen or the story runs; otherwise sleep until a scroll.
      if (playing || visible) raf = requestAnimationFrame(frame)
      else last = 0
    }
    function wake() {
      if (!raf) raf = requestAnimationFrame(frame)
    }

    measure()
    // First open at the top of the page: the story plays from a blank stage.
    if (window.scrollY < 2) start(true)
    else cbRef.current.onDone()
    window.addEventListener('scroll', wake, { passive: true })
    window.addEventListener('resize', measure)
    void document.fonts.ready.then(measure)
    const ro = new ResizeObserver(measure)
    const hero = document.querySelector('.case__section--hero')
    if (hero) ro.observe(hero)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('scroll', wake)
      window.removeEventListener('resize', measure)
      root.removeAttribute('data-unwind-stage')
    }
  }, [enabled])

  if (!enabled) return null
  return (
    <>
      <div ref={stageRef} className="unwind-stage" aria-hidden="true" />
      <canvas ref={canvasRef} className="unwind-intro" aria-hidden="true" />
    </>
  )
}
