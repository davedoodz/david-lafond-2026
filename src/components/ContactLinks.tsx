import type { CSSProperties } from 'react'
import { RESUME_URL, SOCIAL } from '../data/contact'
import { useTuning } from '../tuning/useTuning'
import { ArrowUpRightIcon } from './icons'
import './ContactLinks.css'

const CONFIG = {
  hoverColor: { type: 'color' as const, default: '#F5F5F5' },
  /** Icon nudge up (−) or down (+) against the label, in px. */
  icons: {
    arrowY: [0, -10, 10, 0.5] as [number, number, number, number],
  },
}

const LINKS = [
  { label: 'Resume', href: RESUME_URL },
  { label: 'LinkedIn', href: SOCIAL.linkedin },
  { label: 'Github', href: SOCIAL.github },
  { label: 'X', href: SOCIAL.x },
]

export function ContactLinks() {
  const t = useTuning('Footer links', CONFIG)

  const style = {
    '--link-hover': t.hoverColor,
    '--icon-arrow-y': `${t.icons.arrowY}px`,
  } as CSSProperties

  return (
    <ul className="contact-links" style={style}>
      {LINKS.map((link) => (
        <li key={link.label} className="contact-links__row">
          <a className="contact-links__link" href={link.href} target="_blank" rel="noopener noreferrer">
            {link.label}
            <ArrowUpRightIcon className="contact-links__icon" />
          </a>
        </li>
      ))}
    </ul>
  )
}
