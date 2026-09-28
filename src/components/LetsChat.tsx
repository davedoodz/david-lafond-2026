/**
 * "Let's chat" pill. Hover only tints it gray; the click plays the whole move,
 * and the visitor's mail app opens once the circle has arrived.
 *
 *   hover      gray fill                                                     (hover)
 *   click      fill white; left edge sweeps right → circle around the arrow   (armed)
 *              circle, arrow fixed inside it, slides to the pill's start      (travel)
 *              mailto: opens (+openDelay)
 *              hold, then fade back to the outline                           (return)
 *              pill grows back out to the right from the start                (idle)
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
  /** Hover (and keyboard focus). `gray` uses the colour dials below. */
  hover: {
    preset: { type: 'select' as const, options: ['gray', 'invert', 'ghost', 'lift', 'arrow', 'none'], default: 'gray' },
    fill: { type: 'color' as const, default: '#3a3a3a' },
    border: { type: 'color' as const, default: '#f5f5f5' },
    text: { type: 'color' as const, default: '#f5f5f5' },
  },
  motion: {
    fillMs: [160, 0, 800, 10] as [number, number, number, number],
    collapseDelayMs: [110, 0, 800, 10] as [number, number, number, number],
    collapse: { type: 'easing' as const, duration: 0.5, ease: [0.65, 0, 0.25, 1] as [number, number, number, number] },
    /** The circle sliding to the start of the pill. */
    travel: { type: 'easing' as const, duration: 0.6, ease: [0.65, 0, 0.35, 1] as [number, number, number, number] },
    /** The pill growing back out from the start. */
    expand: { type: 'easing' as const, duration: 0.55, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
  click: {
    /** roll: circle slides to the start · circle: collapses in place · fill: pill fills white · press: quick squeeze. */
    preset: { type: 'select' as const, options: ['roll', 'circle', 'fill', 'press'], default: 'roll' },
    /** Pause after the circle arrives, before the mail app opens. */
    openDelayMs: [0, 0, 1200, 10] as [number, number, number, number],
    /** How long the circle rests at the start before fading back. */
    holdMs: [500, 0, 2000, 10] as [number, number, number, number],
    /** White circle → outline, before the pill grows back. */
    fadeMs: [250, 0, 1000, 10] as [number, number, number, number],
  },
}

function cssTransition(curve: TransitionConfig) {
  if (curve.type === 'easing') return { duration: `${curve.duration}s`, ease: `cubic-bezier(${curve.ease.join(',')})` }
  // A spring chosen in DialKit: approximate with its visual duration and a soft ease-out.
  return { duration: `${curve.visualDuration ?? 0.5}s`, ease: 'cubic-bezier(0.22, 1, 0.36, 1)' }
}

type Phase = 'idle' | 'armed' | 'travel' | 'return' | 'filled' | 'pressed'

export function LetsChat() {
  const t = useTuning('Let’s chat', CONFIG)
  const [phase, setPhase] = useState<Phase>('idle')
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), [])

  const href = mailtoUrl(t.email.subject, t.email.body)
  const collapse = cssTransition(t.motion.collapse)
  const expand = cssTransition(t.motion.expand)
  const travel = cssTransition(t.motion.travel)

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    if (phase !== 'idle') return
    const mail = () => {
      window.location.href = href
    }
    const preset = t.click.preset
    if (preset === 'fill' || preset === 'press') {
      setPhase(preset === 'fill' ? 'filled' : 'pressed')
      const settled = preset === 'fill' ? t.motion.fillMs : 140
      timers.current.push(
        window.setTimeout(mail, settled + t.click.openDelayMs),
        window.setTimeout(() => setPhase('idle'), settled + (preset === 'fill' ? t.click.holdMs : 0)),
      )
      return
    }
    setPhase('armed')
    const circleAt = t.motion.collapseDelayMs + parseFloat(collapse.duration) * 1000
    if (preset === 'circle') {
      timers.current.push(
        window.setTimeout(mail, circleAt + t.click.openDelayMs),
        window.setTimeout(() => setPhase('return'), circleAt + t.click.holdMs),
        window.setTimeout(() => setPhase('idle'), circleAt + t.click.holdMs + t.click.fadeMs),
      )
      return
    }
    const travelAt = t.motion.collapseDelayMs + parseFloat(collapse.duration) * 1000
    const arriveAt = travelAt + parseFloat(travel.duration) * 1000
    const returnAt = arriveAt + t.click.holdMs
    timers.current.push(
      window.setTimeout(() => setPhase('travel'), travelAt),
      window.setTimeout(mail, arriveAt + t.click.openDelayMs),
      window.setTimeout(() => setPhase('return'), returnAt),
      window.setTimeout(() => setPhase('idle'), returnAt + t.click.fadeMs),
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
    '--chat-travel': travel.duration,
    '--chat-travel-ease': travel.ease,
    '--chat-expand': expand.duration,
    '--chat-expand-ease': expand.ease,
    '--chat-fade': `${t.click.fadeMs}ms`,
  } as CSSProperties

  return (
    <a
      className={`chat${phase === 'idle' ? '' : ` is-playing is-${phase}`}`}
      href={href}
      data-hover={t.hover.preset}
      data-click={t.click.preset}
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
