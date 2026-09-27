import { useTuning } from '../tuning/useTuning'
import { LetsChat } from './LetsChat'
import './ContactCta.css'

const CONFIG = {
  title: { type: 'text' as const, default: 'What if we made something worth building together?' },
  subtitle: { type: 'text' as const, default: 'I promise you won’t regret it.' },
}

export function ContactCta() {
  const t = useTuning('Contact CTA', CONFIG)
  return (
    <section id="contact" className="cta column" aria-labelledby="cta-title">
      <h2 id="cta-title" className="cta__title">
        {t.title}
      </h2>
      <p className="cta__subtitle">{t.subtitle}</p>
      <LetsChat />
    </section>
  )
}
