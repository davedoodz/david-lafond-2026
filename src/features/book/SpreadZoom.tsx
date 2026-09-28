/**
 * Grid lightbox: the clicked spread FLIPs from its grid thumbnail to a centred,
 * enlarged image over a blurred, dimmed backdrop. Clicking the backdrop or Escape
 * FLIPs it back into the (re-measured) grid slot.
 *
 * The already-loaded thumbnail shows immediately; the medium-quality image fades
 * in over it once decoded, so the zoom never waits on the network.
 */
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { motion, type Transition } from 'motion/react'
import { PAGE_ASPECT, pageLabel, pageUrl } from './bookPages'

export type ZoomLook = {
  widthVw: number
  maxHeightVh: number
  blur: number
  dimOpacity: number
  radius: number
}

type Props = {
  pages: number[]
  /** Grid thumbnail the spread flies from / back to; re-measured on close. */
  source: HTMLElement
  closing: boolean
  look: ZoomLook
  transition: Transition
  onClose: () => void
  onClosed: () => void
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

export function SpreadZoom({ pages, source, closing, look, transition, onClose, onClosed }: Props) {
  const { w: vw, h: vh } = useViewport()
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const [sharp, setSharp] = useState(false)

  const target = useMemo(() => {
    const ratio = PAGE_ASPECT * pages.length
    const width = Math.min(vw * (look.widthVw / 100), vh * (look.maxHeightVh / 100) * ratio)
    const height = width / ratio
    return { width, height, x: (vw - width) / 2, y: (vh - height) / 2 }
  }, [vw, vh, look.widthVw, look.maxHeightVh, pages.length])

  // Origin is measured once on open; the return trip re-measures in case the grid moved.
  const [origin] = useState(() => flipFrom(source.getBoundingClientRect(), target))
  const home = closing ? flipFrom(source.getBoundingClientRect(), target) : origin
  const rest = { x: 0, y: 0, scaleX: 1, scaleY: 1 }

  // Page stays put while a spread is open (same lock as the playground zoom).
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const label = pages[0] === 1 ? 'Cover' : `Pages ${pageLabel(pages)}`
  const t = reduced ? { duration: 0.01 } : transition

  return createPortal(
    <div className="spread-zoom" data-no-ink>
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
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="spread-zoom__image"
        style={{ left: target.x, top: target.y, width: target.width, height: target.height, borderRadius: look.radius }}
        initial={reduced ? false : origin}
        animate={closing ? home : rest}
        transition={t}
        onAnimationComplete={() => {
          if (closing) onClosed()
        }}
      >
        {pages.map((page) => (
          <span key={page} className="spread-zoom__page">
            <img src={pageUrl(page, 'thumb')} alt="" draggable={false} />
            <img
              className="spread-zoom__sharp"
              data-ready={sharp}
              src={pageUrl(page, 'medium')}
              alt=""
              draggable={false}
              onLoad={() => setSharp(true)}
            />
          </span>
        ))}
      </motion.div>
    </div>,
    document.body,
  )
}
