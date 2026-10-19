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
  /** Gap above the title. Larger pushes the CTA and footer down, so less of the white dome shows at the end of the page. */
  spacing: {
    topDesktop: [230, 0, 1000, 1] as [number, number, number, number],
    topMobile: [84, 0, 600, 1] as [number, number, number, number],
    /** "Let's chat" → footer. */
    bottomDesktop: [102, 0, 800, 1] as [number, number, number, number],
    bottomMobile: [27, 0, 600, 1] as [number, number, number, number],
  },
}

/**
 * The title as exactly two lines: split at a line break typed in the title, else at the word gap
 * nearest the middle (by characters). Each line keeps its words together (ContactCta.css).
 */
function twoLines(title: string): [string, string] {
  const typed = title.indexOf('\n')
  if (typed >= 0) return [title.slice(0, typed).trim(), title.slice(typed + 1).replace(/\n/g, ' ').trim()]
  const words = title.trim().split(/\s+/)
  let best = 1, bestDiff = Infinity
  for (let i = 1; i < words.length; i++) {
    const diff = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length)
    if (diff < bestDiff) [best, bestDiff] = [i, diff]
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')]
}

export function ContactCta() {
  const t = useTuning('Contact CTA', CONFIG)
  return (
    <section
      id="contact"
      className="cta column"
      data-fit-own
      data-align={t.align.text}
      style={
        {
          '--align-x': `${t.align.x}px`,
          '--cta-top-d': `${t.spacing.topDesktop}px`,
          '--cta-top-m': `${t.spacing.topMobile}px`,
          '--cta-bottom-d': `${t.spacing.bottomDesktop}px`,
          '--cta-bottom-m': `${t.spacing.bottomMobile}px`,
        } as CSSProperties
      }
      aria-labelledby="cta-title"
    >
      <h2 id="cta-title" className="cta__title" data-selectable>
        {twoLines(t.title).map((line, i) => (
          <span key={i} className="cta__line">{line}</span>
        ))}
      </h2>
      <p className="cta__subtitle" data-selectable>{t.subtitle}</p>
      <LetsChat />
    </section>
  )
}
