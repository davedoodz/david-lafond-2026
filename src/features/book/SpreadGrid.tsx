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
 * interactive (no flipping, no zoom); the covers sit centred on their own. At the bottom, a scrub bar
 * sets how many spreads sit side by side (1–4) above a pill that shows the spread at the screen's
 * middle and jumps to either cover.
 */
export const SpreadStack = memo(function SpreadStack() {
  const list = useRef<HTMLOListElement>(null)
  const pill = useRef<HTMLElement>(null)
  const [current, setCurrent] = useState(0)
  const [shown, setShown] = useState(true)
  const [columns, setColumns] = useState(1)
  const currentRef = useRef(0)
  currentRef.current = current

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

  // A new column count keeps the spread being read at the screen's middle.
  const previousColumns = useRef(columns)
  useLayoutEffect(() => {
    if (previousColumns.current === columns) return
    previousColumns.current = columns
    const item = list.current?.children[currentRef.current]
    if (!item || window.scrollY < 8) return
    const box = item.getBoundingClientRect()
    window.scrollTo({ top: window.scrollY + box.top + box.height / 2 - window.innerHeight / 2, behavior: 'auto' })
  }, [columns])

  const go = (to: 'cover' | 'back', button: HTMLElement) => {
    // :active only lasts as long as the press, which a quick tap barely shows while the page starts
    // gliding; every tap gets the same white flash instead, held briefly then eased out.
    button.animate(
      [
        { background: 'var(--paper)', color: 'var(--ink-900)' },
        { background: 'var(--paper)', color: 'var(--ink-900)', offset: 0.35 },
        { background: 'transparent', color: 'var(--stone-400)' },
      ],
      { duration: 520, easing: 'ease-out' },
    )
    const ol = list.current
    if (!ol) return
    const smooth = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    if (to === 'cover') return window.scrollTo({ top: 0, behavior: smooth })
    // Down lands with this pill centred on the back cover.
    const back = ol.lastElementChild?.getBoundingClientRect()
    const bar = pill.current?.getBoundingClientRect()
    if (!back || !bar) return
    const top = window.scrollY + back.top + back.height / 2 - (bar.top + bar.height / 2)
    window.scrollTo({ top: Math.min(top, document.documentElement.scrollHeight - window.innerHeight), behavior: smooth })
  }

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
        <div className="spread-stack__controls" data-shown={shown} inert={!shown}>
          <label className="spread-stack__columns">
            <span className="visually-hidden">Spreads per row</span>
            <span className="spread-stack__stops" aria-hidden="true">
              {[0, 1, 2, 3].map((stop) => <i key={stop} style={{ '--stop': stop / 3 } as CSSProperties} />)}
            </span>
            <input
              type="range"
              min={1}
              max={4}
              step={1}
              value={columns}
              onChange={(event) => setColumns(Number(event.currentTarget.value))}
              style={{ '--stack-fill': (columns - 1) / 3 } as CSSProperties}
            />
          </label>
          <nav ref={pill} className="spread-stack__pill" aria-label="Book position">
            <button type="button" onClick={(event) => go('cover', event.currentTarget)} aria-label="Back to the cover">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6" /></svg>
            </button>
            <span className="spread-stack__count">
              {current + 1} <span>/ {SPREADS.length}</span>
            </span>
            <button type="button" onClick={(event) => go('back', event.currentTarget)} aria-label="Go to the back cover">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
            </button>
          </nav>
        </div>,
        document.body,
      )}
    </>
  )
})
