import type { MouseEvent } from 'react'
import { GhostButton } from '../features/ghost/GhostButton'
import { RESUME_URL } from '../data/contact'
import { navigate, type Route } from '../lib/router'
import './Nav.css'

type Props = { route: Route }

function internalLink(route: Route) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    event.preventDefault()
    navigate(route)
  }
}

/** Contact lives in the footer, so the link goes all the way to the bottom of the page. */
function scrollToContact(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault()
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: document.documentElement.scrollHeight, behavior: reduce ? 'auto' : 'smooth' })
}

export function Nav({ route }: Props) {
  return (
    <header className="nav">
      <GhostButton className="nav__ghost" />
      <nav className="nav__links" aria-label="Primary">
        <a href="/" aria-current={route === 'work' ? 'page' : undefined} onClick={internalLink('work')}>
          Work
        </a>
        <a href="/about" aria-current={route === 'about' ? 'page' : undefined} onClick={internalLink('about')}>
          About
        </a>
        <a href={RESUME_URL} target="_blank" rel="noopener">
          Resume
        </a>
        <a href="#contact" onClick={scrollToContact}>
          Contact
        </a>
      </nav>
    </header>
  )
}
