import { memo } from 'react'
import { SPREADS, pageLabel, pageUrl, PAGE_COUNT } from './bookPages'

type Props = { current: number; onOpen: (spread: number) => void }

/**
 * Every spread at a glance, laid out as the open book shows it: covers sit
 * alone on their side of the spine. Thumbs load lazily as the grid scrolls.
 */
export const SpreadGrid = memo(function SpreadGrid({ current, onOpen }: Props) {
  return (
    <ol className="spread-grid">
      {SPREADS.map((pages, spread) => {
        const side = pages[0] === 1 ? 'front' : pages[0] === PAGE_COUNT ? 'back' : 'open'
        const label = side === 'front' ? 'Cover' : side === 'back' ? 'Back cover' : `Pages ${pageLabel(pages)}`
        return (
          <li key={spread}>
            <button
              type="button"
              className="spread-grid__card"
              data-side={side}
              aria-current={spread === current ? 'true' : undefined}
              aria-label={`Open ${label.toLowerCase()}`}
              onClick={() => onOpen(spread)}
            >
              <span className="spread-grid__pages">
                {pages.map((page) => (
                  <img key={page} src={pageUrl(page, 'thumb')} alt="" loading="lazy" decoding="async" draggable={false} />
                ))}
              </span>
              <span className="spread-grid__label">{label}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
})
