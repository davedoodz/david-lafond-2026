import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import {
  motion,
  AnimatePresence,
  useIsPresent,
  useMotionValue,
  useTransform,
  type Transition,
  type Variants,
} from 'motion/react'
import { PlaybackToggle, RestartButton, YouTubeButton } from '../playback/VideoPlayback'
import type { PlaygroundItem } from '../../data/playground'
import { cardRatioForViewport } from './constants'
import { restartCardVideos } from './CardVideo'

export type NavPreset = 'fade' | 'slide' | 'push' | 'scale' | 'blur' | 'flip' | 'none'

/** Arrow card-change animations. `custom` is the direction: 1 = next (enters from the right), −1 = previous. */
const NAV_VARIANTS: Record<NavPreset, Variants> = {
  fade: { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } },
  slide: {
    enter: (d: number) => ({ x: `${d * 100}%` }),
    center: { x: '0%' },
    exit: (d: number) => ({ x: `${d * -100}%` }),
  },
  push: {
    enter: (d: number) => ({ x: `${d * 30}%`, opacity: 0 }),
    center: { x: '0%', opacity: 1 },
    exit: (d: number) => ({ x: `${d * -30}%`, opacity: 0 }),
  },
  scale: {
    enter: { scale: 0.9, opacity: 0 },
    center: { scale: 1, opacity: 1 },
    exit: { scale: 1.08, opacity: 0 },
  },
  blur: {
    enter: { filter: 'blur(16px)', opacity: 0 },
    center: { filter: 'blur(0px)', opacity: 1 },
    exit: { filter: 'blur(16px)', opacity: 0 },
  },
  flip: {
    enter: (d: number) => ({ rotateY: d * 90, opacity: 0 }),
    center: { rotateY: 0, opacity: 1 },
    exit: (d: number) => ({ rotateY: d * -90, opacity: 0 }),
  },
  none: { enter: {}, center: {}, exit: {} },
}

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
  navPreset: NavPreset
  navDirection: 1 | -1
  navTransition: Transition
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
  navPreset,
  navDirection,
  navTransition,
}: Props) {
  const { w: vw, h: vh } = useViewportSize()
  const dialogRef = useRef<HTMLDivElement>(null)
  const mediaRef = useRef<HTMLDivElement>(null)

  const target = useMemo(() => {
    const ratio = cardRatioForViewport(vw)
    const width = Math.min(vw * (widthVw / 100), vh * (maxHeightVh / 100) * ratio)
    const height = width / ratio
    return { width, height, x: (vw - width) / 2, y: (vh - height) / 2 }
  }, [vw, vh, widthVw, maxHeightVh])

  const flipTo = useCallback(
    (rect: DOMRect) => ({
      x: rect.left + rect.width / 2 - (target.x + target.width / 2),
      y: rect.top + rect.height / 2 - (target.y + target.height / 2),
      scaleX: rect.width / target.width,
      scaleY: rect.height / target.height,
    }),
    [target],
  )
  const flip = useMemo(() => flipTo(originRect), [flipTo, originRect])

  // An exiting child keeps the props of its last render, so the landing rect measured at close time
  // arrives through AnimatePresence's `custom` and is read here, when the exit starts.
  const cardVariants = useMemo<Variants>(
    () => ({
      exit: (landing: DOMRect | undefined) => (reducedMotion ? { opacity: 0 } : flipTo(landing ?? originRect)),
    }),
    [flipTo, originRect, reducedMotion],
  )

  // The card FLIPs with a scale transform, which would shrink its corners along with it.
  // Divide the radius by the live scale each frame so the corners stay radiusPx on screen
  // the whole way, matching the grid card at both ends of the open/close.
  const scaleX = useMotionValue(reducedMotion ? 1 : flip.scaleX)
  const scaleY = useMotionValue(reducedMotion ? 1 : flip.scaleY)
  const borderRadius = useTransform(
    () => `${radiusPx / Math.max(scaleX.get(), 0.01)}px / ${radiusPx / Math.max(scaleY.get(), 0.01)}px`,
  )

  // After close the page unlocks right away, so the user can scroll while the card is still flying
  // back. Shift the whole stage by the scroll since close so the card lands on its grid slot as it moves.
  const isPresent = useIsPresent()
  const scrollShift = useMotionValue(0)
  useEffect(() => {
    if (isPresent) return
    const startY = window.scrollY
    const onScroll = () => scrollShift.set(startY - window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isPresent, scrollShift])

  useEffect(() => {
    dialogRef.current?.focus({ preventScroll: true })
  }, [])

  const setMediaEl = useCallback((el: HTMLDivElement | null) => {
    mediaRef.current = el
    mediaHostRef(item.id, el)
  }, [item.id, mediaHostRef])

  const closeFromStage = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) onClose()
    },
    [onClose],
  )

  const restart = useCallback(() => {
    if (mediaRef.current) restartCardVideos(mediaRef.current)
  }, [])

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
      <motion.div className="pg-zoom-stage" style={{ y: scrollShift }} onClick={closeFromStage}>
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          tabIndex={-1}
          className="pg-zoom-card"
          data-presentation={item.presentation}
          data-closing={isPresent ? undefined : ''}
          style={{ width: target.width, height: target.height, left: target.x, top: target.y, scaleX, scaleY, borderRadius }}
          initial={reducedMotion ? false : flip}
          animate={{ x: 0, y: 0, scaleX: 1, scaleY: 1 }}
          variants={cardVariants}
          exit="exit"
          transition={transition}
          onClick={(e) => e.stopPropagation()}
        >
          <AnimatePresence initial={false} custom={navDirection}>
            <motion.div
              key={item.id}
              className="pg-zoom-content"
              custom={navDirection}
              variants={NAV_VARIANTS[navPreset] ?? NAV_VARIANTS.fade}
              initial="enter"
              animate="center"
              exit="exit"
              style={navPreset === 'flip' ? { transformPerspective: 1600 } : undefined}
              transition={reducedMotion || navPreset === 'none' ? { duration: 0 } : navTransition}
            >
              <div className="pg-card-media" ref={setMediaEl} />
              <span className="card-shade" aria-hidden="true" />
              <p className="card-title">{title}</p>
            </motion.div>
          </AnimatePresence>
          {item.video && isPresent && <PlaybackToggle key={item.id} host={mediaRef} videoSelector="video.pg-video" reducedMotion={reducedMotion} pauseAnimations />}
          {item.video && isPresent && <RestartButton onRestart={restart} />}
          {item.youtube && isPresent && <YouTubeButton href={item.youtube} label={`Watch ${title} on YouTube`} />}
        </motion.div>
        {hasSiblings && isPresent && (
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
      </motion.div>
    </div>
  )
}
