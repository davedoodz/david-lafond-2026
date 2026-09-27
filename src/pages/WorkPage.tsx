import { useRef, type CSSProperties } from 'react'
import { ContactCta } from '../components/ContactCta'
import { Nav } from '../components/Nav'
import { SelectedWorks } from '../components/SelectedWorks'
import { Signature } from '../features/signature/Signature'
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
  role: { type: 'text' as const, default: 'Architect & ex-MIT researcher\nnow focused on product design' },
  peekDesktop: [76, 0, 240, 1] as [number, number, number, number],
  peekMobile: [64, 0, 240, 1] as [number, number, number, number],
}

export function WorkPage() {
  const t = useTuning('Hero', CONFIG)
  const mainRef = useRef<HTMLElement>(null)
  useFitColumn(mainRef)
  return (
    <main ref={mainRef} className="work">
      <div
        className="landing"
        style={{ '--peek-d': `${t.peekDesktop}px`, '--peek-m': `${t.peekMobile}px` } as CSSProperties}
      >
        <Nav route="work" />
        <section className="hero column" aria-labelledby="hero-title">
          <h1 id="hero-title" className="hero__title">
            {t.headline} <em>{t.headlineEmphasis}</em>
          </h1>
          <p className="hero__intro">{t.intro}</p>
          <p className="hero__intro">{t.intro2}</p>
          <p className="hero__name">{t.name}</p>
          <p className="hero__role">{t.role}</p>
          <Signature className="hero__signature" />
        </section>
      </div>
      <SelectedWorks />
      <ContactCta />
    </main>
  )
}
