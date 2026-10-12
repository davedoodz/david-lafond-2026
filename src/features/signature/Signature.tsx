/**
 * David's handwritten signature under the hero subtitle. Replays the recorded signing motion
 * once per page load (starting the moment it enters the viewport), then stays put — no loop.
 * Clicking it (or Enter/Space when focused) signs it again; as a `role="button"` it also gets
 * the cursor's hover circle. Before any strokes are recorded, it shows the static raster with a
 * left-to-right wipe so the "signing" feel still exists.
 */
import { lazy, Suspense, useRef, useState, useSyncExternalStore } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { useInView, usePrefersReducedMotion } from '../../lib/viewport'
import { useTuningController } from '../../tuning/useTuning'
import { SIGNATURE_CONFIG } from './config'
import { getSignatureData, subscribeSignatureData } from './store'
import { SignatureCanvas } from './SignatureCanvas'
import './Signature.css'

const MOBILE_QUERY = '(max-width: 640px)'

function subscribeMobile(listener: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY)
  mql.addEventListener('change', listener)
  return () => mql.removeEventListener('change', listener)
}

const SignatureStudioLazy = import.meta.env.DEV ? lazy(() => import('./SignatureStudio')) : null

export function Signature({ className }: { className?: string }) {
  const data = useSyncExternalStore(subscribeSignatureData, getSignatureData, getSignatureData)
  const isMobile = useSyncExternalStore(subscribeMobile, () => window.matchMedia(MOBILE_QUERY).matches, () => false)
  const [studioOpen, setStudioOpen] = useState(false)
  const [replayKey, setReplayKey] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const reducedMotion = usePrefersReducedMotion()
  const enteredOnce = useInView(containerRef, { once: true, amount: 0.15 })
  const inViewNow = useInView(containerRef, { amount: 0.15 })

  const { values } = useTuningController('Signature', SIGNATURE_CONFIG, {
    onAction: (action) => {
      if (action === 'openStudio') {
        if (import.meta.env.DEV) setStudioOpen(true)
      } else if (action === 'playback.replay') {
        replay()
      }
    },
  })

  const width = isMobile ? values.layout.mobileWidth : values.layout.desktopWidth
  const height = isMobile ? values.layout.mobileHeight : values.layout.desktopHeight
  const hasStrokes = data.strokes.length > 0
  const wipeDurationMs = 1200 / values.playback.speed
  // A click (or the DialKit Replay button) signs straight away; only the first,
  // on-load signing waits for the start delay.
  function replay() {
    setReplayKey((key) => key + 1)
  }
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    replay()
  }

  return (
    <div
      ref={containerRef}
      className={`sig-root${className ? ` ${className}` : ''}`}
      role="button"
      tabIndex={0}
      aria-label="David Lafond signature. Replay signing"
      onClick={replay}
      onKeyDown={onKeyDown}
      style={
        {
          '--sig-w': `${width}px`,
          '--sig-h': `${height}px`,
          '--sig-offset-x': `${values.layout.offsetX}px`,
          '--sig-offset-y': `${values.layout.offsetY}px`,
        } as CSSProperties
      }
    >
      {hasStrokes ? (
        <SignatureCanvas
          key={replayKey}
          className="sig-canvas"
          data={data}
          pen={values.pen}
          color="var(--text-muted)"
          opacity={values.pen.opacity}
          grain={values.pen.grain}
          speed={values.playback.speed}
          startDelayMs={replayKey > 0 ? 0 : values.playback.startDelayMs}
          maxGapMs={values.playback.maxGapMs}
          play={reducedMotion ? true : inViewNow}
          mode={reducedMotion ? 'instant' : 'live'}
        />
      ) : (
        <div className="sig-fallback">
          <img
            key={replayKey}
            src="/signature-fallback.webp"
            alt=""
            className={`sig-fallback__img${enteredOnce || reducedMotion ? ' is-drawn' : ''}`}
            style={{ '--sig-wipe-ms': `${wipeDurationMs}ms` } as CSSProperties}
          />
        </div>
      )}
      {import.meta.env.DEV && studioOpen && SignatureStudioLazy && (
        <Suspense fallback={null}>
          <SignatureStudioLazy onClose={() => setStudioOpen(false)} />
        </Suspense>
      )}
    </div>
  )
}
