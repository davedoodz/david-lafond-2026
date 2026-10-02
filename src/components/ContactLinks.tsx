import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { EMAIL, SOCIAL } from '../data/contact'
import { useTuning } from '../tuning/useTuning'
import { ArrowUpRightIcon, CheckIcon, CopyIcon } from './icons'
import './ContactLinks.css'

const CONFIG = {
  hoverColor: { type: 'color' as const, default: '#F5F5F5' },
  /** Icon nudge up (−) or down (+) against the label, in px. */
  icons: {
    copyY: [0, -10, 10, 0.5] as [number, number, number, number],
    arrowY: [0, -10, 10, 0.5] as [number, number, number, number],
  },
  toast: {
    text: { type: 'text' as const, default: 'saved to clipboard' },
    /** Distance from the bottom of the window (px); centred horizontally. */
    bottom: [32, 0, 400, 1] as [number, number, number, number],
    holdMs: [2200, 600, 6000, 100] as [number, number, number, number],
    rise: [8, 0, 24, 1] as [number, number, number, number],
    fadeIn: [0.28, 0.05, 1, 0.01] as [number, number, number, number],
    fadeOut: [0.32, 0.05, 1, 0.01] as [number, number, number, number],
  },
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Older Safari / insecure origins: fall back to a hidden selection copy.
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.cssText = 'position:fixed;opacity:0;pointer-events:none'
    document.body.append(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  }
}

const LINKS = [
  { label: 'LinkedIn', href: SOCIAL.linkedin },
  { label: 'Github', href: SOCIAL.github },
  { label: 'X', href: SOCIAL.x },
]

export function ContactLinks() {
  const t = useTuning('Footer links', CONFIG)
  const [visible, setVisible] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const onCopy = async () => {
    if (!(await copyText(EMAIL))) return
    window.clearTimeout(timer.current)
    setVisible(true)
    timer.current = window.setTimeout(() => setVisible(false), t.toast.holdMs)
  }

  const style = {
    '--link-hover': t.hoverColor,
    '--icon-copy-y': `${t.icons.copyY}px`,
    '--icon-arrow-y': `${t.icons.arrowY}px`,
    '--toast-rise': `${t.toast.rise}px`,
    '--toast-in': `${t.toast.fadeIn}s`,
    '--toast-out': `${t.toast.fadeOut}s`,
  } as CSSProperties

  const toastStyle = {
    '--link-hover': t.hoverColor,
    '--toast-bottom': `${t.toast.bottom}px`,
    '--toast-rise': `${t.toast.rise}px`,
    '--toast-in': `${t.toast.fadeIn}s`,
    '--toast-out': `${t.toast.fadeOut}s`,
  } as CSSProperties

  return (
    <ul className="contact-links" style={style}>
      <li className="contact-links__row">
        <button type="button" className="contact-links__link" onClick={onCopy} aria-label={`Copy email address ${EMAIL}`}>
          Email
          <CopyIcon className="contact-links__icon contact-links__icon--copy" />
        </button>
        {/* Portaled to <body> so it sits centred at the bottom of the window, never clipped or
            offset by the footer's layout. Always mounted: CSS runs in (rise up) and out (sink). */}
        {createPortal(
          <span className="contact-links__toast" style={toastStyle} data-visible={visible} aria-hidden={!visible}>
            {t.toast.text}
            <CheckIcon className="contact-links__check" />
          </span>,
          document.body,
        )}
        <span className="visually-hidden" role="status">
          {visible ? 'Email address copied to clipboard' : ''}
        </span>
      </li>
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
