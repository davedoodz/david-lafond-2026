import { useEffect, useRef } from 'react'
import { GhostMark } from './GhostMark'
import { setDavebotTrigger, toggleDavebot, useDavebotOpen } from './davebotStore'
import { DAVEBOT_CONFIG, DAVEBOT_PANEL } from './davebotConfig'
import { useTuning } from '../../tuning/useTuning'
import './ghost.css'

export type GhostButtonProps = {
  className?: string
}

/**
 * The nav ghost: pupils track the pointer (via the shared gaze tracker in
 * `GhostMark`), and clicking (or Enter/Space, native to `<button>`) opens
 * Davebot. Sits at the top-right of the nav on both dark and light pages.
 *
 * Hides — but stays mounted — while Davebot is open, handing off to the
 * larger mark in `DavebotLayer` so only one ghost is ever on screen.
 */
export function GhostButton({ className }: GhostButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const open = useDavebotOpen()
  const tuning = useTuning(DAVEBOT_PANEL, DAVEBOT_CONFIG)

  useEffect(() => {
    setDavebotTrigger(buttonRef.current)
    return () => setDavebotTrigger(null)
  }, [])

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`ghost-button${open ? ' is-hidden' : ''}${className ? ` ${className}` : ''}`}
      onClick={toggleDavebot}
      aria-label="Ask Davebot"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-keyshortcuts="Meta+K Control+K"
    >
      <GhostMark size={tuning.ghost.navSize} />
    </button>
  )
}

