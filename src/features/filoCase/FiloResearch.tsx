import { useEffect, useRef, type CSSProperties } from 'react'
import { PlaybackToggle, RestartButton } from '../playback/VideoPlayback'
import './filoResearch.css'

type ResearchVisual = 'image' | 'video'
type VideoTuning = {
  speed?: number
  scale?: number
  radius?: number
  cropRight?: number
  cropTop?: number
}

export type FiloResearchSettings = {
  primaryVisual?: ResearchVisual
  miroVideo?: VideoTuning
  interviewVideo?: VideoTuning
}

type ResearchVideoProps = {
  src: string
  poster: string
  width: number
  height: number
  label: string
  speed: number
  cropRight?: number
  cropTop?: number
}

/**
 * Autoplaying research clip with playground-style controls: clicking the clip pauses or plays it,
 * the top-right button replays it from the start. A user pause sticks: scrolling back into view
 * does not resume it.
 */
function ResearchVideo({ src, poster, width, height, label, speed, cropRight = 0, cropTop = 0 }: ResearchVideoProps) {
  const ref = useRef<HTMLVideoElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const userPaused = useRef(false)
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const right = cropRight / 100
  const top = cropTop / 100
  const cropped = right > 0 || top > 0
  const mediaStyle = cropped
    ? {
        position: 'absolute',
        inset: 0,
        width: `${100 / (1 - right)}%`,
        maxWidth: 'none',
        transform: `translate(0, ${-top * 100}%)`,
        transformOrigin: 'top left',
      } satisfies CSSProperties
    : undefined

  useEffect(() => {
    const video = ref.current
    if (!video) return
    video.defaultPlaybackRate = speed
    video.playbackRate = speed
  }, [speed])

  useEffect(() => {
    const video = ref.current
    if (!video) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let visible = false
    const sync = () => {
      if (visible && !motion.matches && !userPaused.current) void video.play().catch(() => {})
      else video.pause()
    }
    const observer = new IntersectionObserver(
      ([entry]) => { visible = entry.isIntersecting; sync() },
      { threshold: 0.35 },
    )
    observer.observe(video)
    motion.addEventListener('change', sync)
    return () => {
      observer.disconnect()
      motion.removeEventListener('change', sync)
      video.pause()
    }
  }, [src])

  const restart = () => {
    const video = ref.current
    if (!video) return
    userPaused.current = false
    video.currentTime = 0
    void video.play().catch(() => {})
  }

  return (
    // Cropped clips fill the frame's aspect box; uncropped ones size the frame themselves.
    <div ref={hostRef} className="filo-research__media" style={cropped ? { position: 'absolute', inset: 0 } : undefined}>
      <video
        ref={ref}
        src={src}
        poster={poster}
        width={width}
        height={height}
        muted
        loop
        playsInline
        preload="metadata"
        disablePictureInPicture
        aria-label={label}
        style={mediaStyle}
      />
      <PlaybackToggle
        host={hostRef}
        videoSelector="video"
        reducedMotion={reducedMotion}
        feedbackOnMediaEvents={false}
        onUserToggle={(paused) => {
          userPaused.current = paused
        }}
      />
      <RestartButton onRestart={restart} />
    </div>
  )
}

export function FiloResearchFigure({ settings }: { settings?: FiloResearchSettings }) {
  const primaryVisual = settings?.primaryVisual ?? 'image'
  const miroSpeed = settings?.miroVideo?.speed ?? 1
  const miroScale = settings?.miroVideo?.scale ?? 1
  const miroRadius = settings?.miroVideo?.radius ?? 18
  const miroCropRight = settings?.miroVideo?.cropRight ?? 0
  const miroCropTop = settings?.miroVideo?.cropTop ?? 0
  const interviewSpeed = settings?.interviewVideo?.speed ?? 1
  const interviewScale = settings?.interviewVideo?.scale ?? 1
  const interviewRadius = settings?.interviewVideo?.radius ?? 18
  const visibleMiroWidth = 1280 * (1 - miroCropRight / 100)
  const visibleMiroHeight = 840 * (1 - miroCropTop / 100)

  return (
    <div className="filo-research">
      <figure className="filo-research__overview" style={{ '--research-miro-width': `${miroScale * 100}%` } as CSSProperties}>
        <div
          className="filo-research__frame filo-research__frame--overview"
          style={{
            borderRadius: `${miroRadius}px`,
            ...(primaryVisual === 'video' ? { aspectRatio: `${visibleMiroWidth} / ${visibleMiroHeight}` } : {}),
          }}
        >
          {primaryVisual === 'video' ? (
            <ResearchVideo
              src="/work/filo/research/miro-board.mp4"
              poster="/work/filo/research/miro-board.webp"
              width={1280}
              height={840}
              speed={miroSpeed}
              cropRight={miroCropRight}
              cropTop={miroCropTop}
              label="A walkthrough of Filo’s 2024 Miro research workspace, moving across vision, market research, competitor mapping and interview boards."
            />
          ) : (
            <img
              src="/work/filo/research/miro-board.webp"
              alt="Filo’s 2024 Miro research workspace, showing vision and purpose boards, market research, competitor mapping, mentor feedback and primary user interviews."
              width={948}
              height={864}
              loading="lazy"
            />
          )}
        </div>
      </figure>

      <section className="filo-research__primary" aria-labelledby="filo-primary-research-title">
        <div className="filo-research__copy">
          <p className="eyebrow">Primary market research</p>
          <h3 id="filo-primary-research-title">Industry experts made the pain visible.</h3>
          <p>We interviewed industry experts to understand where biomaterials stall inside real fashion workflows—from sourcing and testing to supplier coordination and scale.</p>
        </div>
        <figure style={{ '--research-interview-width': `${interviewScale * 100}%` } as CSSProperties}>
          <div className="filo-research__frame filo-research__frame--interviews" style={{ borderRadius: `${interviewRadius}px` }}>
            <ResearchVideo
              src="/work/filo/research/primary-interviews.mp4"
              poster="/work/filo/research/primary-interviews.webp"
              width={1280}
              height={814}
              speed={interviewSpeed}
              label="A screen recording of the primary-market-research outreach tracker used to manage interviews with fashion-industry experts."
            />
          </div>
        </figure>
      </section>
    </div>
  )
}
