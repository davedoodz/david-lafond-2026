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
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from 'react'
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
    preset: { type: 'select' as const, options: ['morph', 'gray', 'invert', 'ghost', 'lift', 'arrow', 'none'], default: 'morph' },
    fill: { type: 'color' as const, default: '#3a3a3a' },
    border: { type: 'color' as const, default: '#f5f5f5' },
    text: { type: 'color' as const, default: '#f5f5f5' },
  },
  /** `morph` hover: the pill becomes the arrow circle under the cursor; a click sends it off to the right. */
  morph: {
    shape: { type: 'easing' as const, duration: 0.18, ease: [0.2, 0.9, 0.1, 1] as [number, number, number, number] },
    exitPx: [220, 40, 600, 1] as [number, number, number, number],
    exit: { type: 'easing' as const, duration: 0.45, ease: [0.5, 0, 0.75, 0] as [number, number, number, number] },
    /** After the circle exits: how long the button stays gone before fading back. */
    reappearDelayMs: [0, 0, 3000, 10] as [number, number, number, number],
    /** How long the button takes to fade back in. */
    fadeInMs: [4500, 0, 8000, 50] as [number, number, number, number],
    /** The cursor dot is pulled into the circle and drips back out on leave. */
    absorbCursor: true,
    /** Full-pill outline that stays visible behind the circle while morphed. */
    trackColor: { type: 'color' as const, default: '#6F6B68' },
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
type Curve = 'collapse' | 'travel' | 'expand' | 'none'

const absorbCursor = (x: number, y: number) => window.dispatchEvent(new CustomEvent('cursor:absorb', { detail: { x, y } }))
const releaseCursor = () => window.dispatchEvent(new Event('cursor:release'))

export function LetsChat() {
  const t = useTuning('Let’s chat', CONFIG)
  const [phase, setPhase] = useState<Phase>('idle')
  const [curve, setCurve] = useState<Curve>('expand')
  const timers = useRef<number[]>([])
  // Morph hover is on: the pill's edges are then driven per frame by the morph engine below.
  const [morphing, setMorphing] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [fadingIn, setFadingIn] = useState(false)
  const pillRef = useRef<HTMLSpanElement>(null)
  // Edges (px from the pill's left) now and their targets; `raf` is 0 when settled.
  const engine = useRef({ l: 0, r: 0, tl: 0, tr: 0, raf: 0, last: 0, active: false })
  useEffect(
    () => () => {
      timers.current.forEach((id) => window.clearTimeout(id))
      cancelAnimationFrame(engine.current.raf)
    },
    [],
  )

  // The pill's edges come from the measured size of the button.
  const bodyRef = useRef<HTMLSpanElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const body = bodyRef.current
    if (!body) return
    const measure = () => setSize({ w: body.offsetWidth, h: body.offsetHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(body)
    return () => observer.disconnect()
  }, [])

  const href = mailtoUrl(t.email.subject, t.email.body)
  const collapse = cssTransition(t.motion.collapse)
  const expand = cssTransition(t.motion.expand)
  const travel = cssTransition(t.motion.travel)
  const shape = cssTransition(t.morph.shape)
  const exit = cssTransition(t.morph.exit)

  // Settle time of the morph (DialKit › morph › shape duration); the engine eases exponentially toward it.
  const tauRef = useRef(45)
  tauRef.current = Math.max((parseFloat(shape.duration) * 1000) / 4, 1)

  /**
   * Morph engine: one rAF loop eases the pill's edges toward the pointer every frame.
   * Pointer moves only move the target, so tracking never restarts a CSS transition
   * (that restart was the lag) and never re-renders React.
   */
  const writeEdges = () => {
    const pill = pillRef.current
    if (!pill) return
    pill.style.setProperty('--chat-l', `${engine.current.l}px`)
    pill.style.setProperty('--chat-r', `${engine.current.r}px`)
  }
  const releaseEdges = () => {
    const e = engine.current
    cancelAnimationFrame(e.raf)
    e.raf = 0
    e.active = false
    pillRef.current?.style.removeProperty('--chat-l')
    pillRef.current?.style.removeProperty('--chat-r')
  }
  const step = (now: number) => {
    const e = engine.current
    const k = 1 - Math.exp(-Math.min(now - e.last, 64) / tauRef.current)
    e.last = now
    e.l += (e.tl - e.l) * k
    e.r += (e.tr - e.r) * k
    const settled = Math.abs(e.tl - e.l) < 0.05 && Math.abs(e.tr - e.r) < 0.05
    if (settled) {
      e.l = e.tl
      e.r = e.tr
    }
    writeEdges()
    if (!settled) {
      e.raf = requestAnimationFrame(step)
      return
    }
    e.raf = 0
    // Back at the full pill after a leave: hand the edges back to the CSS state machine.
    if (!e.active) releaseEdges()
  }
  const driveTo = (tl: number, tr: number) => {
    const e = engine.current
    e.tl = tl
    e.tr = tr
    if (e.raf) return
    // Start as if one frame already passed, so the first painted frame already moves.
    e.last = performance.now() - 16
    e.raf = requestAnimationFrame(step)
  }

  const morphOn = t.hover.preset === 'morph'
  // Mouse only; the circle forms on enter and follows every move.
  const anchorRef = useRef<HTMLAnchorElement>(null)
  const morphAt = (clientX: number) => {
    const el = anchorRef.current
    if (!morphOn || !el || phase !== 'idle' || exiting) return
    const e = engine.current
    if (!e.active) {
      if (fadingIn) {
        // Hovering during the post-click fade-in ends it, so hover always responds.
        setFadingIn(false)
        setCurve('expand')
      }
      // Start from wherever the shape is: the full pill, or mid-way back from a previous leave.
      if (!e.raf) {
        e.l = 0
        e.r = size.w
      }
      e.active = true
      setCurve('none')
      setMorphing(true)
    }
    const rect = el.getBoundingClientRect()
    const h = rect.height
    const px = Math.min(Math.max(clientX - rect.left, h / 2), rect.width - h / 2)
    driveTo(px - h / 2, px + h / 2)
    if (t.morph.absorbCursor) absorbCursor(rect.left + px, rect.top + h / 2)
  }
  const onPointerMove = (event: PointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType !== 'mouse') return
    morphAt(event.clientX)
  }
  const onPointerEnter = (event: PointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType !== 'mouse') return
    window.dispatchEvent(new Event('cursor:hide'))
    onPointerMove(event)
  }
  const onPointerLeave = () => {
    window.dispatchEvent(new Event('cursor:show'))
    if (exiting || !engine.current.active) return
    engine.current.active = false
    setMorphing(false)
    driveTo(0, size.w)
    releaseCursor()
  }

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    if (phase !== 'idle' || exiting || fadingIn) return
    if (morphing) {
      // Circle slides off to the right and fades, then the mail app opens and the pill fades back.
      setExiting(true)
      const exitMs = parseFloat(exit.duration) * 1000 + t.click.openDelayMs
      const backAt = exitMs + t.morph.reappearDelayMs
      timers.current.push(
        window.setTimeout(() => {
          window.location.href = href
        }, exitMs),
        window.setTimeout(() => {
          setCurve('none')
          setExiting(false)
          setMorphing(false)
          releaseEdges()
          setFadingIn(true)
          releaseCursor()
        }, backAt),
        window.setTimeout(() => {
          setFadingIn(false)
          setCurve('expand')
        }, backAt + t.morph.fadeInMs),
      )
      return
    }
    // A click during the leave animation: the CSS click states own the edges from here.
    releaseEdges()
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
    setCurve('collapse')
    setPhase('armed')
    const circleAt = t.motion.collapseDelayMs + parseFloat(collapse.duration) * 1000
    const back = (at: number) => [
      window.setTimeout(() => setPhase('return'), at),
      window.setTimeout(() => {
        setCurve('expand')
        setPhase('idle')
      }, at + t.click.fadeMs),
    ]
    if (preset === 'circle') {
      timers.current.push(window.setTimeout(mail, circleAt + t.click.openDelayMs), ...back(circleAt + t.click.holdMs))
      return
    }
    const arriveAt = circleAt + parseFloat(travel.duration) * 1000
    timers.current.push(
      window.setTimeout(() => {
        setCurve('travel')
        setPhase('travel')
      }, circleAt),
      window.setTimeout(mail, arriveAt + t.click.openDelayMs),
      ...back(arriveAt + t.click.holdMs),
    )
  }

  // Left/right edge of the visible shape for the current state.
  const { w, h } = size
  let left = 0
  let right = w
  if (phase === 'armed' || (phase === 'return' && t.click.preset === 'circle')) {
    left = w - h
  } else if (phase === 'travel' || phase === 'return') {
    right = h
  }
  const timing = { collapse, travel, expand, none: { duration: '0s', ease: 'linear' } }[curve]
  const white = morphing || exiting || phase === 'armed' || phase === 'travel' || phase === 'filled'

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
    '--chat-l': `${left}px`,
    '--chat-r': `${right}px`,
    '--chat-w': `${w}px`,
    '--chat-shape-ms': timing.duration,
    '--chat-shape-ease': timing.ease,
    '--chat-shape-delay': curve === 'collapse' ? `${t.motion.collapseDelayMs}ms` : '0ms',
    '--chat-color-ms': `${phase === 'return' ? t.click.fadeMs : t.motion.fillMs}ms`,
    '--chat-exit-x': `${t.morph.exitPx}px`,
    '--chat-exit': exit.duration,
    '--chat-exit-ease': exit.ease,
    '--chat-fade-in': `${t.morph.fadeInMs}ms`,
    '--chat-track': t.morph.trackColor,
  } as CSSProperties

  return (
    <a
      ref={anchorRef}
      className={`chat${phase === 'idle' ? '' : ` is-playing is-${phase}`}${morphing ? ' is-morph' : ''}${white ? ' is-white' : ''}${exiting ? ' is-exit' : ''}${fadingIn ? ' is-fadein' : ''}`}
      onPointerMove={onPointerMove}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      href={href}
      data-hover={t.hover.preset}
      data-click={t.click.preset}
      onClick={onClick}
      style={style}
    >
      <span className="chat__body" ref={bodyRef}>
        <span className="chat__track" aria-hidden="true" />
        <span className="chat__pill" ref={pillRef} aria-hidden="true">
          <span className="chat__text">{t.label}</span>
          <ArrowRightIcon className="chat__arrow" />
        </span>
        <span className="chat__label">{t.label}</span>
        <span className="chat__arrow-space" />
      </span>
    </a>
  )
}
