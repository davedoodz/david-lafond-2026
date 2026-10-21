import { useEffect, useLayoutEffect, useRef } from 'react'

/**
 * One <video> element per source for the life of the page. Grid and zoom hosts are different
 * portal containers, so React remounts CardVideo when a card opens or closes; the element itself
 * is moved between them instead of recreated, so the clip never reloads, seeks, or restarts.
 */
const videos = new Map<string, HTMLVideoElement>()

/**
 * Videos that should be playing now (on screen or zoomed). iOS Safari can refuse or drop playback
 * (Low Power Mode blocks autoplay; memory pressure stops decoders) and then paints nothing at all,
 * not even the poster. Two guards keep a card from ever showing blank:
 *  - the poster is also the video element's own CSS background (`--pg-poster`, Playground.css),
 *    painted by the image pipeline under whatever the video draws, so a still frame always shows;
 *  - a refused or stalled video is asked to play again once it can, on the next touch (a gesture
 *    lifts Low Power Mode's autoplay block), and when the tab comes back.
 */
const wanted = new Set<HTMLVideoElement>()
const play = (video: HTMLVideoElement) => void video.play().catch(() => {})
const resumeWanted = () => {
  if (document.hidden) return
  for (const video of wanted) if (video.paused) play(video)
}
let resumeInstalled = false
function installResume() {
  if (resumeInstalled) return
  resumeInstalled = true
  window.addEventListener('pointerdown', resumeWanted, { capture: true, passive: true })
  window.addEventListener('touchend', resumeWanted, { capture: true, passive: true })
  window.addEventListener('pageshow', resumeWanted)
  document.addEventListener('visibilitychange', resumeWanted)
}

function videoFor(src: string) {
  let video = videos.get(src)
  if (!video) {
    const created = document.createElement('video')
    video = created
    video.src = src
    video.muted = true
    video.loop = true
    video.playsInline = true
    video.preload = 'none'
    video.draggable = false
    video.tabIndex = -1
    video.setAttribute('aria-hidden', 'true')
    // Data arrived after a refused or stalled start: try again.
    const retry = () => {
      if (wanted.has(created) && created.paused) play(created)
    }
    video.addEventListener('canplay', retry)
    video.addEventListener('stalled', () => {
      if (wanted.has(created) && created.readyState < 3) created.load()
    })
    videos.set(src, video)
    installResume()
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
    if (poster) {
      video.poster = poster
      video.style.setProperty('--pg-poster', `url("${poster}")`)
    } else {
      video.removeAttribute('poster')
      video.style.removeProperty('--pg-poster')
    }
  }, [src, className, poster])

  useEffect(() => {
    videoFor(src).playbackRate = playbackRate
  }, [playbackRate, src])

  useEffect(() => {
    const video = videoFor(src)
    if (!shouldPlay) {
      video.pause()
      return
    }
    wanted.add(video)
    play(video)
    return () => {
      wanted.delete(video)
    }
  }, [shouldPlay, src])

  return <span ref={slotRef} className="pg-video-slot" />
}
