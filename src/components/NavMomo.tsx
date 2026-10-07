/**
 * Momo in the nav, standing in for the Davebot ghost on the Momo page. Clicking it flies
 * Momo to the centre of the page over a veil, the way the ghost opens Davebot, but with no
 * chat box. Click anywhere or press Escape to send it back. Clip alignment and blend follow
 * the Momo card.
 */
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { animate, motion, useMotionValue, useReducedMotion, type Transition } from 'motion/react'
import { useTuning } from '../tuning/useTuning'
import { MOMO_MODES, Momo, type MomoMode } from './MomoCard'

type Tuple = [number, number, number, number]

/** The nav slot Momo sits in (px), shared with the ghost button. */
const SLOT = 36

const CONFIG = {
  /** awake, asleep, or animating between the two like the Momo card. */
  state: { type: 'select' as const, options: [...MOMO_MODES], default: 'both' },
  /** Clip height (px); the clip has empty margin around Momo, so this runs larger than the ghost. */
  size: [52, 20, 120, 1] as Tuple,
  x: [0, -40, 40, 0.5] as Tuple,
  y: [0, -40, 40, 0.5] as Tuple,
  zoom: {
    /** Momo's slot size at the centre of the page (px). */
    size: [200, 96, 420, 2] as Tuple,
    /** Moves the centred Momo off the page centre (px). */
    offsetY: [0, -200, 200, 1] as Tuple,
    veil: [0.55, 0, 1, 0.01] as Tuple,
    duration: [0.55, 0.15, 1.5, 0.01] as Tuple,
    bounce: [0.18, 0, 0.6, 0.01] as Tuple,
    _collapsed: true,
  },
}

export function NavMomo({ className }: { className?: string }) {
  const t = useTuning('Nav Momo', CONFIG)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState(false)
  const reduce = useReducedMotion()

  const toggle = () => setOpen((value) => !value)
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  useEffect(() => {
    if (open) setShown(true)
  }, [open])

  // Same proportions everywhere: the clip scales with the slot it sits in.
  const momo = (slot: number) => {
    const k = slot / SLOT
    return <Momo mode={t.state as MomoMode} size={`${t.size * k}px`} x={`${t.x * k}px`} y={`${t.y * k}px`} />
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`nav-momo${className ? ` ${className}` : ''}`}
        style={{ visibility: shown ? 'hidden' : undefined }}
        onClick={toggle}
        aria-label="Show Momo"
        aria-expanded={open}
      >
        {momo(SLOT)}
      </button>
      {shown &&
        createPortal(
          <MomoZoom
            open={open}
            trigger={buttonRef.current}
            slot={t.zoom.size}
            offsetY={t.zoom.offsetY}
            veil={t.zoom.veil}
            transition={reduce ? { duration: 0 } : { type: 'spring', duration: t.zoom.duration, bounce: t.zoom.bounce }}
            onClose={() => setOpen(false)}
            onClosed={() => setShown(false)}
          >
            {momo(t.zoom.size)}
          </MomoZoom>,
          document.body,
        )}
    </>
  )
}

type ZoomProps = {
  open: boolean
  trigger: HTMLElement | null
  slot: number
  offsetY: number
  veil: number
  transition: Transition
  onClose: () => void
  onClosed: () => void
  children: React.ReactNode
}

/** The centred Momo: flies out of the nav slot and back into it (a FLIP on x/y/scale). */
function MomoZoom({ open, trigger, slot, offsetY, veil, transition, onClose, onClosed, children }: ZoomProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const scale = useMotionValue(1)
  const veilOpacity = useMotionValue(0)

  // Offset that puts the centred Momo exactly over the nav slot.
  const fromTrigger = () => {
    const wrap = wrapRef.current
    if (!trigger || !wrap) return { x: 0, y: 0, scale: 0 }
    const a = trigger.getBoundingClientRect()
    const b = wrap.getBoundingClientRect()
    const s = a.width / b.width
    return {
      x: a.left + a.width / 2 - (b.left + b.width / 2 - x.get()),
      y: a.top + a.height / 2 - (b.top + b.height / 2 - y.get()),
      scale: s,
    }
  }

  useLayoutEffect(() => {
    if (!open) return
    const start = fromTrigger()
    x.set(start.x)
    y.set(start.y)
    scale.set(start.scale)
    const runs = [animate(x, 0, transition), animate(y, 0, transition), animate(scale, 1, transition), animate(veilOpacity, veil, { duration: 0.3 })]
    return () => runs.forEach((run) => run.stop())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (open) return
    const end = fromTrigger()
    const runs = [animate(x, end.x, transition), animate(y, end.y, transition), animate(veilOpacity, 0, { duration: 0.3 })]
    const last = animate(scale, end.scale, transition)
    void last.then(onClosed)
    return () => [...runs, last].forEach((run) => run.stop())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <div className="momo-zoom" onClick={onClose} style={{ pointerEvents: open ? 'auto' : 'none' }}>
      <motion.div className="momo-zoom__veil" style={{ opacity: veilOpacity }} />
      <motion.div
        ref={wrapRef}
        className="momo-zoom__momo"
        style={{ width: slot, height: slot, marginTop: offsetY, x, y, scale } as unknown as CSSProperties}
      >
        {children}
      </motion.div>
    </div>
  )
}
