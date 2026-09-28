import { useRef } from 'react'
import { ContactCta } from '../components/ContactCta'
import { Nav } from '../components/Nav'
import { BookViewer } from '../features/book/BookViewer'
import { useFitColumn } from '../lib/useFitColumn'

/** Project page: the Harvard & MIT portfolio book on black, between the site header and footer. */
export function HarvardMitPage() {
  const mainRef = useRef<HTMLElement>(null)
  useFitColumn(mainRef)
  return (
    <main ref={mainRef} className="project" data-surface="dark">
      <Nav route="harvard-mit" />
      <h1 className="visually-hidden">The Design Portfolio that Got Me Into Harvard &amp; MIT</h1>
      <BookViewer />
      <ContactCta />
    </main>
  )
}
