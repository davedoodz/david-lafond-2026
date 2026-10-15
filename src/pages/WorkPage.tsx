import { useRef, type CSSProperties } from 'react'
import { ContactCta } from '../components/ContactCta'
import { Nav } from '../components/Nav'
import { SelectedWorks } from '../components/SelectedWorks'
import { WorkIntroStickers } from '../features/workStickers/WorkIntroStickers'
import { Signature } from '../features/signature/Signature'
import { useEntrance } from '../lib/useEntrance'
import { useFitColumn } from '../lib/useFitColumn'
import { useTuning } from '../tuning/useTuning'
import './WorkPage.css'

const CONFIG = {
  headlineLead: { type: 'text' as const, default: 'I’m' },
  headlineName: { type: 'text' as const, default: 'David Lafond' },
  headlineTagline: { type: 'text' as const, default: 'a product designer.' },
  /** Name lives in the headline; this line sits directly above the signature. */
  role: { type: 'text' as const, default: 'Architect & ex-MIT UX researcher\nnow focused on product design' },
  /** Text block: left- or centre-aligned; `x` / `xMobile` nudge it from the page centre (px). */
  align: {
    text: { type: 'select' as const, options: ['left', 'center'], default: 'left' },
    x: [0, -400, 400, 1] as [number, number, number, number],
    xMobile: [0, -200, 200, 1] as [number, number, number, number],
  },
  /** Vertical gaps between the hero text elements (px). */
  spacing: {
    titleToIntroDesktop: [30, 0, 200, 1] as [number, number, number, number],
    introToIntroDesktop: [24, 0, 200, 1] as [number, number, number, number],
    introToRoleDesktop: [42, 0, 200, 1] as [number, number, number, number],
    roleToSignatureDesktop: [21, -40, 200, 1] as [number, number, number, number],
    titleToIntroMobile: [19, 0, 160, 1] as [number, number, number, number],
    introToIntroMobile: [17, 0, 160, 1] as [number, number, number, number],
    introToRoleMobile: [40, 0, 160, 1] as [number, number, number, number],
    roleToSignatureMobile: [19, -40, 160, 1] as [number, number, number, number],
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
          style={
            {
              ...entrance.style,
              '--align-x': `${t.align.x}px`,
              '--align-x-m': `${t.align.xMobile}px`,
              '--gap-title-intro-d': `${t.spacing.titleToIntroDesktop}px`,
              '--gap-intro-intro-d': `${t.spacing.introToIntroDesktop}px`,
              '--gap-intro-role-d': `${t.spacing.introToRoleDesktop}px`,
              '--gap-role-sig-d': `${t.spacing.roleToSignatureDesktop}px`,
              '--gap-title-intro-m': `${t.spacing.titleToIntroMobile}px`,
              '--gap-intro-intro-m': `${t.spacing.introToIntroMobile}px`,
              '--gap-intro-role-m': `${t.spacing.introToRoleMobile}px`,
              '--gap-role-sig-m': `${t.spacing.roleToSignatureMobile}px`,
            } as CSSProperties
          }
          aria-labelledby="hero-title"
        >
          <h1 id="hero-title" className="hero__title" data-enter="0" data-selectable>
            {t.headlineLead} <em>{t.headlineName}</em>,
            <br />
            <span className="hero__tagline">{t.headlineTagline}</span>
          </h1>
          <WorkIntroStickers />
          <p className="hero__role" data-enter="2" data-selectable>{t.role}</p>
          <Signature className="hero__signature" />
        </section>
      </div>
      <SelectedWorks />
      <ContactCta />
    </main>
  )
}
