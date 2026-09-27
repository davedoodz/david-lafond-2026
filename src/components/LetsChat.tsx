/**
 * "Let's chat" pill (Paper components: outline → filled → collapses from the left
 * into a circle around the arrow, inspired by cosmos.so). Click nudges the arrow
 * right, then opens the visitor's mail app with a prefilled note.
 *
 *   hover in   0ms          fill white, text turns dark        (fill)
 *              delay        left edge sweeps right → circle    (collapse)
 *   hover out  0ms          circle re-expands to the pill      (expand)
 *              expand       fill fades back to outline
 *   click      0ms          arrow slides right by `nudge`
 *              openDelay    mailto: opens
 */
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import type { TransitionConfig } from 'dialkit'
import { mailtoUrl } from '../data/contact'
import { useTuning } from '../tuning/useTuning'
import { ArrowRightIcon } from './icons'
import './LetsChat.css'

const CONFIG = {
  label: { type: 'text' as const, default: 'Let’s chat' },
  email: {
    subject: { type: 'text' as const, default: 'Let’s chat — from your portfolio' },
    body: {
      type: 'text' as const,
      default:
        'Hi David,\n\nI just spent some time with your portfolio and would love to find a moment to chat.\n\nA little about me and what I have in mind:\n\n\nWould a quick call sometime next week work for you?\n\nBest,\n',
    },
  },
  motion: {
    fillMs: [160, 0, 800, 10] as [number, number, number, number],
    collapseDelayMs: [110, 0, 800, 10] as [number, number, number, number],
    collapse: { type: 'easing' as const, duration: 0.5, ease: [0.65, 0, 0.25, 1] as [number, number, number, number] },
    expand: { type: 'easing' as const, duration: 0.38, ease: [0.3, 0, 0.2, 1] as [number, number, number, number] },
  },
  click: {
    nudgePx: [7, 0, 24, 1] as [number, number, number, number],
    nudgeMs: [220, 60, 800, 10] as [number, number, number, number],
    openDelayMs: [260, 0, 1200, 10] as [number, number, number, number],
  },
}

function cssTransition(curve: TransitionConfig) {
  if (curve.type === 'easing') return { duration: `${curve.duration}s`, ease: `cubic-bezier(${curve.ease.join(',')})` }
  // A spring chosen in DialKit: approximate with its visual duration and a soft ease-out.
  return { duration: `${curve.visualDuration ?? 0.5}s`, ease: 'cubic-bezier(0.22, 1, 0.36, 1)' }
}

export function LetsChat() {
  const t = useTuning('Let’s chat', CONFIG)
  const [armed, setArmed] = useState(false)
  const [sending, setSending] = useState(false)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), [])

  const href = mailtoUrl(t.email.subject, t.email.body)
  const collapse = cssTransition(t.motion.collapse)
  const expand = cssTransition(t.motion.expand)

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    // Touch has no hover: play the collapse first so the arrow nudge still reads.
    const hasHover = window.matchMedia('(hover: hover)').matches
    const lead = hasHover ? 0 : t.motion.collapseDelayMs + parseFloat(collapse.duration) * 1000
    if (!hasHover) setArmed(true)
    timers.current.push(
      window.setTimeout(() => setSending(true), lead),
      window.setTimeout(() => {
        window.location.href = href
      }, lead + t.click.openDelayMs),
      window.setTimeout(() => {
        setSending(false)
        setArmed(false)
      }, lead + t.click.openDelayMs + t.click.nudgeMs + 400),
    )
  }

  const style = {
    '--chat-fill': `${t.motion.fillMs}ms`,
    '--chat-delay': `${t.motion.collapseDelayMs}ms`,
    '--chat-collapse': collapse.duration,
    '--chat-collapse-ease': collapse.ease,
    '--chat-expand': expand.duration,
    '--chat-expand-ease': expand.ease,
    '--chat-nudge': `${t.click.nudgePx}px`,
    '--chat-nudge-ms': `${t.click.nudgeMs}ms`,
  } as CSSProperties

  return (
    <a
      className={`chat${armed ? ' is-armed' : ''}${sending ? ' is-sending' : ''}`}
      href={href}
      onClick={onClick}
      style={style}
      data-no-ink
    >
      <span className="chat__body">
        <span className="chat__label">{t.label}</span>
        <ArrowRightIcon className="chat__arrow" />
      </span>
    </a>
  )
}
