/**
 * Grid lightbox: the clicked spread FLIPs from its grid thumbnail to a centred,
 * enlarged image over a blurred, dimmed backdrop. Clicking the backdrop or Escape
 * FLIPs it back into the (re-measured) grid slot.
 *
 * One transform interpolates position and scale together, with no bounce by default.
 * The grid destination stays untransformed through handoff; grid and zoom radii
 * interpolate independently, compensating for scale at the thumbnail end.
 * The thumbnail shows immediately; each sharper page fades in after its own load
 * without restarting the animation or remeasuring a moving return destination.
 * Playground-style arrows and left/right keys browse spreads without unlocking
 * scroll. On close, scrolling unlocks and the return travels in document coordinates,
 * keeping it aligned with the selected thumbnail even while the page scrolls.
 * Pointer push-tilt lives on the inner surface, starts after entry settles, and
 * resets before return completes; it never competes with the outer zoom transform.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { motion, type Transition } from 'motion/react'
import { PAGE_ASPECT, pageLabel, pageUrl, pageSurface } from './bookPages'

export type ZoomLook = {
  widthVw: number
  maxHeightVh: number
  blur: number
  dimOpacity: number
  radius: number
  tilt: { enabled: boolean; angle: number; push: number; perspective: number; smoothing: number }
}

type Props = {
  pages: number[]
  /** Grid thumbnail the spread flies from / back to; re-measured on close. */
  source: HTMLElement
  originRect: DOMRect
  gridRadius: number
  closing: boolean
  look: ZoomLook
  transition: Transition
  onClose: () => void
  onClosed: () => void
  onNavigate: (direction: -1 | 1) => void
  diagramSources?: Record<number, string>
}

function useViewport() {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return size
}

function flipFrom(rect: DOMRect, target: { x: number; y: number; width: number; height: number }) {
  return {
    x: rect.left + rect.width / 2 - (target.x + target.width / 2),
    y: rect.top + rect.height / 2 - (target.y + target.height / 2),
    scaleX: rect.width / target.width,
    scaleY: rect.height / target.height,
  }
}

