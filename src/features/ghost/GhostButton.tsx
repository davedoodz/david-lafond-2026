import type { CSSProperties } from 'react'
import { navigate, useRoute } from '../../lib/router'
import { GhostMark } from './GhostMark'
import { DAVEBOT_CONFIG, DAVEBOT_PANEL, ghostFill } from './davebotConfig'
import { useTuning } from '../../tuning/useTuning'
import './ghost.css'

export type GhostButtonProps = { className?: string }

const PROJECT_ROUTES = new Set(['momo', 'filo', 'harvard-mit'])

/** Davebot: on a case study he always takes you to the Work page. Elsewhere he scrolls back to the
 *  top, and from the top he takes you to the Work page. */
export function GhostButton({ className }: GhostButtonProps) {
  const tuning = useTuning(DAVEBOT_PANEL, DAVEBOT_CONFIG)
  const route = useRoute()
  const project = PROJECT_ROUTES.has(route)
  const onClick = () => {
    // A pixel of slack: iOS rubber-banding and sub-pixel scroll can leave scrollY just above 0.
    if (project || window.scrollY <= 1) return navigate('work')
    window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }
  return (
    <button
      type="button"
      className={`ghost-button${className ? ` ${className}` : ''}`}
      style={{ '--nav-ghost-size': `${tuning.ghost.navSize}px` } as CSSProperties}
      aria-label={project ? 'Davebot — back to the Work page' : 'Davebot — back to top, or to the Work page from the top'}
      onClick={onClick}
    >
      <span className="ghost-button__body">
        <GhostMark size={tuning.ghost.navSize} fill={ghostFill(tuning.ghost)} />
      </span>
    </button>
  )
}
