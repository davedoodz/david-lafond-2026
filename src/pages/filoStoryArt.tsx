import { ArrowUpRight, Check, FileCheck2, FileQuestion, FileText, FlaskConical, Hand, Layers, Mail, Network, ShieldCheck, Tag, UserRound, Factory, type LucideIcon } from 'lucide-react'
import './filoStoryArt.css'

export const FILO_DIAGRAM_PRESETS = ['material thread', 'hub & spoke', 'evidence lanes', 'decision gates'] as const
type Kind = 'problem' | 'opportunity' | 'solution'
type Props = { preset?: string }
type Node = { label: string; Icon: LucideIcon }
const STORIES: Record<Kind, { title: string; center: Node; nodes: Node[]; outcome: string }> = {
  problem: { title: 'Material knowledge is scattered between people and documents.', center: { label: 'Designer', Icon: UserRound }, nodes: [{ label: 'Supplier', Icon: Mail }, { label: 'Unknowns', Icon: FileQuestion }, { label: 'Tests', Icon: FlaskConical }, { label: 'Factory', Icon: Factory }], outcome: 'Context gets lost' },
  opportunity: { title: 'One material thread connects the work; the designer approves decisions.', center: { label: 'Filo', Icon: Network }, nodes: [{ label: 'Material', Icon: Layers }, { label: 'Evidence', Icon: FlaskConical }, { label: 'Review', Icon: Hand }, { label: 'Decision', Icon: Check }], outcome: 'Prepare → approve' },
  solution: { title: 'Tap the tag to open a living Technical File with evidence and next actions.', center: { label: 'Technical File', Icon: FileText }, nodes: [{ label: 'Tap tag', Icon: Tag }, { label: 'Test', Icon: FlaskConical }, { label: 'Verify', Icon: ShieldCheck }, { label: 'Develop', Icon: FileCheck2 }], outcome: 'One material. One record.' },
}
function Glyph({ node, x, y, accent = false }: { node: Node; x: number; y: number; accent?: boolean }) {
  return <g className={accent ? 'fd-node fd-node--accent' : 'fd-node'}><rect x={x - 16} y={y - 16} width="32" height="32" rx="10" /><node.Icon x={x - 9} y={y - 9} width="18" height="18" strokeWidth={1.5} /><text x={x} y={y + 32} textAnchor="middle">{node.label}</text></g>
}
function Diagram({ kind, preset = 'material thread' }: Props & { kind: Kind }) {
  const s = STORIES[kind]
  const broken = kind === 'problem'
  return <svg className="filo-diagram" data-approach={preset} data-kind={kind} viewBox="0 0 280 180" role="img" aria-label={`${preset}: ${s.title}`}>
    {preset === 'hub & spoke' ? <>
      <circle className="fd-orbit" cx="140" cy="79" r="56" />
      {[[40, 34], [240, 34], [40, 124], [240, 124]].map(([x, y], i) => <g key={i}><path className={`fd-link ${broken ? 'fd-link--broken' : ''}`} d={`M${x} ${y} Q140 ${y} 140 79`} /><Glyph node={s.nodes[i]} x={x} y={y} /></g>)}
      <circle className="fd-center" cx="140" cy="79" r="28" /><s.center.Icon x="129" y="68" width="22" height="22" strokeWidth={1.5} /><text x="140" y="125" textAnchor="middle">{s.center.label}</text>
    </> : preset === 'evidence lanes' ? <>
      {s.nodes.slice(0, 3).map((n, i) => <g key={n.label}><line className="fd-rule" x1="12" y1={16 + i * 50} x2="268" y2={16 + i * 50} /><n.Icon x="18" y={28 + i * 50} width="18" height="18" strokeWidth={1.5} /><text x="47" y={40 + i * 50}>{n.label}</text><path className={`fd-link ${broken ? 'fd-link--broken' : ''}`} d={`M112 ${37 + i * 50} H190`} /><text className="fd-status" x="203" y={40 + i * 50}>{broken ? ['Claimed', 'Missing', 'Isolated'][i] : ['Captured', 'Reviewed', 'Linked'][i]}</text></g>)}
    </> : preset === 'decision gates' ? <>
      <path className="fd-link" d="M22 60 H254" />
      {s.nodes.map((n, i) => <g key={n.label}><path className={broken && i === 1 ? 'fd-gate fd-gate--blocked' : 'fd-gate'} d={`M${28 + i * 74} 36 l24 24 -24 24 -24 -24 Z`} /><n.Icon x={18 + i * 74} y="50" width="20" height="20" strokeWidth={1.5} /><text x={28 + i * 74} y="104" textAnchor="middle">{n.label}</text></g>)}
      <path className={`fd-link ${broken ? 'fd-link--broken' : ''}`} d="M102 84 V137 H240" /><text x="24" y="143">{broken ? 'Needs evidence' : 'Human approval'}</text><ArrowUpRight x="248" y="125" width="18" height="18" />
    </> : <>
      <path className={`fd-thread ${broken ? 'fd-link--broken' : ''}`} d="M30 54 C55 54 50 115 101 115 S164 54 180 54 S220 115 250 115" />
      {s.nodes.map((n, i) => <Glyph key={n.label} node={n} x={[30, 101, 180, 250][i]} y={[54, 115, 54, 115][i]} accent={!broken && i === 2} />)}
      {broken && <g className="fd-break"><path d="M130 79l8 8m0-8l-8 8" /><text x="145" y="32" textAnchor="middle">Disconnected</text></g>}
    </>}
    <text className="fd-caption" x="140" y="174" textAnchor="middle">{s.outcome}</text>
  </svg>
}
export function FiloProblemArt(props: Props) { return <Diagram kind="problem" {...props} /> }
export function FiloOpportunityArt(props: Props) { return <Diagram kind="opportunity" {...props} /> }
export function FiloSolutionArt(props: Props) { return <Diagram kind="solution" {...props} /> }
