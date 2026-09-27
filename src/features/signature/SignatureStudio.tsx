/**
 * Dev-only signature recorder. Lazily imported from Signature.tsx behind `import.meta.env.DEV`
 * so none of this — including the `perfect-freehand`-driven live preview — ships to production.
 *
 * David draws with mouse/trackpad/Apple Pencil on a pad the same aspect as the capture box,
 * capturing x/y/pressure/time per point (with coalesced events for smooth sampling). Save writes
 * straight into `src/data/signature.json` via the dev save endpoint and updates the in-memory
 * store immediately, so the hero reflects the new signature without a reload.
 */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTuning } from '../../tuning/useTuning'
import { devSave } from '../../tuning/devSave'
import { SIGNATURE_CONFIG } from './config'
import { getSignatureData, setSignatureData } from './store'
import { SignatureCanvas } from './SignatureCanvas'
import type { SignatureData, SignatureStroke, StrokePoint } from './types'
import './SignatureStudio.css'

/** Working capture resolution used when no signature has been recorded yet. */
const DEFAULT_CAPTURE = { width: 880, height: 213 }

const STATUS_LABEL: Record<'idle' | 'saving' | 'saved' | 'error', string> = {
  idle: 'Unsaved changes',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Save failed',
}

export default function SignatureStudio({ onClose }: { onClose: () => void }) {
  const values = useTuning('Signature', SIGNATURE_CONFIG)
  const [captureSize] = useState(() => {
    const saved = getSignatureData()
    return saved.width > 0 && saved.height > 0 ? { width: saved.width, height: saved.height } : DEFAULT_CAPTURE
  })
  const [strokes, setStrokes] = useState<SignatureStroke[]>(() => structuredClone(getSignatureData().strokes))
  const [liveStroke, setLiveStroke] = useState<SignatureStroke | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [previewKey, setPreviewKey] = useState(0)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(strokes.length ? 'saved' : 'idle')
  const currentStrokeRef = useRef<SignatureStroke | null>(null)
  const baseTimeRef = useRef(0)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (previewing) {
      setPreviewing(false)
      return
    }
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const rect = event.currentTarget.getBoundingClientRect()
    const scaleX = captureSize.width / rect.width
    const scaleY = captureSize.height / rect.height
    const lastPoint = strokes.at(-1)?.points.at(-1)
    baseTimeRef.current = performance.now() - (lastPoint ? lastPoint[3] : 0)
    const isPen = event.pointerType === 'pen'
    const point: StrokePoint = [(event.clientX - rect.left) * scaleX, (event.clientY - rect.top) * scaleY, isPen ? event.pressure || 0.5 : 0.5, 0]
    currentStrokeRef.current = { points: [point], pen: isPen }
    setLiveStroke(currentStrokeRef.current)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const stroke = currentStrokeRef.current
    if (!stroke) return
    const rect = event.currentTarget.getBoundingClientRect()
    const scaleX = captureSize.width / rect.width
    const scaleY = captureSize.height / rect.height
    const events = event.nativeEvent.getCoalescedEvents?.() ?? [event.nativeEvent]
    for (const nativeEvent of events) {
      const t = performance.now() - baseTimeRef.current
      const pressure = stroke.pen ? nativeEvent.pressure || 0.5 : 0.5
      stroke.points.push([(nativeEvent.clientX - rect.left) * scaleX, (nativeEvent.clientY - rect.top) * scaleY, pressure, t])
    }
    setLiveStroke({ points: stroke.points, pen: stroke.pen })
  }

  function handlePointerUp() {
    const stroke = currentStrokeRef.current
    if (!stroke) return
    currentStrokeRef.current = null
    setLiveStroke(null)
    if (stroke.points.length > 1) {
      setStrokes((prev) => [...prev, stroke])
      setStatus('idle')
    }
  }

  function handleUndo() {
    setPreviewing(false)
    setStrokes((prev) => prev.slice(0, -1))
    setStatus('idle')
  }

  function handleClear() {
    setPreviewing(false)
    setStrokes([])
    setStatus('idle')
  }

  function handleReplay() {
    setPreviewKey((key) => key + 1)
    setPreviewing(true)
  }

  async function handleSave() {
    setStatus('saving')
    const payload: SignatureData = {
      version: 1,
      width: captureSize.width,
      height: captureSize.height,
      pen: {
        size: values.pen.size,
        thinning: values.pen.thinning,
        smoothing: values.pen.smoothing,
        streamline: values.pen.streamline,
        taperStart: values.pen.taperStart,
        taperEnd: values.pen.taperEnd,
        simulatePressure: values.pen.simulatePressure,
      },
      strokes,
    }
    const ok = await devSave({ file: 'signature', data: payload })
    if (ok) {
      setSignatureData(payload)
      setStatus('saved')
    } else {
      setStatus('error')
    }
  }

  const previewData: SignatureData = { version: 1, width: captureSize.width, height: captureSize.height, strokes }

  return createPortal(
    <div className="sigstudio-backdrop" role="dialog" aria-modal="true" aria-label="Signature studio">
      <div className="sigstudio-panel">
        <header className="sigstudio-header">
          <h2 className="sigstudio-title">Signature studio</h2>
          <span className={`sigstudio-status sigstudio-status--${status}`}>{STATUS_LABEL[status]}</span>
        </header>

        <div
          className="sigstudio-pad"
          style={{ aspectRatio: `${captureSize.width} / ${captureSize.height}` }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {previewing ? (
            <SignatureCanvas
              key={previewKey}
              className="sigstudio-canvas"
              data={previewData}
              pen={values.pen}
              color={values.pen.color}
              opacity={values.pen.opacity}
              grain={values.pen.grain}
              speed={values.playback.speed}
              startDelayMs={values.playback.startDelayMs}
              maxGapMs={values.playback.maxGapMs}
              play
              mode="live"
              onDone={() => window.setTimeout(() => setPreviewing(false), 600)}
            />
          ) : (
            <SignatureCanvas
              className="sigstudio-canvas"
              data={previewData}
              pen={values.pen}
              color={values.pen.color}
              opacity={values.pen.opacity}
              grain={values.pen.grain}
              speed={values.playback.speed}
              startDelayMs={0}
              maxGapMs={values.playback.maxGapMs}
              play={false}
              mode="instant"
              liveStroke={liveStroke}
            />
          )}
        </div>

        <div className="sigstudio-actions">
          <button type="button" className="sigstudio-btn" onClick={handleUndo} disabled={strokes.length === 0}>
            Undo stroke
          </button>
          <button type="button" className="sigstudio-btn" onClick={handleClear} disabled={strokes.length === 0}>
            Clear
          </button>
          <button
            type="button"
            className="sigstudio-btn"
            onClick={handleReplay}
            disabled={strokes.length === 0 || previewing}
          >
            Replay preview
          </button>
          <button type="button" className="sigstudio-btn sigstudio-btn--primary" onClick={handleSave} disabled={status === 'saving'}>
            Save
          </button>
          <button type="button" className="sigstudio-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
