import { useRef, type CSSProperties } from 'react'
import { ContactCta } from '../components/ContactCta'
import { Nav } from '../components/Nav'
import { SelectedWorks } from '../components/SelectedWorks'
import { Signature } from '../features/signature/Signature'
import { useEntrance } from '../lib/useEntrance'
import { useFitColumn } from '../lib/useFitColumn'
import { useTuning } from '../tuning/useTuning'
import './WorkPage.css'

const CONFIG = {
  headline: { type: 'text' as const, default: 'Shaping' },
  headlineEmphasis: { type: 'text' as const, default: 'what’s next' },
  intro: {
    type: 'text' as const,
    default: 'I’ve led interdisciplinary creative teams – from global smart city projects to world-class research labs.',
  },
  intro2: {
    type: 'text' as const,
    default: 'Now, I’m bringing this experience to product design — where ideas can move faster and reach further.',
  },
  name: { type: 'text' as const, default: 'David Lafond' },
  role: { type: 'text' as const, default: 'Architect & ex-MIT UX researcher\nnow focused on product design' },
  /** Text block: left- or centre-aligned; `x` nudges it from the page centre (px). */
  align: {
    text: { type: 'select' as const, options: ['left', 'center'], default: 'left' },
    x: [0, -400, 400, 1] as [number, number, number, number],
  },
  peekDesktop: [40, 0, 240, 1] as [number, number, number, number],
  peekMobile: [28, 0, 240, 1] as [number, number, number, number],
}

export function WorkPage() {
  const t = useTuning('Hero', CONFIG)
  const mainRef = useRef<HTMLElement>(null)
  const entrance = useEntrance()
  useFitColumn(mainRef)
  return (
    <main ref={mainRef} className="work">
      <div
        className="landing"
        style={{ '--peek-d': `${t.peekDesktop}px`, '--peek-m': `${t.peekMobile}px` } as CSSProperties}
      >
        <Nav route="work" />
        <section
          className={`hero column ${entrance.className}`}
          data-align={t.align.text}
          style={{ ...entrance.style, '--align-x': `${t.align.x}px` } as CSSProperties}
          aria-labelledby="hero-title"
        >
          <h1 id="hero-title" className="hero__title" data-enter="0">
            {t.headline} <em>{t.headlineEmphasis}</em>
          </h1>
          <p className="hero__intro" data-enter="1">{t.intro}</p>
          <p className="hero__intro" data-enter="1">{t.intro2}</p>
          <p className="hero__name" data-enter="2">{t.name}</p>
          <p className="hero__role" data-enter="3">{t.role}</p>
          <Signature className="hero__signature" />
        </section>
      </div>
      <SelectedWorks />
      <ContactCta />
    </main>
  )
}
