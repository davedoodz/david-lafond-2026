import type { CSSProperties } from 'react'
import { GhostMark } from './GhostMark'
import { DAVEBOT_CONFIG, DAVEBOT_PANEL, ghostFill } from './davebotConfig'
import { useTuning } from '../../tuning/useTuning'
import './ghost.css'

export type GhostButtonProps = { className?: string }

/** Davebot is a back-to-top control on the current page, without opening a dialog. */
export function GhostButton({ className }: GhostButtonProps) {
  const tuning = useTuning(DAVEBOT_PANEL, DAVEBOT_CONFIG)
  return (
    <button
      type="button"
      className={`ghost-button${className ? ` ${className}` : ''}`}
      style={{ '--nav-ghost-size': `${tuning.ghost.navSize}px` } as CSSProperties}
      aria-label="Davebot — back to top"
      onClick={() => window.scrollTo({
        top: 0,
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      })}
    >
      <span className="ghost-button__body">
        <GhostMark size={tuning.ghost.navSize} fill={ghostFill(tuning.ghost)} />
      </span>
    </button>
  )
}
