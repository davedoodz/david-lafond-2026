import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { motion, AnimatePresence, type Transition } from 'motion/react'
import type { PlaygroundItem } from '../../data/playground'
import { cardRatioForViewport } from './constants'

type Props = {
  item: PlaygroundItem
  title: string
  originRect: DOMRect
  transition: Transition
  widthVw: number
  maxHeightVh: number
  blurPx: number
  dimOpacity: number
  radiusPx: number
  hasSiblings: boolean
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  mediaHostRef: (id: string, el: HTMLDivElement | null) => void
  reducedMotion: boolean
}

function useViewportSize() {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return size
}

/** Fullscreen modal: blurred/dimmed backdrop + the active card FLIP-animated from its grid rect to a centered rect. */
export function PlaygroundZoom({
  item,
  title,
  originRect,
  transition,
  widthVw,
  maxHeightVh,
  blurPx,
  dimOpacity,
  radiusPx,
  hasSiblings,
  onClose,
  onPrev,
  onNext,
  mediaHostRef,
  reducedMotion,
}: Props) {
  const { w: vw, h: vh } = useViewportSize()
  const dialogRef = useRef<HTMLDivElement>(null)

  const target = useMemo(() => {
    const ratio = cardRatioForViewport(vw)
    const width = Math.min(vw * (widthVw / 100), vh * (maxHeightVh / 100) * ratio)
    const height = width / ratio
    return { width, height, x: (vw - width) / 2, y: (vh - height) / 2 }
  }, [vw, vh, widthVw, maxHeightVh])

  const flip = useMemo(() => {
    const originCx = originRect.left + originRect.width / 2
    const originCy = originRect.top + originRect.height / 2
    const targetCx = target.x + target.width / 2
    const targetCy = target.y + target.height / 2
    return {
      x: originCx - targetCx,
      y: originCy - targetCy,
      scaleX: originRect.width / target.width,
      scaleY: originRect.height / target.height,
    }
  }, [originRect, target])

  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  const setMediaEl = useCallback((el: HTMLDivElement | null) => mediaHostRef(item.id, el), [item.id, mediaHostRef])

  const closeFromStage = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) onClose()
    },
    [onClose],
  )

  const backdropStyle = {
    '--pg-dim-opacity': dimOpacity,
    '--pg-zoom-blur': `${blurPx}px`,
  } as CSSProperties

  return (
    <div className="pg-zoom">
      <motion.div
        className="pg-zoom-backdrop"
        style={backdropStyle}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={reducedMotion ? { duration: 0.01 } : transition}
        aria-hidden="true"
      />
      <div className="pg-zoom-stage" onClick={closeFromStage}>
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          tabIndex={-1}
          className="pg-zoom-card"
          data-presentation={item.presentation}
          style={{ width: target.width, height: target.height, left: target.x, top: target.y, borderRadius: radiusPx }}
          initial={reducedMotion ? false : flip}
          animate={{ x: 0, y: 0, scaleX: 1, scaleY: 1 }}
          exit={reducedMotion ? { opacity: 0 } : flip}
          transition={transition}
          onClick={(e) => e.stopPropagation()}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={item.id}
              className="pg-zoom-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="pg-card-media" ref={setMediaEl} />
              <span className="card-shade" aria-hidden="true" />
              <p className="card-title">{title}</p>
            </motion.div>
          </AnimatePresence>
        </motion.div>
        {hasSiblings && (
          <>
            <button type="button" className="pg-zoom-nav pg-zoom-prev" onClick={onPrev} aria-label="Previous prototype">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button type="button" className="pg-zoom-nav pg-zoom-next" onClick={onNext} aria-label="Next prototype">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
