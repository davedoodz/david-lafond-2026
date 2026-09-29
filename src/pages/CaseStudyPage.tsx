import { useRef } from 'react'
import { ContactCta } from '../components/ContactCta'
import { Footer } from '../components/Footer'
import { Nav } from '../components/Nav'
import { WORKS, type Work } from '../data/works'
import { useFitColumn } from '../lib/useFitColumn'
import './CaseStudyPage.css'

type Props = { id: Extract<Work['id'], 'unwind' | 'ecofabriq'> }

/**
 * Case-study page for Unwind and EcoFabriq: white like About (nav and title on
 * paper), with the dark contact + footer sheet at the bottom.
 */
export function CaseStudyPage({ id }: Props) {
  const mainRef = useRef<HTMLElement>(null)
  useFitColumn(mainRef)
  const work = WORKS.find((w) => w.id === id)!
  return (
    <main ref={mainRef} className="case" data-work={id}>
      <div className="case__light" data-surface="light">
        <Nav route={id} />
        <header className="case__intro column">
          <h1 className="case__title">{work.title}</h1>
        </header>
      </div>
      <div className="case__dark" data-surface="dark">
        <ContactCta />
        <Footer />
      </div>
    </main>
  )
}
