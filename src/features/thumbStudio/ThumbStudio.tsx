/**
 * Recording studio for the Harvard & MIT card thumbnail (Selected works, 3rd card).
 *
 * Two stages at the card's real proportions (desktop 867:493, mobile from the saved
 * `Selected works → shape.cardHeightMobile`). Each canvas renders at export size; the
 * guides (card corners + title) are page overlays, so they never end up in a recording.
 * Record captures exactly `loops` whole loops from phase 0, so the file loops seamlessly.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import saved from '../../data/tuning.json'
import { useTuningController } from '../../tuning/useTuning'
import { THUMB_CONFIG } from './config'
import { drawFrame, type FrameValues, type MotionValues, type ShapeValues } from './motion'

type Tuple = [number, number, number, number]
type Format = 'desktop' | 'mobile'

/** Mobile card height (% of width) as saved on the site (Selected works → shape.cardHeightMobile). */
function savedMobileHeight(): number {
  const works: unknown = saved['Selected works' as keyof typeof saved]
  if (!works || typeof works !== 'object' || !('shape' in works)) return 134
  const shape = works.shape
  if (!shape || typeof shape !== 'object' || !('cardHeightMobile' in shape)) return 134
  return typeof shape.cardHeightMobile === 'number' ? shape.cardHeightMobile : 134
}

const CARD = {
  desktop: { width: 867, ratio: 493 / 867, radius: 25, title: 'The Design Portfolio that Got Me Into Harvard & MIT', titleSize: 20, inset: [45, 35] },
  mobile: {
    width: 300,
    ratio: savedMobileHeight() / 100,
    radius: 11,
    title: 'Harvard & MIT Design Portfolio',
    titleSize: 16,
    inset: [16, 16],
  },
} as const

const CONFIG = {
  ...THUMB_CONFIG,
  preview: {
    show: { type: 'select' as const, options: ['both', 'desktop', 'mobile'], default: 'both' },
    /** Card corners and title on top of the preview (never recorded). */
    guides: true,
    playing: true,
    /** Loop phase shown while paused (0..1). */
    scrub: [0, 0, 1, 0.001] as Tuple,
    restart: { type: 'action' as const, label: 'Restart loop' },
  },
  record: {
    loops: [1, 1, 6, 1] as Tuple,
    fps: [60, 24, 60, 1] as Tuple,
    mbps: [16, 2, 60, 1] as Tuple,
    desktop: { type: 'action' as const, label: 'Record desktop' },
    mobile: { type: 'action' as const, label: 'Record mobile' },
    posterDesktop: { type: 'action' as const, label: 'PNG desktop (current frame)' },
    posterMobile: { type: 'action' as const, label: 'PNG mobile (current frame)' },
  },
}

const MIME_TYPES = ['video/mp4;codecs=avc1.640033', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm']

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export function ThumbStudio() {
  const canvases = useRef<Record<Format, HTMLCanvasElement | null>>({ desktop: null, mobile: null })
  const clock = useRef(performance.now())
  const recording = useRef<Format | null>(null)
  const [status, setStatus] = useState('')
  const actions = useRef<(path: string) => void>(() => {})
  const { values: v } = useTuningController('Thumbnail studio', CONFIG, { onAction: (path) => actions.current(path) })
  const valuesRef = useRef(v)
  valuesRef.current = v

  const size = (format: Format) => {
    const width = Math.round(v[format].exportWidth / 2) * 2
    return { width, height: Math.round((width * CARD[format].ratio) / 2) * 2 }
  }

  // One rAF loop draws both stages from the shared clock.
  useEffect(() => {
    let frame = 0
    const tick = (now: number) => {
      const cur = valuesRef.current
      const live = cur.preview.playing || recording.current
      const t = live ? (((now - clock.current) / (cur.motion.loopSec * 1000)) % 1 + 1) % 1 : cur.preview.scrub
      for (const format of ['desktop', 'mobile'] as Format[]) {
        const canvas = canvases.current[format]
        const ctx = canvas?.getContext('2d')
        if (!canvas || !ctx) continue
        drawFrame(ctx, canvas.width, canvas.height, t, cur.motion as MotionValues, cur.shapes as ShapeValues, cur[format] as FrameValues)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  actions.current = async (path) => {
    if (path === 'preview.restart') {
      clock.current = performance.now()
      return
    }
    const format: Format | null = path.endsWith('esktop') ? 'desktop' : path.endsWith('obile') ? 'mobile' : null
    const canvas = format && canvases.current[format]
    if (!format || !canvas) return
    const { width, height } = canvas
    if (path.startsWith('record.poster')) {
      canvas.toBlob((blob) => blob && download(blob, `harvard-mit-thumb-${format}-${width}x${height}.png`), 'image/png')
      return
    }
    if (recording.current) return
    const mimeType = MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type))
    if (!mimeType) {
      setStatus('This browser cannot record a canvas (no MediaRecorder video support).')
      return
    }
    const cur = valuesRef.current
    const seconds = cur.record.loops * cur.motion.loopSec
    const stream = canvas.captureStream(cur.record.fps)
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: cur.record.mbps * 1_000_000 })
    const chunks: Blob[] = []
    recorder.ondataavailable = (event) => event.data.size && chunks.push(event.data)
    // Project lib is ES2023 (no Promise.withResolvers).
    const stopped = new Promise<void>((resolve) => (recorder.onstop = () => resolve()))
    recording.current = format
    clock.current = performance.now()
    recorder.start()
    const started = performance.now()
    const timer = setInterval(() => {
      const left = Math.max(0, seconds - (performance.now() - started) / 1000)
      setStatus(`Recording ${format} ${width}×${height} · ${left.toFixed(1)}s left`)
    }, 100)
    await new Promise<void>((resolve) => setTimeout(resolve, seconds * 1000))
    recorder.stop()
    await stopped
    clearInterval(timer)
    stream.getTracks().forEach((track) => track.stop())
    recording.current = null
    const ext = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm'
    download(new Blob(chunks, { type: mimeType }), `harvard-mit-thumb-${format}-${width}x${height}.${ext}`)
    setStatus(`Saved ${format} ${width}×${height} · ${cur.record.loops} loop${cur.record.loops > 1 ? 's' : ''} · ${seconds.toFixed(1)}s · ${ext}`)
  }

  const stage = (format: Format) => {
    const card = CARD[format]
    const { width, height } = size(format)
    const style = {
      '--card-w': card.width,
      '--card-radius': card.radius,
      '--title-size': card.titleSize,
      '--title-x': card.inset[0],
      '--title-y': card.inset[1],
      aspectRatio: `${width} / ${height}`,
    } as CSSProperties
    return (
      <figure className={`ts-stage ts-stage--${format}`}>
        <div className="ts-card" style={style} data-guides={v.preview.guides || undefined}>
          <canvas ref={(el) => void (canvases.current[format] = el)} width={width} height={height} />
          {v.preview.guides && <p className="ts-title">{card.title}</p>}
        </div>
        <figcaption>
          {format} · {width}×{height}
        </figcaption>
      </figure>
    )
  }

  return (
    <main className="ts" data-show={v.preview.show}>
      <header className="ts-head">
        <h1>Harvard &amp; MIT thumbnail studio</h1>
        <p>{status || 'Tune in the panel, then Record desktop / Record mobile. Guides are never recorded.'}</p>
      </header>
      <div className="ts-stages">
        {v.preview.show !== 'mobile' && stage('desktop')}
        {v.preview.show !== 'desktop' && stage('mobile')}
      </div>
    </main>
  )
}
