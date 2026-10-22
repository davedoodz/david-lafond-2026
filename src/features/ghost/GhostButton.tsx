import type { CSSProperties } from 'react'
import { navigate } from '../../lib/router'
import { GhostMark } from './GhostMark'
import { DAVEBOT_CONFIG, DAVEBOT_PANEL, ghostFill } from './davebotConfig'
import { useTuning } from '../../tuning/useTuning'
import './ghost.css'

export type GhostButtonProps = { className?: string }

/** Davebot scrolls back to the top on every page, case studies included; from the top he takes
 *  you to the Work page. */
export function GhostButton({ className }: GhostButtonProps) {
  const tuning = useTuning(DAVEBOT_PANEL, DAVEBOT_CONFIG)
  const onClick = () => {
    // A page can raise the top of its scroll range (Momo closes its played intro stage), so the top
    // is that floor. A pixel of slack: iOS rubber-banding and sub-pixel scroll can leave scrollY above it.
    const top = Number(document.documentElement.dataset.scrollMin) || 0
    if (window.scrollY <= top + 1) return navigate('work')
    window.scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
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
