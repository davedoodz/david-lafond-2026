/**
 * Our own controls over the playing YouTube video (mouse / trackpad only).
 *
 * The page cannot hide the cursor inside YouTube's cross-origin iframe, so on fine
 * pointers the iframe runs with `controls=0` and this layer stays on top of it: the
 * custom dot keeps working over the video, and the controls talk to the player through
 * the iframe API's postMessage channel (enablejsapi=1).
 *
 *   click the picture   play / pause        double-click   full screen
 *   bar                 play/pause, scrubber, time, mute, full screen
 */
import { useEffect, useRef, useState, type RefObject } from 'react'

type Props = {
  iframeRef: RefObject<HTMLIFrameElement | null>
  frameRef: RefObject<HTMLDivElement | null>
  /** Surface under the cursor dot (sets its colour). */
  surface: 'light' | 'dark'
  /** Called once, when the player first reports that it is playing. */
  onPlaying: () => void
}

type Info = { currentTime?: number; duration?: number; playerState?: number; muted?: boolean }

const PLAYING = 1
/** The bar hides after this long without pointer movement while playing. */
const IDLE_MS = 2200

const clock = (s: number) => {
  const t = Math.max(0, Math.floor(s))
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const sec = String(t % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

export function VideoControls({ iframeRef, frameRef, surface, onPlaying }: Props) {
  const [playing, setPlaying] = useState(true)
  const [muted, setMuted] = useState(false)
  const [duration, setDuration] = useState(0)
  const [idle, setIdle] = useState(false)
  const [scrubbing, setScrubbing] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)
  const timeRef = useRef<HTMLSpanElement>(null)
  // Last reported time and when it arrived, so the bar moves smoothly between reports.
  const report = useRef({ time: 0, at: 0, playing: false })
  const scrubRef = useRef<number | null>(null)
  const durationRef = useRef(0)
  // Mounting means "play": keep asking until the player confirms, since the first
  // command can arrive before the iframe's player is ready and be dropped.
  const startedRef = useRef(false)
  const onPlayingRef = useRef(onPlaying)
  onPlayingRef.current = onPlaying

  const send = (func: string, args: unknown[] = []) =>
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), 'https://www.youtube.com')

  // Subscribe to the player's state reports.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.youtube.com' || event.source !== iframeRef.current?.contentWindow) return
      let data: { event?: string; info?: Info | number }
      try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
      } catch {
        return
      }
      const info: Info =
        data.event === 'onStateChange' && typeof data.info === 'number' ? { playerState: data.info } : ((data.info as Info) ?? {})
      if (data.event !== 'infoDelivery' && data.event !== 'onStateChange' && data.event !== 'initialDelivery') return
      if (typeof info.duration === 'number' && info.duration > 0) {
        durationRef.current = info.duration
        setDuration(info.duration)
      }
      if (typeof info.muted === 'boolean') setMuted(info.muted)
      if (typeof info.playerState === 'number') {
        const on = info.playerState === PLAYING
        report.current = { ...report.current, playing: on }
        setPlaying(on)
        if (on && !startedRef.current) {
          startedRef.current = true
          onPlayingRef.current()
        }
      }
      if (typeof info.currentTime === 'number') report.current = { ...report.current, time: info.currentTime, at: performance.now() }
    }
    window.addEventListener('message', onMessage)
    // The API only reports after a "listening" handshake; repeat it (and the play command)
    // until the player is up and running.
    const post = (message: object) =>
      iframeRef.current?.contentWindow?.postMessage(JSON.stringify(message), 'https://www.youtube.com')
    const kick = () => {
      if (startedRef.current && durationRef.current) return window.clearInterval(retry)
      post({ event: 'listening', id: 1, channel: 'widget' })
      if (!startedRef.current) post({ event: 'command', func: 'playVideo', args: [] })
    }
    const retry = window.setInterval(kick, 250)
    kick()
    return () => {
      window.removeEventListener('message', onMessage)
      window.clearInterval(retry)
    }
  }, [iframeRef])

  // Progress bar + time, written straight to the DOM every frame (no React renders);
  // the text node is only touched when the shown second changes.
  useEffect(() => {
    let frame = 0
    let shown = ''
    const tick = () => {
      const r = report.current
      const d = durationRef.current
      const now = scrubRef.current ?? (r.playing ? r.time + (performance.now() - r.at) / 1000 : r.time)
      const t = d ? Math.min(now, d) : now
      if (fillRef.current) fillRef.current.style.scale = `${d ? t / d : 0} 1`
      const text = `${clock(t)} / ${clock(d)}`
      if (text !== shown && timeRef.current) timeRef.current.textContent = shown = text
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  // Hide the bar while playing and the pointer rests.
  const idleTimer = useRef(0)
  const wake = () => {
    setIdle(false)
    window.clearTimeout(idleTimer.current)
    idleTimer.current = window.setTimeout(() => setIdle(true), IDLE_MS)
  }
  useEffect(() => () => window.clearTimeout(idleTimer.current), [])

  const toggle = () => {
    if (playing) {
      send('pauseVideo')
      report.current = { ...report.current, time: report.current.time + (performance.now() - report.current.at) / 1000, at: performance.now(), playing: false }
      setPlaying(false)
    } else {
      send('playVideo')
      report.current = { ...report.current, at: performance.now(), playing: true }
      setPlaying(true)
    }
  }
  const toggleMute = () => {
    send(muted ? 'unMute' : 'mute')
    setMuted(!muted)
  }
  const toggleFullscreen = () => {
    const frame = frameRef.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null
    const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void }
    if (document.fullscreenElement || doc.webkitFullscreenElement) (document.exitFullscreen?.() ?? doc.webkitExitFullscreen?.())
    else if (frame?.requestFullscreen) void frame.requestFullscreen()
    else frame?.webkitRequestFullscreen?.()
  }

  const seekFrom = (clientX: number, final: boolean) => {
    const bar = barRef.current
    const d = durationRef.current
    if (!bar || !d) return
    const rect = bar.getBoundingClientRect()
    const t = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * d
    scrubRef.current = final ? null : t
    send('seekTo', [t, final])
    if (final) report.current = { ...report.current, time: t, at: performance.now() }
  }

  const shown = !playing || !idle || scrubbing

  return (
    <div className="vc" data-shown={shown} onPointerMove={wake} onPointerLeave={() => setIdle(true)}>
      <div
        className="vc__surface"
        data-surface={surface}
        aria-hidden="true"
        onClick={toggle}
        onDoubleClick={toggleFullscreen}
      />
      <div className="vc__bar">
        <button type="button" className="vc__btn" aria-label={playing ? 'Pause' : 'Play'} onClick={toggle}>
          {playing ? (
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" /></svg>
          )}
        </button>
        <div
          ref={barRef}
          className="vc__track"
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(report.current.time)}
          tabIndex={0}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            setScrubbing(true)
            seekFrom(event.clientX, false)
          }}
          onPointerMove={(event) => {
            if (scrubRef.current !== null) seekFrom(event.clientX, false)
          }}
          onPointerUp={(event) => {
            setScrubbing(false)
            seekFrom(event.clientX, true)
          }}
          onPointerCancel={() => {
            scrubRef.current = null
            setScrubbing(false)
          }}
          onKeyDown={(event) => {
            const step = event.key === 'ArrowRight' ? 5 : event.key === 'ArrowLeft' ? -5 : 0
            if (!step) return
            event.preventDefault()
            const t = Math.max(0, Math.min(durationRef.current, report.current.time + step))
            send('seekTo', [t, true])
            report.current = { ...report.current, time: t, at: performance.now() }
          }}
        >
          <div ref={fillRef} className="vc__fill" />
        </div>
        <span ref={timeRef} className="vc__time" />
        <button type="button" className="vc__btn" aria-label={muted ? 'Unmute' : 'Mute'} onClick={toggleMute}>
          {muted ? (
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="M16 9.5l5 5m0-5l-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          )}
        </button>
        <button type="button" className="vc__btn" aria-label="Full screen" onClick={toggleFullscreen}>
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
        </button>
      </div>
    </div>
  )
}