export function SpreadZoom({ pages, source, originRect, gridRadius, closing, look, transition, onClose, onClosed, onNavigate, diagramSources }: Props) {
  const { w: vw, h: vh } = useViewport()
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const [settled, setSettled] = useState(false)

  const target = useMemo(() => {
    const ratio = PAGE_ASPECT * pages.length
    const width = Math.min(vw * (look.widthVw / 100), vh * (look.maxHeightVh / 100) * ratio)
    const height = width / ratio
    return { width, height, x: (vw - width) / 2, y: (vh - height) / 2 }
  }, [vw, vh, look.widthVw, look.maxHeightVh, pages.length])

  // Origin is measured once on open; the return trip re-measures in case the grid moved.
  const [origin] = useState(() => flipFrom(originRect, target))
  const returnFrame = useMemo(() => closing ? {
    home: flipFrom(source.getBoundingClientRect(), target),
    scrollX: window.scrollX,
    scrollY: window.scrollY,
  } : null, [closing, source, target])
  const home = returnFrame?.home ?? origin
  // One interpolated transform keeps translation and scale on the same timeline.
  // Independent springs reach their rest thresholds at different times.
  const pose = (p: typeof origin) => `translate(${p.x}px, ${p.y}px) scale(${p.scaleX}, ${p.scaleY})`
  // Phones show the spread ~3× smaller than desktop, so the same corner reads far rounder: halve it.
  const radius = vw <= 640 ? look.radius / 2 : look.radius
  const rest = { transform: pose({ x: 0, y: 0, scaleX: 1, scaleY: 1 }), borderRadius: radius }

  // Lock only while viewing. The return frame captures the viewport's document
  // position before this lock is released, so no scroll listeners or chasing springs
  // are needed to keep the closing image and its destination in the same coordinates.
  // The locked position follows the arrows (below), so the grid behind the blur is
  // already at the current spread when the view closes.
  const lockedY = useRef(0)
  useLayoutEffect(() => {
    if (closing) return
    const root = document.documentElement
    const body = document.body
    lockedY.current = window.scrollY
    const previous = {
      rootOverflow: root.style.overflow,
      rootOverscroll: root.style.overscrollBehavior,
      rootSnap: root.style.scrollSnapType,
      bodyOverflow: body.style.overflow,
      bodyOverscroll: body.style.overscrollBehavior,
    }
    const preventScroll = (event: Event) => event.preventDefault()
    const holdScrollPosition = () => {
      if (window.scrollY !== lockedY.current) window.scrollTo({ top: lockedY.current, behavior: 'instant' })
    }
    root.dataset.spreadZoomOpen = 'true'
    root.style.overflow = 'hidden'
    root.style.overscrollBehavior = 'none'
    root.style.scrollSnapType = 'none'
    body.style.overflow = 'hidden'
    body.style.overscrollBehavior = 'none'
    window.addEventListener('scroll', holdScrollPosition, { passive: true })
    window.addEventListener('wheel', preventScroll, { passive: false, capture: true })
    window.addEventListener('touchmove', preventScroll, { passive: false, capture: true })
    return () => {
      delete root.dataset.spreadZoomOpen
      window.removeEventListener('scroll', holdScrollPosition)
      window.removeEventListener('wheel', preventScroll, { capture: true })
      window.removeEventListener('touchmove', preventScroll, { capture: true })
      root.style.overflow = previous.rootOverflow
      root.style.overscrollBehavior = previous.rootOverscroll
      root.style.scrollSnapType = previous.rootSnap
      body.style.overflow = previous.bodyOverflow
      body.style.overscrollBehavior = previous.bodyOverscroll
      window.scrollTo({ top: lockedY.current, behavior: 'instant' })
    }
  }, [closing])

  // Arrow navigation: centre the new spread's card in the grid behind the blur.
  const firstSource = useRef(source)
  useLayoutEffect(() => {
    if (closing || source === firstSource.current) return
    const rect = source.getBoundingClientRect()
    const max = document.documentElement.scrollHeight - window.innerHeight
    const top = Math.round(Math.min(max, Math.max(0, window.scrollY + rect.top - (window.innerHeight - rect.height) / 2)))
    lockedY.current = top
    window.scrollTo({ top, behavior: 'instant' })
  }, [source, closing])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement | null)?.closest('.dialkit-root')) return
      if (event.key === 'Escape') onClose()
      if (closing || event.altKey || event.ctrlKey || event.metaKey) return
      if (event.target instanceof HTMLElement && (event.target.isContentEditable || event.target.matches('input, textarea, select'))) return
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        onNavigate(event.key === 'ArrowLeft' ? -1 : 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onNavigate, closing])

  const label = pages[0] === 1 ? 'Cover' : `Pages ${pageLabel(pages)}`
  const t = reduced ? { duration: 0.01 } : transition

  return createPortal(
    <div className="spread-zoom" role="dialog" aria-modal={!closing} aria-label={label} data-closing={closing || undefined}
      data-side={pages.length > 1 ? 'open' : pages[0] === 1 ? 'front' : 'back'}
      style={{
        ...(returnFrame ? {
          position: 'absolute', left: returnFrame.scrollX, top: returnFrame.scrollY,
          width: vw, height: vh, right: 'auto', bottom: 'auto', pointerEvents: 'none',
        } : {}),
        '--sz-nav-inset': `${Math.max(24, target.x - 68)}px`,
        '--sz-below': `${target.y + target.height + 20}px`,
        '--sz-tilt-angle': `${look.tilt.enabled ? look.tilt.angle : 0}deg`,
        '--sz-tilt-scale': 1 - (look.tilt.enabled ? look.tilt.push : 0),
        '--sz-perspective': `${look.tilt.perspective}px`,
        '--sz-tilt-ms': `${look.tilt.smoothing}ms`,
      } as CSSProperties}>
      <motion.div
        className="spread-zoom__backdrop"
        style={{ '--sz-blur': `${look.blur}px`, '--sz-dim': look.dimOpacity } as CSSProperties}
        initial={{ opacity: 0 }}
        animate={{ opacity: closing ? 0 : 1 }}
        transition={t}
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        className="spread-zoom__image"
        data-surface={pageSurface(pages[0])}
        data-settled={settled || undefined}
        onPointerMove={(event) => {
          if (!settled || closing || event.pointerType === 'touch') return
          const rect = event.currentTarget.getBoundingClientRect()
          event.currentTarget.style.setProperty('--sz-hx', String((event.clientX - rect.left) / rect.width * 2 - 1))
          event.currentTarget.style.setProperty('--sz-hy', String((event.clientY - rect.top) / rect.height * 2 - 1))
        }}
        onPointerLeave={(event) => {
          event.currentTarget.style.setProperty('--sz-hx', '0')
          event.currentTarget.style.setProperty('--sz-hy', '0')
        }}
        style={{ position: closing ? 'absolute' : 'fixed', left: target.x, top: target.y, width: target.width, height: target.height }}
        initial={reduced ? false : { transform: pose(origin), borderRadius: gridRadius / origin.scaleX }}
        animate={closing ? { transform: pose(home), borderRadius: gridRadius / home.scaleX } : rest}
        transition={t}
        onAnimationComplete={() => {
          if (closing) onClosed()
          else setSettled(true)
        }}
      >
        <div className="spread-zoom__surface">
        {pages.map((page) => (
          <span key={page} className="spread-zoom__page">
            <img src={diagramSources?.[page] ?? pageUrl(page, 'thumb')} alt="" />
            <img
              className="spread-zoom__sharp"
              data-layout-page={page}
              data-layout-original={pageUrl(page, 'medium')}
              style={diagramSources ? { backgroundImage: `url("${pageUrl(page, 'medium')}")`, backgroundSize: '100% 100%' } : undefined}
              src={diagramSources?.[page] ?? pageUrl(page, 'medium')}
              alt=""
              onLoad={(event) => { event.currentTarget.dataset.ready = 'true' }}
            />
          </span>
        ))}
        </div>
      </motion.div>
      {!closing && (
        <>
          <button type="button" className="spread-zoom__nav spread-zoom__prev" onClick={() => onNavigate(-1)} aria-label="Previous spread">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button type="button" className="spread-zoom__nav spread-zoom__next" onClick={() => onNavigate(1)} aria-label="Next spread">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </>
      )}
    </div>,
    document.body,
  )
}
