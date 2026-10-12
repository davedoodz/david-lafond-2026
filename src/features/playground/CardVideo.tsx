import { useEffect, useLayoutEffect, useRef } from 'react'

/**
 * One <video> element per source for the life of the page. Grid and zoom hosts are different
 * portal containers, so React remounts CardVideo when a card opens or closes; the element itself
 * is moved between them instead of recreated, so the clip never reloads, seeks, or restarts.
 */
const videos = new Map<string, HTMLVideoElement>()

function videoFor(src: string) {
  let video = videos.get(src)
  if (!video) {
    video = document.createElement('video')
    video.src = src
    video.muted = true
    video.loop = true
    video.playsInline = true
    video.preload = 'none'
    video.draggable = false
    video.tabIndex = -1
    video.setAttribute('aria-hidden', 'true')
    videos.set(src, video)
  }
  return video
}

/** Restart every playground video inside `root`. */
export function restartCardVideos(root: ParentNode) {
  for (const video of root.querySelectorAll<HTMLVideoElement>('video.pg-video')) {
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
 * One playground video. Renders a box-less slot and moves the source's shared <video> into it.
 * React unmounts the old slot before mounting the new one in the same commit, so the element is
 * re-inserted synchronously and keeps playing from where it was.
 */
export function CardVideo({ src, poster, playbackRate, shouldPlay, className }: Props) {
  const slotRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const slot = slotRef.current
    if (!slot) return
    const video = videoFor(src)
    slot.append(video)
    return () => {
      if (video.parentNode === slot) video.remove()
    }
  }, [src])

  useLayoutEffect(() => {
    const video = videoFor(src)
    video.className = ['pg-video', className].filter(Boolean).join(' ')
    if (poster) video.poster = poster
    else video.removeAttribute('poster')
  }, [src, className, poster])

  useEffect(() => {
    videoFor(src).playbackRate = playbackRate
  }, [playbackRate, src])

  useEffect(() => {
    const video = videoFor(src)
    if (shouldPlay) void video.play().catch(() => {})
    else video.pause()
  }, [shouldPlay, src])

  return <span ref={slotRef} className="pg-video-slot" />
}
