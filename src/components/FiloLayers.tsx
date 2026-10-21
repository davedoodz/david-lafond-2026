/**
 * The Filo card's layers over its catalog wall: the phone (bottom left) taps through a material
 * record, the tag hangs on its cord in the middle, the portal (right) clicks through Samples and
 * Orders. While the card is in view they slide in one by one, stay, slide out and come back.
 * Placement and timing are the studio's picked layout (src/features/filoThumb/config.ts); the
 * desktop or mobile layout follows the card's mobile breakpoint. Reduced motion: layers stay put, clips still.
 */
import { useEffect, useRef, useSyncExternalStore, type CSSProperties } from 'react'
import { FILO_LAYOUT, FILO_MEDIA, FILO_MOTION, TAG_ART, type Layout } from '../features/filoThumb/config'
import './FiloLayers.css'

// The Selected Works mobile card (100 : 134) starts at this width (SelectedWorks.css).
const MOBILE_QUERY = '(max-width: 640px)'
const subscribeMobile = (onChange: () => void) => {
  const query = window.matchMedia(MOBILE_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

const SWAY_PERIOD = 6.5
const px = (n: number) => `${n}px`

function layerStyles(L: Layout) {
  const { phone, desk, tag } = L
  const k = tag.size / TAG_ART.height
  const imgTop = tag.y - TAG_ART.top * k
  return {
    phone: { left: px(phone.x), top: px(phone.y), '--h': px(phone.size), '--d': `${FILO_MOTION.delay.phone}s` } as CSSProperties,
    desk: { left: px(desk.x), top: px(desk.y), '--w': px(desk.size), '--d': `${FILO_MOTION.delay.desk}s` } as CSSProperties,
    tag: {
      left: px(tag.x - TAG_ART.cx * k),
      top: px(imgTop),
      '--tw': px(TAG_ART.w * k),
      '--hang': px(Math.max(0, imgTop + 12)),
      '--d': `${FILO_MOTION.delay.tag}s`,
      '--sway-dur': `${SWAY_PERIOD / FILO_MOTION.sway}s`,
      '--cord': `url(${FILO_MEDIA.cord})`,
    } as CSSProperties,
  }
}

export function FiloLayers() {
  const mobile = useSyncExternalStore(subscribeMobile, () => window.matchMedia(MOBILE_QUERY).matches, () => false)
  const L = FILO_LAYOUT[mobile ? 'm' : 'd']
  const hostRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const phoneRef = useRef<HTMLVideoElement>(null)
  const deskRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const host = hostRef.current
    const stage = stageRef.current
    const phone = phoneRef.current
    const desk = deskRef.current
    if (!host || !stage || !phone || !desk) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const clips: [HTMLVideoElement, number, number][] = [
      [phone, FILO_MOTION.rate.phone, FILO_MOTION.delay.phone],
      [desk, FILO_MOTION.rate.desk, FILO_MOTION.delay.desk],
    ]
    let timers: number[] = []
    const later = (fn: () => void, s: number) => timers.push(window.setTimeout(fn, s * 1000))
    const stop = () => {
      timers.forEach(clearTimeout)
      timers = []
    }

    const resize = new ResizeObserver(() => {
      const s = host.clientWidth / L.width
      stage.style.setProperty('--fl-scale', String(s))
      stage.style.width = px(L.width)
      stage.style.height = px(host.clientHeight / s)
    })
    resize.observe(host)

    // Clips load with the page, so the card never shows an empty screen (lib/mediaWarmup).
    phone.src = FILO_MEDIA.phone
    desk.src = FILO_MEDIA.desk

    const enter = () => {
      stage.classList.remove('is-out', 'is-in')
      void stage.offsetWidth // snap out (no transition), so the entrance replays
      for (const [v, rate, delay] of clips) {
        v.pause()
        v.currentTime = 0
        v.defaultPlaybackRate = v.playbackRate = rate
        later(() => void v.play().catch(() => {}), delay)
      }
      stage.classList.add('is-in')
      later(() => {
        stage.classList.replace('is-in', 'is-out')
        later(enter, FILO_MOTION.exit / FILO_MOTION.slide + FILO_MOTION.away)
      }, FILO_MOTION.stay)
    }
    const seen = new IntersectionObserver(([entry]) => {
      stop()
      if (!entry.isIntersecting) {
        stage.classList.remove('is-in', 'is-out')
        for (const [v] of clips) v.pause()
        return
      }
      if (reduced.matches) stage.classList.add('is-in')
      else enter()
    }, { threshold: 0.4 })
    seen.observe(host)

    return () => {
      stop()
      resize.disconnect()
      seen.disconnect()
    }
  }, [L])

  const s = layerStyles(L)
  return (
    <div ref={hostRef} className="fl-host" aria-hidden="true">
      <div ref={stageRef} className="fl-stage" style={{ '--fl-k': 1 / FILO_MOTION.slide } as CSSProperties}>
        <div className="fl-desk" style={s.desk}>
          <video ref={deskRef} poster={FILO_MEDIA.deskPoster} muted loop playsInline preload="auto" />
        </div>
        <div className="fl-phone" style={s.phone}>
          <video ref={phoneRef} poster={FILO_MEDIA.phonePoster} muted loop playsInline preload="auto" />
        </div>
        <div className="fl-tag" style={s.tag}>
          <i />
          <img src={FILO_MEDIA.tag} alt="" />
        </div>
      </div>
    </div>
  )
}
