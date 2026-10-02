/**
 * Filo-only case-study sections: the interview quote wall, the find → adopt reframe table and
 * the agent design rules. Each is one full-screen snap stop like the generic sections; all
 * copy is editable on the page in dev and autosaves to tuning.json.
 */
import type { CSSProperties } from 'react'
import { EditableText } from '../components/EditableText'
import './filoSections.css'

type Edit = (path: string) => (next: string) => void
const text = (d: string) => ({ type: 'text' as const, default: d })

const QUOTES = ['q1', 'q2', 'q3', 'q4'] as const
const ROWS = ['r1', 'r2', 'r3', 'r4'] as const
const RULES = ['p1', 'p2', 'p3', 'p4'] as const

export const EVIDENCE_DIALS = {
  eyebrow: text('Research'),
  title: text('11 interviews across the supply chain.'),
  body: text('Technical design, QA, merchandising, sustainability, manufacturing, material startups and a fashion innovation lab.'),
  q1: text('“Aggregating materials on a platform is not solving a problem for designers. Sourcing is part of the experience.”'),
  q1By: text('Startup mentor'),
  q2: text('“Our suppliers never worked with these materials: types of glue, reinforcement, heat can’t apply. You should have this as a technical file.”'),
  q2By: text('Creative director, vegan-leather label'),
  q3: text('“Even a new material takes a lot of testing. How does it sew up? What if it doesn’t dye right? A designer would rather stick with what they know.”'),
  q3By: text('Technical designer, apparel group'),
  q4: text('“They could mass-produce. They went bankrupt because it was pennies more than the normal material.”'),
  q4By: text('Industry advisor, on Renewcell'),
  note: text('Quotes condensed from interview notes.'),
  _collapsed: true,
}

export const REFRAME_DIALS = {
  eyebrow: text('The reframe'),
  title: text('From finding materials to adopting them.'),
  fromLabel: text('2024 · EcoFabriq'),
  toLabel: text('2026 · Filo'),
  r1Label: text('User'),
  r1From: text('A designer browsing for inspiration'),
  r1To: text('A technical designer shipping a style'),
  r2Label: text('Unit of value'),
  r2From: text('A material listing'),
  r2To: text('A technical file: how it sews, what it passed, how far it scales'),
  r3Label: text('Role of AI'),
  r3From: text('A chatbot that recommends'),
  r3To: text('An agent that acts, with approval'),
  r4Label: text('Who pays'),
  r4From: text('Designers or startups, and neither can'),
  r4To: text('The brand, from the sampling budget it already spends'),
  _collapsed: true,
}

export const PRINCIPLES_DIALS = {
  eyebrow: text('Agent design'),
  title: text('Filo proposes. People approve money and messages.'),
  p1Title: text('One approval per run'),
  p1Body: text('Not one per step. The budget you set is the boundary.'),
  p2Title: text('Never invents a value'),
  p2Body: text('Untested fields stay visibly empty until a lab report fills them.'),
  p3Title: text('Every claim has a source'),
  p3Body: text('A supplier reply, a lab report or a recipe, one tap away.'),
  p4Title: text('Flags before you ask'),
  p4Body: text('A conflict with your factory’s process shows up first, not at the fitting.'),
  _collapsed: true,
}

type Fields = Record<string, string>

function Head({ k, f, edit }: { k: string; f: Fields; edit: Edit }) {
  return (
    <header className="filo__head">
      <EditableText as="p" className="case__eyebrow eyebrow" label={`${k} eyebrow`} value={f.eyebrow} onChange={edit(`${k}.eyebrow`)} />
      <EditableText as="h2" id={`case-${k}`} className="case__title filo__title" label={`${k} title`} value={f.title} onChange={edit(`${k}.title`)} />
      {f.body !== undefined && <EditableText className="case__body" label={`${k} body`} value={f.body} onChange={edit(`${k}.body`)} />}
    </header>
  )
}

export function EvidenceSection({ f, edit }: { f: Fields; edit: Edit }) {
  return (
    <section className="case__section filo" data-section="evidence" data-layout="text" aria-labelledby="case-evidence">
      <Head k="evidence" f={f} edit={edit} />
      <ol className="filo__quotes">
        {QUOTES.map((q, i) => (
          <li key={q} style={{ '--i': i } as CSSProperties}>
            <EditableText as="p" className="filo__quote" label={`Quote ${i + 1}`} value={f[q]} onChange={edit(`evidence.${q}`)} />
            <EditableText as="p" className="filo__by eyebrow" label={`Quote ${i + 1} source`} value={f[`${q}By`]} onChange={edit(`evidence.${q}By`)} />
          </li>
        ))}
      </ol>
      <EditableText as="p" className="filo__note" label="Quotes note" value={f.note} onChange={edit('evidence.note')} />
    </section>
  )
}

export function ReframeSection({ f, edit }: { f: Fields; edit: Edit }) {
  return (
    <section className="case__section filo" data-section="reframe" data-layout="text" aria-labelledby="case-reframe">
      <Head k="reframe" f={f} edit={edit} />
      <table className="filo__reframe">
        <thead>
          <tr>
            <th scope="col" aria-label="Aspect" />
            <th scope="col">
              <EditableText as="span" className="eyebrow" label="From label" value={f.fromLabel} onChange={edit('reframe.fromLabel')} />
            </th>
            <th scope="col" className="filo__to">
              <EditableText as="span" className="eyebrow" label="To label" value={f.toLabel} onChange={edit('reframe.toLabel')} />
            </th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r, i) => (
            <tr key={r}>
              <th scope="row">
                <EditableText as="span" className="eyebrow" label={`Row ${i + 1} label`} value={f[`${r}Label`]} onChange={edit(`reframe.${r}Label`)} />
              </th>
              <td className="filo__from">
                <EditableText as="span" label={`Row ${i + 1} from`} value={f[`${r}From`]} onChange={edit(`reframe.${r}From`)} />
              </td>
              <td className="filo__to">
                <EditableText as="span" label={`Row ${i + 1} to`} value={f[`${r}To`]} onChange={edit(`reframe.${r}To`)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

export function PrinciplesSection({ f, edit }: { f: Fields; edit: Edit }) {
  return (
    <section className="case__section filo" data-section="principles" data-layout="text" aria-labelledby="case-principles">
      <Head k="principles" f={f} edit={edit} />
      <ol className="filo__rules">
        {RULES.map((p, i) => (
          <li key={p}>
            <span className="filo__step">{String(i + 1).padStart(2, '0')}</span>
            <EditableText as="h3" className="filo__rule-title" label={`Rule ${i + 1} title`} value={f[`${p}Title`]} onChange={edit(`principles.${p}Title`)} />
            <EditableText as="p" className="filo__rule-body" label={`Rule ${i + 1} body`} value={f[`${p}Body`]} onChange={edit(`principles.${p}Body`)} />
          </li>
        ))}
      </ol>
    </section>
  )
}

/** Where a prototype loop will go: a labelled block at the recording's desktop ratio. */
export function MediaPlaceholder({ label, size, x, y, radius }: { label: string; size: number; x: number; y: number; radius: number }) {
  return (
    <div
      className="case__media filo__placeholder"
      role="img"
      aria-label={`Placeholder: ${label}`}
      style={
        {
          '--media-h': `${size}svh`,
          '--media-x': `${x}%`,
          '--media-y': `${y}%`,
          '--media-radius': `${radius || 20}px`,
        } as CSSProperties
      }
    >
      <span className="filo__placeholder-dot" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
