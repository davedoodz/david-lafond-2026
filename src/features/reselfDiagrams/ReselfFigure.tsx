import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useTuningController } from '../../tuning/useTuning'
import { productFlowSvg, signalsSvg, systemSvg, visionSvg, type SystemLook } from './diagrams'
import './reselfFigure.css'

type Tuple = [number, number, number, number]

/** Look presets for the system diagram; stroke/icon/label dials fine-tune on top. */
const LOOKS: Record<string, Pick<SystemLook, 'lines' | 'legend'>> = {
  'live flow': { lines: 'dotted', legend: false },
  'live flow + legend': { lines: 'dotted', legend: true },
  accent: { lines: 'solid', legend: true },
}

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
  system: {
    look: { type: 'select' as const, options: Object.keys(LOOKS), default: 'live flow' },
    /** march: AI dots travel along their lines · pulse: AI lines breathe in turn · off */
    preset: { type: 'select' as const, options: ['march', 'pulse', 'off'], default: 'march' },
    speed: [1, 0.3, 3, 0.05] as Tuple,
    stroke: [2.5, 1, 4, 0.25] as Tuple,
    icon: [3.4, 1.5, 6, 0.1] as Tuple,
    label: [16, 11, 20, 0.5] as Tuple,
    width: [100, 50, 130, 1] as Tuple,
    replay: { type: 'action' as const, label: 'Replay' },
  },
}

type FlowDials = { preset: string; speed: number; stagger: number; width: number }
type SystemDials = { look: string; preset: string; speed: number; stroke: number; icon: number; label: number; width: number }

/** Re:Self diagram for the Unwind case study. Animates only while on screen. */
export function ReselfFigure({ kind }: { kind: 'flow' | 'system' | 'vision' | 'signals' }) {
  const [run, setRun] = useState(0)
  const { values } = useTuningController('Re:Self diagrams', RESELF_DIAGRAM_CONFIG, {
    onAction: (action) => {
      if (action === `${kind}.replay`) setRun((n) => n + 1)
    },
  })
  const v = values as unknown as { flow: FlowDials; system: SystemDials }
  const d = kind === 'system' ? v.system : v.flow
  const sys = v.system
  const markup = useMemo(
    () =>
      kind === 'flow' ? productFlowSvg()
      : kind === 'vision' ? visionSvg()
      : kind === 'signals' ? signalsSvg()
      : systemSvg({ ...(LOOKS[sys.look] ?? LOOKS['live flow']), stroke: sys.stroke, icon: sys.icon, label: sys.label }),
    [kind, sys.look, sys.stroke, sys.icon, sys.label],
  )

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
          '--rf-stagger': `${kind === 'flow' ? v.flow.stagger : 0.3}s`,
          '--rf-width': `${d.width}%`,
          '--rf-period': `${-(sys.stroke * 5) * 4}px`,
          '--rf-dots': `0.1px ${sys.stroke * 5}px`,
        } as CSSProperties
      }
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  )
}
