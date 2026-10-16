import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { motion, useIsPresent, useMotionValue, useTransform, type Transition, type Variants } from 'motion/react'

type Props = {
  /** Already fetched and decoded by the caller, so the zoom paints the photo on its first frame. */
  src: string
  alt: string
  /** White title over a bottom shade, like a playground zoom card. Empty hides both. */
  caption: string
  /** `--title-*` / `--shade-*` vars for the caption, the same ones the playground sets. */
  captionStyle: CSSProperties
  /** The lifted card's rect at open; the zoom FLIPs from here. */
  originRect: DOMRect
  /** Photo width / height. */
  ratio: number
  widthVw: number
  maxHeightVh: number
  blurPx: number
  dimOpacity: number
  radiusPx: number
  transition: Transition
  reducedMotion: boolean
  onClose: () => void
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

/**
 * Lightbox for a Filo milestone photo, matching the About playground zoom: blurred, dimmed backdrop and
 * the card FLIP-animated from its (lifted) page rect to the centre on the same spring. No arrows.
 * Clicking outside the photo or Escape closes; the exit FLIPs back to the rect passed as AnimatePresence
 * `custom`. Mount inside AnimatePresence, portaled to <body>.
 */
export function FiloPhotoZoom({
  src,
  alt,
  caption,
  captionStyle,
  originRect,
  ratio,
  widthVw,
  maxHeightVh,
  blurPx,
  dimOpacity,
  radiusPx,
  transition,
  reducedMotion,
  onClose,
}: Props) {
  const { w: vw, h: vh } = useViewportSize()
  const dialogRef = useRef<HTMLDivElement>(null)
  const isPresent = useIsPresent()

  const target = useMemo(() => {
    const width = Math.min(vw * (widthVw / 100), vh * (maxHeightVh / 100) * ratio)
    const height = width / ratio
    return { width, height, x: (vw - width) / 2, y: (vh - height) / 2 }
  }, [vw, vh, widthVw, maxHeightVh, ratio])

  const flipTo = (rect: DOMRect) => ({
    x: rect.left + rect.width / 2 - (target.x + target.width / 2),
    y: rect.top + rect.height / 2 - (target.y + target.height / 2),
    scaleX: rect.width / target.width,
    scaleY: rect.height / target.height,
  })
  const flip = flipTo(originRect)
  const variants: Variants = {
    exit: (landing: DOMRect | undefined) => (reducedMotion ? { opacity: 0 } : flipTo(landing ?? originRect)),
  }

  // Keep the corners radiusPx on screen while the scale transform runs, so both ends match the page card.
  const scaleX = useMotionValue(reducedMotion ? 1 : flip.scaleX)
  const scaleY = useMotionValue(reducedMotion ? 1 : flip.scaleY)
  const borderRadius = useTransform(
    () => `${radiusPx / Math.max(scaleX.get(), 0.01)}px / ${radiusPx / Math.max(scaleY.get(), 0.01)}px`,
  )

  useEffect(() => {
    dialogRef.current?.focus({ preventScroll: true })
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="filo-zoom" data-surface="dark" onClick={onClose}>
      <motion.div
        className="filo-zoom__backdrop"
        style={{ '--fz-dim': dimOpacity, '--fz-blur': `${blurPx}px` } as CSSProperties}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={reducedMotion ? { duration: 0.01 } : transition}
        aria-hidden="true"
      />
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={alt}
        tabIndex={-1}
        className="filo-zoom__card"
        data-closing={isPresent ? undefined : ''}
        style={{ ...captionStyle, width: target.width, height: target.height, left: target.x, top: target.y, scaleX, scaleY, borderRadius }}
        initial={reducedMotion ? { opacity: 0 } : flip}
        animate={{ x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 }}
        variants={variants}
        exit="exit"
        transition={transition}
        onClick={(event) => event.stopPropagation()}
      >
        <img src={src} alt={alt} decoding="sync" draggable={false} />
        {caption && (
          <>
            <span className="card-shade" aria-hidden="true" />
            <p className="card-title">{caption}</p>
          </>
        )}
      </motion.div>
    </div>
  )
}
