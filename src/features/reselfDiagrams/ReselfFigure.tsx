import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useTuningController } from '../../tuning/useTuning'
import { productFlowSvg, signalsSvg, visionSvg } from './diagrams'
import './reselfFigure.css'

type Tuple = [number, number, number, number]

/** Only Unwind-blue elements animate; ink stays still. */
export const RESELF_DIAGRAM_CONFIG = {
  flow: {
    /** trace: pulses draw across the screens · flow: loop line moves, dots ping · pulse: blue marks breathe · glow: blue fades in a wave */
    preset: { type: 'select' as const, options: ['trace', 'flow', 'pulse', 'glow', 'off'], default: 'trace' },
    speed: [1, 0.3, 3, 0.05] as Tuple,
    /** Delay between the five steps (s). */
    stagger: [0.35, 0, 1.5, 0.05] as Tuple,
    /** Diagram width, % of the content column. */
    width: [100, 50, 130, 1] as Tuple,
    replay: { type: 'action' as const, label: 'Replay' },
  },
}

type FlowDials = { preset: string; speed: number; stagger: number; width: number }

/** Re:Self diagram for the Unwind case study. Animates only while on screen. */
export function ReselfFigure({ kind }: { kind: 'flow' | 'vision' | 'signals' }) {
  const [run, setRun] = useState(0)
  const { values } = useTuningController('Re:Self diagrams', RESELF_DIAGRAM_CONFIG, {
    onAction: (action) => {
      if (action === `${kind}.replay`) setRun((n) => n + 1)
    },
  })
  // useTuningController types values loosely; RESELF_DIAGRAM_CONFIG above fixes their shape.
  const dials = values as unknown as { flow: FlowDials }
  const d = dials.flow
  const markup = useMemo(() => (kind === 'flow' ? productFlowSvg() : kind === 'vision' ? visionSvg() : signalsSvg()), [kind])

  const ref = useRef<HTMLDivElement>(null)
  const [live, setLive] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setLive(entry.isIntersecting), { threshold: 0.3 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      key={run}
      className="case__figure reself-figure"
      data-kind={kind}
      data-anim={d.preset}
      data-live={live || undefined}
      style={
        {
          '--rf-speed': d.speed,
          '--rf-stagger': `${kind === 'flow' ? d.stagger : 0.3}s`,
          '--rf-width': `${d.width}%`,
        } as CSSProperties
      }
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  )
}
