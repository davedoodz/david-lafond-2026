import { useEffect, useLayoutEffect, useRef } from 'react'

/** Last playhead per source, so grid ↔ zoom remounts resume instead of restarting. */
const playheads = new Map<string, number>()

/** Restart every playground video inside `root` and clear each saved playhead. */
export function restartCardVideos(root: ParentNode) {
  for (const video of root.querySelectorAll<HTMLVideoElement>('video.pg-video')) {
    const src = video.getAttribute('src')
    if (src) playheads.set(src, 0)
    video.currentTime = 0
    void video.play().catch(() => {})
  }
}

type Props = {
  src: string
  poster?: string
  playbackRate: number
  className?: string
  /** Play only while the card is on screen (grid) or zoomed. */
  shouldPlay: boolean
}

/**
 * One playground video. Grid and zoom hosts are different portal containers, so React may
 * remount this element when a card opens or closes; the saved playhead resumes it.
 */
export function CardVideo({ src, poster, playbackRate, shouldPlay, className }: Props) {
  const ref = useRef<HTMLVideoElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const restore = () => {
      const time = playheads.get(src)
      if (time && Number.isFinite(el.duration)) el.currentTime = time % el.duration
    }
    const save = () => playheads.set(src, el.currentTime)
    if (el.readyState >= HTMLMediaElement.HAVE_METADATA) restore()
    else el.addEventListener('loadedmetadata', restore, { once: true })
    el.addEventListener('timeupdate', save)
    return () => {
      save()
      el.removeEventListener('loadedmetadata', restore)
      el.removeEventListener('timeupdate', save)
    }
  }, [src])
  useEffect(() => {
    if (ref.current) ref.current.playbackRate = playbackRate
  }, [playbackRate, src])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (shouldPlay) {
      const playPromise = el.play()
      if (playPromise) playPromise.catch(() => {})
    } else {
      el.pause()
    }
  }, [shouldPlay, src])

  return (
    <video
      ref={ref}
      className={['pg-video', className].filter(Boolean).join(' ')}
      src={src}
      poster={poster}
      draggable={false}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
      tabIndex={-1}
    />
  )
}
