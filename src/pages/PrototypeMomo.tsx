import type { CSSProperties } from 'react'
import { Momo, type MomoMode } from '../components/MomoCard'

export type PrototypeMomoValues = {
  show: boolean
  scale: number
  y: number
}

/**
 * Replaces the Momo baked into a prototype recording.
 * The patch hides the recording's copy; the live Momo above it can then be hidden,
 * scaled, or moved independently for this specific prototype.
 */
export function PrototypeMomo({
  id,
  values,
  mode = 'asleep',
}: {
  id: string
  values: PrototypeMomoValues
  mode?: MomoMode
}) {
  return (
    <div
      className="prototype-momo"
      data-prototype={id}
      style={{ '--prototype-momo-scale': values.scale, '--prototype-momo-y': `${values.y}%` } as CSSProperties}
      aria-hidden="true"
    >
      <span className="prototype-momo__patch" />
      {values.show && (
        <span className="prototype-momo__live">
          <Momo mode={mode} size="100%" x="0%" y="0%" />
        </span>
      )}
    </div>
  )
}
