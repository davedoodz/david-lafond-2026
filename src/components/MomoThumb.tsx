/**
 * The Momo card's thumbnail: Momo, the Watch and the iPhone, heartbeat lines and the input →
 * output pills, on a loop (src/features/momoThumb). It plays the values saved in the studio
 * (studio/momo-thumbnail.html → tuning.json "MomoThumbnail"). The card's own mesh, shade and
 * title sit around it; the desktop or mobile layout follows the card's mobile breakpoint.
 */
import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react'
import { useTuning } from '../tuning/useTuning'
import { MOMO_THUMB_CONFIG } from '../features/momoThumb/config'
import { mountMomoThumb, sceneHTML, type MomoThumb as Thumb } from '../features/momoThumb/engine.js'
import '../pages/DeviceInsights.css'
import './MomoThumb.css'

// The Selected Works mobile card (100 : 134) starts at this width (SelectedWorks.css).
const MOBILE_QUERY = '(max-width: 640px)'
const subscribeMobile = (onChange: () => void) => {
  const query = window.matchMedia(MOBILE_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

export function MomoThumb() {
  const values = useTuning('MomoThumbnail', MOMO_THUMB_CONFIG)
  const mobile = useSyncExternalStore(subscribeMobile, () => window.matchMedia(MOBILE_QUERY).matches, () => false)
  const hostRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<Thumb | null>(null)
  const valuesRef = useRef(values)
  valuesRef.current = values

  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return
    host.innerHTML = sceneHTML(mobile ? 'm' : 'd', { chrome: false })
    const thumb = mountMomoThumb({ root: host, cards: [...host.querySelectorAll<HTMLElement>('.mt-card')] })
    thumb.apply(valuesRef.current)
    thumbRef.current = thumb
    return () => {
      thumb.destroy()
      thumbRef.current = null
      host.replaceChildren()
    }
  }, [mobile])

  // Live tuning in dev (the DialKit panel); production values are static.
  useEffect(() => thumbRef.current?.apply(values), [values])

  return <div ref={hostRef} className="mt-host" aria-hidden="true" />
}
