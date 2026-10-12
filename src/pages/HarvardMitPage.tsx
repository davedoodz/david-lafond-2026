import { useLayoutEffect, useRef } from 'react'
import { ContactCta } from '../components/ContactCta'
import { BackLink, Nav } from '../components/Nav'
import { BookViewer } from '../features/book/BookViewer'
import { useFitColumn } from '../lib/useFitColumn'
import { useTuning } from '../tuning/useTuning'
import './HarvardMitPage.css'

const CONFIG = {
  /** Snap stops: page top (the book) and page end (contact + footer). */
  snap: { type: 'select' as const, options: ['off', 'proximity', 'mandatory'], default: 'off' },
}

/** Project page: the Harvard & MIT portfolio book on black, between the site header and footer. */
export function HarvardMitPage() {
  const mainRef = useRef<HTMLElement>(null)
  useFitColumn(mainRef)
  const { snap } = useTuning('Harvard & MIT page', CONFIG)

  // Snap lives on <html>; layout effect so it is gone in the same commit that swaps pages.
  useLayoutEffect(() => {
    if (snap === 'off') return
    const root = document.documentElement
    root.dataset.projectSnap = snap
    return () => {
      delete root.dataset.projectSnap
    }
  }, [snap])

  return (
    <main ref={mainRef} className="project" data-surface="dark">
      <Nav route="harvard-mit" />
      <BackLink className="project__back" />
      <h1 className="visually-hidden">The Design Portfolio that Got Me Into Harvard &amp; MIT</h1>
      <BookViewer />
      <ContactCta />
    </main>
  )
}
