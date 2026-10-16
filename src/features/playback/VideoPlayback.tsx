import { useEffect, useRef, useState, type RefObject } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { useTuning } from '../../tuning/useTuning'
import './videoPlayback.css'

const PLAYBACK_CONFIG = {
  scale: [1, 0.4, 3, 0.05] as [number, number, number, number],
  fadeInMs: [180, 0, 1000, 10] as [number, number, number, number],
  holdMs: [450, 0, 2000, 10] as [number, number, number, number],
  fadeOutMs: [300, 0, 1500, 10] as [number, number, number, number],
}

type ToggleProps = {
  /** Element containing the videos; the toggle covers it. */
  host: RefObject<HTMLElement | null>
  /** Which videos inside `host` the toggle drives. Omit when the owner pauses everything via `onUserToggle`. */
  videoSelector?: string
  reducedMotion: boolean
  /** Also freeze running CSS/Web animations inside `host` while paused (playground cards). */
  pauseAnimations?: boolean
  /**
   * Show the icon when the video pauses or plays on its own (e.g. a restart). Off when something else,
   * like scrolling out of view, also starts and stops it, so only clicks flash the icon.
   */
  feedbackOnMediaEvents?: boolean
  /** Told about every click, so the owner can keep a user pause from being undone. */
  onUserToggle?: (paused: boolean) => void
  /** What the button names in its label: "Pause <subject>" / "Play <subject>". */
  subject?: string
}

/**
 * The media surface as a play/pause button, with a centred icon that fades in: pause stays while paused,
 * play clears after its hold. Shared by the playground zoom and the Filo research videos; both read the
 * "Playground playback" dials so the feel stays identical.
 */
export function PlaybackToggle({
  host,
  videoSelector,
  reducedMotion,
  pauseAnimations = false,
  feedbackOnMediaEvents = true,
  onUserToggle,
  subject = 'video',
}: ToggleProps) {
  const t = useTuning('Playground playback', PLAYBACK_CONFIG)
  const [paused, setPaused] = useState(false)
  const [feedback, setFeedback] = useState<'pause' | 'play' | null>(null)
  const pausedAnimations = useRef<Animation[]>([])

  useEffect(() => {
    const root = host.current
    if (!root || !videoSelector) return
    const first = root.querySelector<HTMLVideoElement>(videoSelector)
    if (first) setPaused(first.paused)
    const sync = (event: Event) => {
      if (!(event.target instanceof HTMLVideoElement) || !event.target.matches(videoSelector)) return
      const stopped = event.target.paused
      setPaused(stopped)
      if (feedbackOnMediaEvents) setFeedback(stopped ? 'pause' : 'play')
      else if (!stopped) setFeedback((current) => (current === 'pause' ? null : current))
    }
    root.addEventListener('pause', sync, true)
    root.addEventListener('play', sync, true)
    return () => {
      root.removeEventListener('pause', sync, true)
      root.removeEventListener('play', sync, true)
    }
  }, [host, videoSelector, feedbackOnMediaEvents])

  useEffect(() => {
    if (feedback !== 'play') return
    const timer = window.setTimeout(() => setFeedback(null), (reducedMotion ? 0 : t.fadeInMs) + t.holdMs)
    return () => window.clearTimeout(timer)
  }, [feedback, t.fadeInMs, t.holdMs, reducedMotion])

  return (
    <button
      type="button"
      className="playback-toggle"
      aria-label={paused ? `Play ${subject}` : `Pause ${subject}`}
      onClick={() => {
        const root = host.current
        if (!root) return
        const willPause = !paused
        setPaused(willPause)
        setFeedback(willPause ? 'pause' : 'play')
        onUserToggle?.(willPause)
        const videos = videoSelector ? root.querySelectorAll<HTMLVideoElement>(videoSelector) : []
        if (willPause) {
          if (pauseAnimations) {
            pausedAnimations.current = root.getAnimations({ subtree: true }).filter((animation) => animation.playState === 'running')
            pausedAnimations.current.forEach((animation) => animation.pause())
          }
          videos.forEach((video) => video.pause())
        } else {
          pausedAnimations.current.forEach((animation) => animation.playState === 'paused' && animation.play())
          pausedAnimations.current = []
          videos.forEach((video) => void video.play().catch(() => {}))
        }
      }}
    >
      <AnimatePresence>
        {feedback && (
          <motion.span
            key={feedback}
            className="playback-feedback"
            style={{ width: 88 * t.scale, height: 88 * t.scale }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: reducedMotion ? 0 : t.fadeOutMs / 1000 } }}
            transition={{ duration: reducedMotion ? 0 : t.fadeInMs / 1000 }}
          >
            {feedback === 'pause' ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}

/** Top-right replay circle that sits above the playback toggle. */
export function RestartButton({ onRestart, label = 'Restart video' }: { onRestart: () => void; label?: string }) {
  return (
    <button type="button" className="playback-restart" onClick={onRestart} aria-label={label}>
      <RotateCcw aria-hidden="true" strokeWidth={1.6} />
    </button>
  )
}

/** YouTube link styled like the replay circle, placed just left of it. Opens in a new tab. */
export function YouTubeButton({ href, label }: { href: string; label: string }) {
  return (
    <a className="playback-restart playback-youtube" href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
        <path d="m10 15 5-3-5-3z" />
      </svg>
    </a>
  )
}
