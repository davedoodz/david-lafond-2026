import { useEffect, useRef } from 'react'
import { useTuning } from '../../tuning/useTuning'
import './filoPersonaLoop.css'

type Tuple = [number, number, number, number]

const W = 1352
const H = 948
/** Keyed by scripts/key-filo-persona.py: transparent, one shared crop. */
const SCENES = [1, 2, 3, 4, 5].map((n) => `/work/filo/studio/persona-desk-${n}.webp`)

const PRESETS = ['Cross dissolve', 'Smooth dissolve', 'Additive dissolve', 'Dip to page', 'Blur dissolve', 'Cut'] as const
type Preset = (typeof PRESETS)[number]

const CONFIG = {
  /** How one scene becomes the next. */
  transition: { type: 'select' as const, options: [...PRESETS], default: 'Cross dissolve' },
  /** Playback speed: 2 plays the whole loop twice as fast (hold and transition), 0.5 half as fast. */
  speed: [1, 0.25, 3, 0.05] as Tuple,
  /** Time each scene rests before the transition starts (s). */
  hold: [1.5, 0.3, 6, 0.05] as Tuple,
  /** Transition length (s). Cut ignores it. */
  fade: [0.27, 0.05, 1.5, 0.01] as Tuple,
  /** Blur dissolve only: blur at the midpoint (px on screen). */
  blur: [6, 0, 30, 0.5] as Tuple,
}

/**
 * Outgoing and incoming weights at progress `t` (0 → 1). The canvas adds the two premultiplied
 * images ('lighter'), so weights summing to 1 are an exact mix of colour and transparency.
 */
function weights(preset: Preset, t: number): [number, number] {
  switch (preset) {
    case 'Smooth dissolve': {
      const s = t * t * (3 - 2 * t)
      return [1 - s, s]
    }
    // Both scenes reach full strength mid-way, so the overlap brightens, like Premiere's Additive Dissolve.
    case 'Additive dissolve':
      return [Math.min(1, 2 * (1 - t)), Math.min(1, 2 * t)]
    // The outgoing scene clears in the first half, the incoming one appears in the second: the page shows between.
    case 'Dip to page':
      return [Math.max(0, 1 - 2 * t), Math.max(0, 2 * t - 1)]
    default:
      return [1 - t, t]
  }
}

/**
 * Filo persona visual: the technical designer at her desk, cycling through five poses. The still is
 * scene 1, so first paint and reduced motion show the frame the loop starts on.
 */
export function FiloPersonaLoop({ alt }: { alt: string }) {
  const dials = useTuning('Filo persona loop', CONFIG)
  const dialsRef = useRef(dials)
  dialsRef.current = dials
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  /** Set by a dial change: jump to just before the next transition so the change shows at once. */
  const previewRef = useRef(false)

  const dialKey = `${dials.transition}|${dials.speed}|${dials.hold}|${dials.fade}|${dials.blur}`
  const firstKey = useRef(dialKey)
  useEffect(() => {
    if (dialKey !== firstKey.current) previewRef.current = true
  }, [dialKey])

  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!host || !canvas || !ctx) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const canFilter = typeof ctx.filter === 'string'
    const images = SCENES.map((src) => {
      const image = new Image()
      image.src = src
      return image
    })

    let scene = 0
    let sceneStart = 0
    let drawn = ''
    let frame = 0
    let visible = false
    let ready = false
    let cancelled = false

    const draw = (now: number) => {
      const { transition, speed, hold: holdS, fade: fadeS, blur } = dialsRef.current
      const preset = transition as Preset
      const hold = (holdS * 1000) / speed
      const fade = preset === 'Cut' ? 0 : (fadeS * 1000) / speed
      if (previewRef.current) {
        previewRef.current = false
        sceneStart = now - Math.max(0, hold - 400)
        drawn = ''
      }
      while (now - sceneStart >= hold + fade) {
        sceneStart += hold + fade
        scene = (scene + 1) % SCENES.length
      }
      const elapsed = now - sceneStart
      const t = fade > 0 && elapsed > hold ? (elapsed - hold) / fade : 0
      const state = `${scene}:${t}`
      if (state === drawn) return
      drawn = state
      const [outgoing, incoming] = t > 0 ? weights(preset, t) : [1, 0]
      const blurPx = preset === 'Blur dissolve' && canFilter ? blur * Math.sin(Math.PI * t) * (W / canvas.clientWidth) : 0
      ctx.clearRect(0, 0, W, H)
      ctx.globalCompositeOperation = 'lighter'
      if (canFilter) ctx.filter = blurPx > 0.01 ? `blur(${blurPx}px)` : 'none'
      if (outgoing > 0) {
        ctx.globalAlpha = outgoing
        ctx.drawImage(images[scene], 0, 0, W, H)
      }
      if (incoming > 0) {
        ctx.globalAlpha = incoming
        ctx.drawImage(images[(scene + 1) % SCENES.length], 0, 0, W, H)
      }
    }
    const tick = (now: number) => {
      draw(now)
      frame = requestAnimationFrame(tick)
    }
    const run = () => {
      if (!ready || !visible || frame) return
      // Resume where it stopped: restart the current scene's hold.
      sceneStart = performance.now()
      drawn = ''
      frame = requestAnimationFrame(tick)
    }
    const stop = () => {
      cancelAnimationFrame(frame)
      frame = 0
    }

    // Start only once every scene is decoded, so no transition ever waits on a load.
    void Promise.all(images.map((image) => image.decode())).then(
      () => {
        if (cancelled) return
        ready = true
        sceneStart = performance.now()
        draw(sceneStart)
        host.dataset.ready = ''
        run()
      },
      () => {},
    )
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) run()
      else stop()
    })
    observer.observe(host)
    return () => {
      cancelled = true
      observer.disconnect()
      stop()
    }
  }, [])

  return (
    <div ref={hostRef} className="persona__photo filo-persona-loop" role="img" aria-label={alt}>
      <img className="filo-persona-loop__still" src={SCENES[0]} alt="" width={W} height={H} decoding="async" />
      <canvas ref={canvasRef} className="filo-persona-loop__canvas" width={W} height={H} aria-hidden="true" />
    </div>
  )
}
