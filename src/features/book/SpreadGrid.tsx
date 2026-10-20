import { memo, useEffect, useRef, useState } from 'react'
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
 * Phones' Book tab: every spread stacked top to bottom at full width, to read by scrolling.
 * The spreads are not interactive (no flipping, no zoom); the covers sit centred on their own.
 * A pill at the bottom shows the spread at the screen's middle and jumps to either cover.
 */
export const SpreadStack = memo(function SpreadStack() {
  const list = useRef<HTMLOListElement>(null)
  const [current, setCurrent] = useState(0)
  const [shown, setShown] = useState(true)

  useEffect(() => {
    const ol = list.current
    if (!ol) return
    let frame = 0
    const measure = () => {
      frame = 0
      const mid = window.innerHeight / 2
      const items = ol.children
      // At the very top the cover counts as current even though it ends above the middle.
      let index = window.scrollY < 8 ? 0 : items.length - 1
      for (let i = 0; i < items.length && index !== 0; i++) {
        if (items[i].getBoundingClientRect().bottom > mid) { index = i; break }
      }
      setCurrent(index)
      // Leave once the back cover has scrolled above the middle: the pill would sit over the video.
      setShown(ol.getBoundingClientRect().bottom > mid)
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

  const go = (to: 'cover' | 'back') => {
    const ol = list.current
    if (!ol) return
    const smooth = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    if (to === 'cover') return window.scrollTo({ top: 0, behavior: smooth })
    ol.lastElementChild?.scrollIntoView({ block: 'center', behavior: smooth })
  }

  return (
    <>
      <ol ref={list} className="spread-stack" aria-label="All spreads, cover to back cover">
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
      {createPortal(<nav className="spread-stack__pill" data-shown={shown} aria-label="Book position" inert={!shown}>
        <button type="button" onClick={() => go('cover')} aria-label="Back to the cover">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6" /></svg>
        </button>
        <span className="spread-stack__count">
          {current + 1} <span>/ {SPREADS.length}</span>
        </span>
        <button type="button" onClick={() => go('back')} aria-label="Go to the back cover">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
        </button>
      </nav>, document.body)}
    </>
  )
})
