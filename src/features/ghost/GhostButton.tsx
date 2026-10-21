import type { CSSProperties } from 'react'
import { navigate } from '../../lib/router'
import { GhostMark } from './GhostMark'
import { DAVEBOT_CONFIG, DAVEBOT_PANEL, ghostFill } from './davebotConfig'
import { useTuning } from '../../tuning/useTuning'
import './ghost.css'

export type GhostButtonProps = { className?: string }

/** Davebot scrolls the page back to the top; already at the top, he takes you to the Work page. */
export function GhostButton({ className }: GhostButtonProps) {
  const tuning = useTuning(DAVEBOT_PANEL, DAVEBOT_CONFIG)
  const onClick = () => {
    // A pixel of slack: iOS rubber-banding and sub-pixel scroll can leave scrollY just above 0.
    const y = window.scrollY
    if (y <= 1) return navigate('work')
    window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
    // Some pages hold a higher top (Momo keeps its intro above a floor once played): when the page
    // hasn't moved up at all a moment later, you were already at its top, so go to Work.
    let moved = false
    const watch = () => { if (Math.abs(window.scrollY - y) > 1) moved = true }
    window.addEventListener('scroll', watch, { passive: true })
    window.setTimeout(() => {
      window.removeEventListener('scroll', watch)
      if (!moved && Math.abs(window.scrollY - y) <= 1) navigate('work')
    }, 350)
  }
  return (
    <button
      type="button"
      className={`ghost-button${className ? ` ${className}` : ''}`}
      style={{ '--nav-ghost-size': `${tuning.ghost.navSize}px` } as CSSProperties}
      aria-label="Davebot — back to top, or to the Work page from the top"
      onClick={onClick}
    >
      <span className="ghost-button__body">
        <GhostMark size={tuning.ghost.navSize} fill={ghostFill(tuning.ghost)} />
      </span>
    </button>
  )
}
