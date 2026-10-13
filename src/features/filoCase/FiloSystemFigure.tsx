import { useEffect, useRef, useState } from 'react'
import { FiloMark } from './FiloPhone'
import './filoSystem.css'

type NodeId = 'tag' | 'phone' | 'filo' | 'suppliers' | 'labs' | 'factory'

const NODES: { id: NodeId; cx: number; cy: number; r: number; label: string }[] = [
  { id: 'tag', cx: 190, cy: 140, r: 58, label: 'Swatch tag' },
  { id: 'phone', cx: 850, cy: 140, r: 58, label: 'Phone' },
  { id: 'filo', cx: 520, cy: 404, r: 76, label: 'Filo' },
  { id: 'suppliers', cx: 250, cy: 664, r: 50, label: 'Suppliers' },
  { id: 'labs', cx: 520, cy: 698, r: 50, label: 'Labs' },
  { id: 'factory', cx: 790, cy: 664, r: 50, label: 'Factory' },
]

/** Nodes lit during each step of the walkthrough (1-indexed, matches STEPS below). */
const STEP_NODES: Record<number, NodeId[]> = {
  1: ['tag', 'phone'],
  2: ['phone', 'filo'],
  3: ['filo', 'suppliers', 'labs', 'factory'],
  4: ['suppliers', 'labs', 'factory', 'filo'],
  5: ['filo', 'phone'],
}

const TAG_ICON = 'M-7,-8 h10 a4,4 0 0 1 4,4 v10 a4,4 0 0 1 -4,4 h-10 a4,4 0 0 1 -4,-4 v-10 a4,4 0 0 1 4,-4 Z M0,-4 a1.8,1.8 0 1 0 0.01,0'
const PHONE_ICON = 'M-6,-10 h12 a2,2 0 0 1 2,2 v16 a2,2 0 0 1 -2,2 h-12 a2,2 0 0 1 -2,-2 v-16 a2,2 0 0 1 2,-2 Z M-2.5,7 h5'
const CRATE_ICON = 'M-9,-6 h18 v13 h-18 Z M-9,0 h18 M0,-6 v13'
const FLASK_ICON = 'M-3,-9 h6 v4.5 l5.2,10.3 a2,2 0 0 1 -1.8,2.9 h-12.8 a2,2 0 0 1 -1.8,-2.9 l5.2,-10.3 Z M-4.2,-2.5 h8.4'
const FACTORY_ICON = 'M-10,8 v-9 l4,3.4 v-3.4 l4,3.4 v-5.4 l4,4 v7 Z M4,-3 h2.4 v-4 h-2.4 Z'

const NODE_ICONS: Record<Exclude<NodeId, 'filo'>, string> = {
  tag: TAG_ICON,
  phone: PHONE_ICON,
  suppliers: CRATE_ICON,
  labs: FLASK_ICON,
  factory: FACTORY_ICON,
}

/** Edge labels; icons share a single small glyph set (nfc / check / send / reply / flag). */
const EDGE_ICONS: Record<string, string> = {
  nfc: 'M-5,2 a5,5 0 0 1 10,0 M-2.4,2 a2.4,2.4 0 0 1 4.8,0',
  check: 'M-4,0 l2.6,2.8 L5,-3',
  send: 'M-5,4 L5,-4 L1.6,5 L0,1 Z',
  reply: 'M4,-4 L-4,0 L4,4 M-4,0 h7',
  flag: 'M-4,5 V-5 L4,-2.3 L-4,0.3',
}

type EdgeLabel = { x: number; y: number; icon: keyof typeof EDGE_ICONS; text: string }

/* Each label gets its own lane, clear of every node halo, every node caption and every other label. */
const LABELS: Record<number, EdgeLabel> = {
  1: { x: 520, y: 92, icon: 'nfc', text: 'tap to open the file' },
  2: { x: 700, y: 280, icon: 'check', text: 'approvals + bench evidence' },
  3: { x: 345, y: 548, icon: 'send', text: 'quotes, lab bookings, factory brief' },
  4: { x: 700, y: 548, icon: 'reply', text: 'replies + lab reports' },
  5: { x: 700, y: 370, icon: 'flag', text: 'technical file, red flags' },
}

const STEP_COUNT = 5
const STEP_MS = 2100

