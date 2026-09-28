import type { CSSProperties } from 'react'
import { useTuning } from '../tuning/useTuning'
import { LetsChat } from './LetsChat'
import './ContactCta.css'

const CONFIG = {
  title: { type: 'text' as const, default: 'What if we made something worth building together?' },
  subtitle: { type: 'text' as const, default: 'I promise you won’t regret it.' },
  /** Text block: left- or centre-aligned; `x` nudges it from the page centre (px). */
  align: {
    text: { type: 'select' as const, options: ['left', 'center'], default: 'left' },
    x: [0, -400, 400, 1] as [number, number, number, number],
  },
}

export function ContactCta() {
  const t = useTuning('Contact CTA', CONFIG)
  return (
    <section
      id="contact"
      className="cta column"
      data-align={t.align.text}
      style={{ '--align-x': `${t.align.x}px` } as CSSProperties}
      aria-labelledby="cta-title"
    >
      <h2 id="cta-title" className="cta__title">
        {t.title}
      </h2>
      <p className="cta__subtitle">{t.subtitle}</p>
      <LetsChat />
    </section>
  )
}
