/**
 * "Let's chat" pill. Hover only tints it gray; the click plays the whole move
 * (fill → collapse from the left into a circle around the arrow, inspired by
 * cosmos.so → arrow slides right), and the visitor's mail app opens once the
 * arrow has arrived.
 *
 *   hover      0ms                       gray fill                          (hover)
 *   click      0ms                       fill white, text turns dark        (fill)
 *              delay                     left edge sweeps right → circle    (collapse)
 *              delay+collapse            arrow slides right by `nudge`      (nudge)
 *              …+nudge+openDelay         mailto: opens
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
  /** Hover (and keyboard focus) fill. */
  hover: {
    fill: { type: 'color' as const, default: '#3a3a3a' },
    border: { type: 'color' as const, default: '#f5f5f5' },
    text: { type: 'color' as const, default: '#f5f5f5' },
  },
  motion: {
    fillMs: [160, 0, 800, 10] as [number, number, number, number],
    collapseDelayMs: [110, 0, 800, 10] as [number, number, number, number],
    collapse: { type: 'easing' as const, duration: 0.5, ease: [0.65, 0, 0.25, 1] as [number, number, number, number] },
    expand: { type: 'easing' as const, duration: 0.38, ease: [0.3, 0, 0.2, 1] as [number, number, number, number] },
  },
  click: {
    nudgePx: [7, 0, 40, 1] as [number, number, number, number],
    nudgeMs: [220, 60, 800, 10] as [number, number, number, number],
    /** Pause after the arrow arrives, before the mail app opens. */
    openDelayMs: [0, 0, 1200, 10] as [number, number, number, number],
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
    if (armed) return
    // Circle first, then the arrow; the mail app opens once the arrow has arrived.
    setArmed(true)
    const circleMs = t.motion.collapseDelayMs + parseFloat(collapse.duration) * 1000
    const openAt = circleMs + t.click.nudgeMs + t.click.openDelayMs
    timers.current.push(
      window.setTimeout(() => setSending(true), circleMs),
      window.setTimeout(() => {
        window.location.href = href
      }, openAt),
      window.setTimeout(() => {
        setSending(false)
        setArmed(false)
      }, openAt + 600),
    )
  }

  const style = {
    '--chat-fill': `${t.motion.fillMs}ms`,
    '--chat-hover-fill': t.hover.fill,
    '--chat-hover-border': t.hover.border,
    '--chat-hover-text': t.hover.text,
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
