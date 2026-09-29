import type { MouseEvent } from 'react'
import { GhostButton } from '../features/ghost/GhostButton'
import { RESUME_URL } from '../data/contact'
import { ChevronLeftIcon } from './icons'
import { hasInAppHistory, navigate, type Route } from '../lib/router'
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

const PROJECT_ROUTES: Route[] = ['unwind', 'ecofabriq', 'harvard-mit']

/** Back to the work list: history when we came from it (restores the scroll), else the Work page. */
function goBack(event: MouseEvent<HTMLAnchorElement>) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
  event.preventDefault()
  if (hasInAppHistory()) window.history.back()
  else navigate('work')
}

/** "< Back" link. Case-study pages place it above their title; Nav shows it for pages without one. */
export function BackLink({ className = '' }: { className?: string }) {
  return (
    <a className={`nav__back ${className}`.trim()} href="/" onClick={goBack}>
      <ChevronLeftIcon className="nav__back-icon" />
      Back
    </a>
  )
}

export function Nav({ route }: Props) {
  const isProject = PROJECT_ROUTES.includes(route)
  return (
    <header className="nav">
      <div className="nav__start">
        <GhostButton className="nav__ghost" />
        {route === 'harvard-mit' && <BackLink />}
      </div>
      <nav className="nav__links" aria-label="Primary">
        <a href="/" aria-current={route === 'work' ? 'page' : isProject ? 'true' : undefined} onClick={internalLink('work')}>
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
