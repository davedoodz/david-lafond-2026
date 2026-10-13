import { useEffect, useRef, useState } from 'react'
import './filoNext.css'

const STOPS = [
  {
    when: 'Built · 2026',
    title: 'Scripted prototype',
    body: 'Four flows, the Technical File and the Scale Ladder. Supplier replies and ladder data are hand-modelled.',
    state: 'done',
  },
  {
    when: 'Next',
    title: 'One sample room, one supplier',
    body: 'Run a real sample with technical designers. Does a sourced file earn the approval? Does a supplier answer a brand’s agent?',
    state: 'next',
  },
  {
    when: 'Planned · Q4 2027',
    title: 'Digital Product Passport',
    body: 'The EU plans textile-specific DPP rules for Q4 2027. Filo’s Technical File could become their upstream evidence layer.',
    state: 'later',
  },
] as const

const QUESTIONS = [
  'Who owns the file when a brand moves on: the supplier or the brand?',
  'Does per-material pricing work for a brand that adopts one material a year?',
  'Will suppliers take requests from an agent instead of a person?',
]

/**
 * What's-next figure: one moss thread through three stops. Solid through what is built, dashed through
 * what is untested. Open questions sit below as the honest remainder. Draws once on first view;
 * `prefers-reduced-motion` shows the settled state (CSS).
 */
export function FiloNext() {
  const root = useRef<HTMLElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = root.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setInView(true), { threshold: 0.3 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={root} className="filo-next" data-inview={inView || undefined}>
      <ol className="filo-next__thread">
        {STOPS.map((s) => (
          <li key={s.title} className="filo-next__stop" data-state={s.state}>
            <span className="filo-next__knot" aria-hidden="true" />
            <p className="filo-next__when">{s.when}</p>
            <h3 className="filo-next__title">{s.title}</h3>
            <p className="filo-next__body">{s.body}</p>
          </li>
        ))}
      </ol>

      <div className="filo-next__questions">
        <p className="filo-next__label">Open questions</p>
        <ul>
          {QUESTIONS.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
