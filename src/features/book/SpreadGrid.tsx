import { memo, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { SPREADS, pageLabel, pageUrl, pageSurface, PAGE_COUNT } from './bookPages'

type Props = {
  current: number
  /** Spread clicked; `source` is its thumbnail, for the zoom to fly from. */
  onOpen: (spread: number, source: HTMLElement) => void
  showPageNumbers: boolean
  /** Spread shown in the zoom; its thumbnail hides so the zoom reads as lifting it out. */
  zoomed: number | null
  diagramSources?: Record<number, string>
}

/**
 * Every spread at a glance, laid out as the open book shows it: covers sit
 * alone on their side of the spine. Thumbs load lazily as the grid scrolls.
 */
export const SpreadGrid = memo(function SpreadGrid({ current, onOpen, showPageNumbers, zoomed, diagramSources }: Props) {
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
              aria-label={`Enlarge ${label.toLowerCase()}`}
              data-zoomed={spread === zoomed || undefined}
              onPointerLeave={(event) => {
                if (!event.currentTarget.hasAttribute('data-zoomed')) delete event.currentTarget.dataset.zoomReturn
              }}
              onClick={(event) => onOpen(spread, event.currentTarget.querySelector<HTMLElement>('.spread-grid__pages')!)}
            >
              <span className="spread-grid__pages" data-surface={pageSurface(pages[0])}>
                {pages.map((page) => (
                  <img key={page} data-layout-page={page} data-layout-original={pageUrl(page, 'thumb')}
                    src={diagramSources?.[page] ?? pageUrl(page, 'thumb')} alt="" loading="lazy" decoding="async"
                    style={diagramSources ? { backgroundImage: `url("${pageUrl(page, 'thumb')}")`, backgroundSize: '100% 100%' } : undefined} />
                ))}
              </span>
              {showPageNumbers && <span className="spread-grid__label">{label}</span>}
            </button>
          </li>
        )
      })}
    </ol>
  )
})

/**
 * Phones' book: every spread stacked top to bottom, to read by scrolling. The spreads are not
 * interactive (no flipping, no zoom); the covers sit centred on their own. A scrub bar fixed at the
 * bottom sets how many spreads sit side by side: its circle slides freely from 1 (left) to 4 (right)
 * and the column count follows the nearest whole number.
 */
export const SpreadStack = memo(function SpreadStack() {
  const list = useRef<HTMLOListElement>(null)
  const [shown, setShown] = useState(true)
  const [scrub, setScrub] = useState(1)
  const columns = Math.round(scrub)

  useEffect(() => {
    const ol = list.current
    if (!ol) return
    let frame = 0
    // Leave once the back cover has scrolled above the middle: the bar would sit over the video.
    const measure = () => {
      frame = 0
      setShown(ol.getBoundingClientRect().bottom > window.innerHeight / 2)
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(measure) }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  // A new column count keeps the spread at the screen's middle there: it is found before the grid
  // reflows (the render phase still has the old layout in the DOM) and scrolled back after.
  const anchor = useRef<number | null>(null)
  const previousColumns = useRef(columns)
  if (previousColumns.current !== columns && list.current && anchor.current === null && window.scrollY >= 8) {
    const mid = window.innerHeight / 2
    const items = [...list.current.children]
    const index = items.findIndex((item) => item.getBoundingClientRect().bottom > mid)
    anchor.current = index === -1 ? items.length - 1 : index
  }
  useLayoutEffect(() => {
    if (previousColumns.current === columns) return
    previousColumns.current = columns
    const index = anchor.current
    anchor.current = null
    const item = index === null ? null : list.current?.children[index]
    if (!item) return
    const box = item.getBoundingClientRect()
    window.scrollTo({ top: window.scrollY + box.top + box.height / 2 - window.innerHeight / 2, behavior: 'auto' })
  }, [columns])

  return (
    <>
      <ol ref={list} className="spread-stack" aria-label="All spreads, cover to back cover"
        style={{ '--stack-columns': columns } as CSSProperties}>
        {SPREADS.map((pages, spread) => {
          const side = pages[0] === 1 ? 'front' : pages[0] === PAGE_COUNT ? 'back' : 'open'
          return (
            <li key={spread} className="spread-stack__spread" data-side={side} data-surface={pageSurface(pages[0])}
              aria-label={side === 'front' ? 'Cover' : side === 'back' ? 'Back cover' : `Pages ${pageLabel(pages)}`}>
              {pages.map((page) => (
                <img key={page} src={pageUrl(page, 'medium')} alt="" loading={spread < 2 ? 'eager' : 'lazy'} decoding="async" />
              ))}
            </li>
          )
        })}
      </ol>
      {/* Portalled: an ancestor's transform would otherwise trap `position: fixed`. */}
      {createPortal(
        <label className="spread-stack__columns" data-shown={shown} inert={!shown}>
          <span className="visually-hidden">Spreads per row</span>
          <input
            type="range"
            min={1}
            max={4}
            step="any"
            value={scrub}
            aria-valuetext={`${columns} per row`}
            onChange={(event) => setScrub(Number(event.currentTarget.value))}
            onKeyDown={(event) => {
              // Arrow keys step whole columns; dragging stays free.
              const delta = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[event.key]
              if (!delta) return
              event.preventDefault()
              setScrub(Math.min(4, Math.max(1, columns + delta)))
            }}
            style={{ '--stack-fill': (scrub - 1) / 3 } as CSSProperties}
          />
        </label>,
        document.body,
      )}
    </>
  )
})