/**
 * The system section's whole figure: how a tapped tag becomes a sourced Technical File.
 * A soft glass card with six nodes; one path lights at a time while the others fade.
 */
export function FiloSystemFigure() {
  const cardRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [step, setStep] = useState(1)

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible || reduced) return
    const id = setInterval(() => setStep((s) => (s % STEP_COUNT) + 1), STEP_MS)
    return () => clearInterval(id)
  }, [visible, reduced])

  const activeNodes = reduced ? NODES.map((n) => n.id) : STEP_NODES[step]

  return (
    <div ref={cardRef} className="case__figure filo-system" data-step={step} data-reduced={reduced || undefined}>
      <div className="filo-system__brand">
        <FiloMark size={24} />
        <span>filo</span>
      </div>
      <svg className="filo-system__diagram" viewBox="0 0 1040 800" aria-label="How Filo turns a tapped swatch tag into a sourced Technical File">
        <defs>
          <marker id="filo-sys-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 Z" fill="var(--filo-moss)" />
          </marker>
        </defs>

        {/* Edges — rendered first so nodes sit on top. */}
        <g className={`filo-edge filo-edge--1 ${step === 1 ? 'is-active' : ''} ${reduced ? 'is-settled' : ''}`}>
          <path d="M250,140 L792,140" markerEnd="url(#filo-sys-arrow)" />
        </g>
        <g className={`filo-edge filo-edge--2 ${step === 2 ? 'is-active' : ''} ${reduced ? 'is-settled' : ''}`}>
          <path d="M820,190 C730,245 660,290 575,335" markerEnd="url(#filo-sys-arrow)" />
        </g>
        <g className={`filo-edge filo-edge--5 is-reverse ${step === 5 ? 'is-active' : ''}`}>
          <path d="M820,190 C730,245 660,290 575,335" markerStart="url(#filo-sys-arrow)" />
        </g>
        <g className={`filo-edge filo-edge--3 ${step === 3 ? 'is-active' : ''} ${reduced ? 'is-settled' : ''}`}>
          <path className="filo-edge__trunk" d="M520,480 L520,556" />
          <path d="M520,556 Q400,556 270,620" markerEnd="url(#filo-sys-arrow)" />
          <path d="M520,556 L520,652" markerEnd="url(#filo-sys-arrow)" />
          <path d="M520,556 Q640,556 770,620" markerEnd="url(#filo-sys-arrow)" />
        </g>
        <g className={`filo-edge filo-edge--4 is-reverse ${step === 4 ? 'is-active' : ''}`}>
          <path className="filo-edge__trunk" d="M520,480 L520,556" markerStart="url(#filo-sys-arrow)" />
          <path d="M520,556 Q400,556 270,620" />
          <path d="M520,556 L520,652" />
          <path d="M520,556 Q640,556 770,620" />
        </g>

        {/* Edge annotations: one icon + label per step, each in its own lane. */}
        {Object.entries(LABELS).map(([key, l]) => (
          <g key={key} className={`filo-edge-label ${Number(key) === step ? 'is-active' : ''} ${reduced && Number(key) <= 3 ? 'is-settled' : ''}`} transform={`translate(${l.x},${l.y})`}>
            <circle r="10" />
            <path d={EDGE_ICONS[l.icon]} />
            <text x="16" y="4">{l.text}</text>
          </g>
        ))}

        {/* Nodes. */}
        {NODES.map((n) => (
          <g key={n.id} className={`filo-node filo-node--${n.id} ${activeNodes.includes(n.id) ? 'is-active' : ''}`}>
            <circle className="filo-node__halo" cx={n.cx} cy={n.cy} r={n.r + 14} />
            <circle className="filo-node__ring" cx={n.cx} cy={n.cy} r={n.r} />
            {n.id === 'filo' ? (
              <text className="filo-node__wordmark" x={n.cx} y={n.cy + 12}>filo</text>
            ) : (
              <path className="filo-node__icon" d={NODE_ICONS[n.id]} transform={`translate(${n.cx},${n.cy}) scale(${n.id === 'tag' || n.id === 'phone' ? 1.9 : 1.7})`} />
            )}
            <text className="filo-node__label" x={n.cx} y={n.cy + n.r + (n.id === 'labs' ? 22 : 24)}>{n.label}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}
