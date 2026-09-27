import { useEffect, useRef } from 'react'

type Props = {
  src: string
  poster?: string
  /** Play only while the card is on screen (grid) or zoomed. */
  shouldPlay: boolean
}

/**
 * A single persistent <video> element per playground item. It is portaled
 * between the grid card and the zoom overlay by its host container (see
 * Playground.tsx), so it is never unmounted/recreated when a card zooms —
 * playback continues from the same element, no reload.
 */
export function CardVideo({ src, poster, shouldPlay }: Props) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (shouldPlay) {
      const playPromise = el.play()
      if (playPromise) playPromise.catch(() => {})
    } else {
      el.pause()
    }
  }, [shouldPlay])

  return (
    <video
      ref={ref}
      className="pg-video"
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
      tabIndex={-1}
    />
  )
}
