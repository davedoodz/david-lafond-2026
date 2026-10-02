import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { isLightUnder } from '../../lib/surface'
import { GhostMark } from './GhostMark'
import { openDavebotAbout, setDavebotTrigger, toggleDavebot, useDavebotOpen } from './davebotStore'
import { DAVEBOT_CONFIG, DAVEBOT_PANEL, ghostFill } from './davebotConfig'
import { useTuning } from '../../tuning/useTuning'
import './ghost.css'

export type GhostButtonProps = {
  className?: string
}

/** Fields keep their own selection; it is not page copy Davebot can talk about. */
const FIELD_SELECTOR = 'input, textarea, [contenteditable="true"]'

/** The reader's current page-text selection, or '' (fields, Davebot itself, tiny picks excluded). */
function readSelection(minChars: number): string {
  const selection = document.getSelection()
  if (!selection || selection.isCollapsed || !selection.rangeCount) return ''
  if (document.activeElement?.matches(FIELD_SELECTOR)) return ''
  const node = selection.getRangeAt(0).commonAncestorContainer
  const element = node instanceof Element ? node : node.parentElement
  if (element?.closest('.davebot-layer, .ghost-button')) return ''
  const text = selection.toString().replace(/\s+/g, ' ').trim()
  return text.length >= minChars ? text : ''
}

/**
 * The nav ghost: pupils track the pointer (via the shared gaze tracker in
 * `GhostMark`), and clicking (or Enter/Space, native to `<button>`) opens
 * Davebot. Sits at the top-right of the nav on both dark and light pages.
 *
 * Highlighting page text perks him up: a hop, and an "Ask me about this" pill.
 * Clicking then opens Davebot already asking about the highlighted text.
 *
 * Hides — but stays mounted — while Davebot is open, handing off to the
 * larger mark in `DavebotLayer` so only one ghost is ever on screen.
 */
export function GhostButton({ className }: GhostButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const open = useDavebotOpen()
  const tuning = useTuning(DAVEBOT_PANEL, DAVEBOT_CONFIG)
  const cue = tuning.selection
  const [quote, setQuote] = useState('')
  // Bumped on each new selection so the hop replays (keyed animation restart).
  const [hop, setHop] = useState(0)

  useEffect(() => {
    setDavebotTrigger(buttonRef.current)
    return () => setDavebotTrigger(null)
  }, [])

  useEffect(() => {
    if (!cue.enabled) return setQuote('')
    let frame = 0
    let last = ''
    const read = () => {
      frame = 0
      const next = readSelection(cue.minChars)
      // A fresh pick (nothing → something) hops; dragging to extend it does not.
      if (next && !last) setHop((n) => n + 1)
      last = next
      setQuote(next)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(read)
    }
    document.addEventListener('selectionchange', schedule)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('selectionchange', schedule)
    }
  }, [cue.enabled, cue.minChars])

  const active = Boolean(quote) && !open

  // The pill inverts against what is actually behind it (a white sheet scrolled under a
  // dark page, a light section on a dark route), re-sampled while it shows.
  const pillRef = useRef<HTMLSpanElement>(null)
  const [overLight, setOverLight] = useState(false)
  useLayoutEffect(() => {
    const pill = pillRef.current
    if (!active || !pill) return
    let frame = 0
    const sample = () => {
      frame = 0
      const r = pill.getBoundingClientRect()
      const light = isLightUnder(pill, r.left + r.width / 2, r.top + r.height / 2)
      if (light !== null) setOverLight(light)
    }
    const queue = () => (frame ||= requestAnimationFrame(sample))
    sample()
    window.addEventListener('scroll', queue, { passive: true })
    window.addEventListener('resize', queue)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', queue)
      window.removeEventListener('resize', queue)
    }
  }, [active])

  // mousedown would collapse the selection before click reads it; keep it.
  const keepSelection = (event: React.MouseEvent) => {
    if (active) event.preventDefault()
  }

  const onClick = () => {
    if (!active) return toggleDavebot()
    openDavebotAbout(`${cue.prompt.trim()} “${quote}”`)
    document.getSelection()?.removeAllRanges()
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`ghost-button${open ? ' is-hidden' : ''}${active ? ' is-cued' : ''}${className ? ` ${className}` : ''}`}
      style={{ '--hop-ms': `${cue.hopMs}ms`, '--hop-y': `${-cue.hopHeight}px` } as CSSProperties}
      onMouseDown={keepSelection}
      onClick={onClick}
      aria-label={active ? `${cue.pill}: “${quote}”` : 'Ask Davebot'}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-keyshortcuts="Meta+K Control+K"
    >
      <span key={hop} className={`ghost-button__body${hop && active ? ' is-hopping' : ''}`}>
        <GhostMark size={tuning.ghost.navSize} fill={ghostFill(tuning.ghost)} />
      </span>
      <span ref={pillRef} className="ghost-button__pill" data-over={overLight ? 'light' : 'dark'} aria-hidden="true">
        {cue.pill}
      </span>
    </button>
  )
}
