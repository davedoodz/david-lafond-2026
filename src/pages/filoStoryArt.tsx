import type { CSSProperties } from 'react'
/**
 * Graphics for the Problem · Opportunity · Solution rows on the Filo case study.
 * Same language as the Momo story art: ink line work, one accent for what moves.
 * Accent marks carry `sa-b` (and `sa-draw` for strokes that draw in), so only they animate.
 * Problem and Solution share one track: swatch → spec → tests → scale → line review.
 */
const INK = '#171717'
const STONE = '#a6a09c'
const ACCENT = '#5f8a10'
const LIME = '#cdf56f'

const label = (x: number, y: number, t: string, fill = STONE, anchor: 'start' | 'middle' | 'end' = 'middle') => (
  <text x={x} y={y} fontSize={11} fill={fill} textAnchor={anchor} letterSpacing="0.02em">
    {t}
  </text>
)

const Y = 76
/** x of the line-review gate; its posts sit 10 px either side. */
const GATE = 204
const STOPS = [
  { x: 86, t: 'spec' },
  { x: 128, t: 'tests' },
  { x: 170, t: 'scale' },
]

/** A fabric swatch with a pinked (zig-zag) bottom edge. */
function Swatch({ x, y }: { x: number; y: number }) {
  const zig = Array.from({ length: 6 }, (_, i) => `L${x - 18 + i * 6 + 3} ${y + 18} L${x - 18 + (i + 1) * 6} ${y + 14}`).join(' ')
  return (
    <path
      d={`M${x - 18} ${y + 14} V${y - 16} H${x + 18} V${y + 14} ${zig}`}
      fill="#fff"
      stroke={INK}
      strokeWidth={1.6}
      strokeLinejoin="round"
    />
  )
}

/** The line review: a gate the material has to reach. */
function Gate({ x, y }: { x: number; y: number }) {
  return (
    <g fill="none" stroke={INK} strokeWidth={1.6} strokeLinecap="round">
      <path d={`M${x - 10} ${y + 18} V${y - 18} M${x + 10} ${y + 18} V${y - 18} M${x - 14} ${y - 18} H${x + 14}`} />
    </g>
  )
}

function Track() {
  return (
    <>
      <path d={`M52 ${Y} H${GATE - 10}`} stroke={STONE} strokeWidth={1} opacity={0.5} />
      <Swatch x={34} y={Y} />
      <Gate x={GATE} y={Y} />
      {label(34, Y + 44, 'swatch', INK)}
      {label(GATE, Y - 28, 'line review', INK)}
    </>
  )
}

/** Problem: the material starts down the track and stalls at the first unknown; polyester takes its slot. */
export function FiloProblemArt() {
  return (
    <svg viewBox="0 0 240 160" role="img" aria-label="A new material stalls at its first unknown and never reaches the line review">
      <Track />
      <path className="sa-b sa-draw" pathLength={1} d={`M52 ${Y} H80`} stroke={ACCENT} strokeWidth={2.4} strokeLinecap="round" />
      {STOPS.map((s, i) => (
        <g key={s.t}>
          <circle cx={s.x} cy={Y} r={7} fill="#fff" stroke={i === 0 ? ACCENT : STONE} strokeWidth={1.4} />
          <text x={s.x} y={Y + 4} fontSize={10} fill={i === 0 ? ACCENT : STONE} textAnchor="middle">
            ?
          </text>
          {label(s.x, Y - 16, s.t)}
        </g>
      ))}
      <path d={`M104 ${Y + 52} Q${GATE} ${Y + 52} ${GATE} ${Y + 24}`} fill="none" stroke={INK} strokeWidth={1.4} strokeDasharray="2 4" strokeLinecap="round" />
      {label(100, Y + 56, 'polyester instead', STONE, 'end')}
    </svg>
  )
}

/** Opportunity: one agent working across the parties a material has to pass through. */
export function FiloOpportunityArt() {
  const parties = [
    { x: 40, y: 34, t: 'suppliers' },
    { x: 200, y: 34, t: 'labs' },
    { x: 40, y: 128, t: 'factory' },
    { x: 200, y: 128, t: 'line review' },
  ]
  return (
    <svg viewBox="0 0 240 160" role="img" aria-label="An agent connects suppliers, labs, the factory and the line review">
      {parties.map((p, i) => (
        <g key={p.t}>
          <path
            className="sa-b sa-draw"
            pathLength={1}
            d={`M120 80 L${p.x} ${p.y}`}
            stroke={ACCENT}
            strokeWidth={1.8}
            strokeLinecap="round"
            style={{ '--i': i } as CSSProperties}
          />
          <rect x={p.x - 9} y={p.y - 9} width={18} height={18} rx={5} fill="#fff" stroke={INK} strokeWidth={1.4} />
          {label(p.x, p.y < 80 ? p.y - 16 : p.y + 26, p.t)}
        </g>
      ))}
      <circle className="sa-b sa-ping" cx={120} cy={80} r={18} fill={ACCENT} opacity={0.16} />
      <circle cx={120} cy={80} r={14} fill={LIME} stroke={INK} strokeWidth={1.4} />
      {/* The thread: Filo's mark. */}
      <path d="M113 84 C113 74 127 74 127 80 C127 86 117 86 117 80" fill="none" stroke={INK} strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  )
}

/** Solution: the same track, every unknown answered, the material reaches the line review. */
export function FiloSolutionArt() {
  return (
    <svg viewBox="0 0 240 160" role="img" aria-label="Every unknown is answered and the material reaches the line review with a go">
      <Track />
      <path className="sa-b sa-draw" pathLength={1} d={`M52 ${Y} H${GATE - 10}`} stroke={ACCENT} strokeWidth={2.4} strokeLinecap="round" />
      {STOPS.map((s) => (
        <g key={s.t}>
          <circle cx={s.x} cy={Y} r={7} fill={LIME} stroke={ACCENT} strokeWidth={1.4} />
          <path d={`M${s.x - 3} ${Y} l2 2.5 l4 -5`} fill="none" stroke={INK} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
          {label(s.x, Y - 16, s.t, INK)}
        </g>
      ))}
      <circle className="sa-b sa-ping" cx={GATE} cy={Y} r={10} fill={ACCENT} opacity={0.18} />
      <circle className="sa-b" cx={GATE} cy={Y} r={4.5} fill={ACCENT} />
      {label(GATE, Y + 44, 'go', ACCENT)}
    </svg>
  )
}
