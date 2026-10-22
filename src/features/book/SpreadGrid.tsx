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
 * bottom picks the view: its circle slides freely and the nearest whole step wins. Step 0 (far left)
 * shows every page on its own, full width; steps 1–4 put that many spreads side by side (default 2).
 */
export const SpreadStack = memo(function SpreadStack() {
  const list = useRef<HTMLOListElement>(null)
  const [shown, setShown] = useState(true)
  const [scrub, setScrub] = useState(2)
  // 0 = single pages; 1–4 = spreads per row.
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

  // A new view keeps the page at the screen's middle there: it is found before the grid reflows (the
  // render phase still has the old layout in the DOM) and scrolled back to the middle after. Pages,
  // not spreads, are the anchor because the single-page view dissolves the spread boxes.
  const anchor = useRef<Element | null>(null)
  const previousColumns = useRef(columns)
  if (previousColumns.current !== columns && list.current && anchor.current === null && window.scrollY >= 8) {
    const mid = window.innerHeight / 2
    const pages = [...list.current.querySelectorAll('img')]
    anchor.current = pages.find((page) => page.getBoundingClientRect().bottom > mid) ?? pages.at(-1) ?? null
  }
  useLayoutEffect(() => {
    if (previousColumns.current === columns) return
    previousColumns.current = columns
    const page = anchor.current
    anchor.current = null
    if (!page) return
    const box = page.getBoundingClientRect()
    window.scrollTo({ top: window.scrollY + box.top + box.height / 2 - window.innerHeight / 2, behavior: 'auto' })
  }, [columns])

  return (
    <>
      <ol ref={list} className="spread-stack" aria-label="All spreads, cover to back cover"
        data-view={columns === 0 ? 'pages' : 'spreads'}
        style={{ '--stack-columns': Math.max(1, columns) } as CSSProperties}>
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
          <span className="visually-hidden">Book view</span>
          <input
            type="range"
            min={0}
            max={4}
            step="any"
            value={scrub}
            aria-valuetext={columns === 0 ? 'Single pages' : `${columns} spreads per row`}
            onChange={(event) => setScrub(Number(event.currentTarget.value))}
            onKeyDown={(event) => {
              // Arrow keys step whole views; dragging stays free.
              const delta = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[event.key]
              if (!delta) return
              event.preventDefault()
              setScrub(Math.min(4, Math.max(0, columns + delta)))
            }}
            style={{ '--stack-fill': scrub / 4 } as CSSProperties}
          />
        </label>,
        document.body,
      )}
    </>
  )
})
