import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { useTuning } from '../../tuning/useTuning'
import catalog from '../../../studio/ecofabriq/products.json'
import { SHEET_GRID, SHEET_VIEWS, decodeSheet } from './turntableSheets'
import './filoMaterialLoop.css'

type Tuple = [number, number, number, number]

const CONFIG = {
  loop: {
    /** Travel round the loop and each product's own turn, together (1 = a lap in 60s, a turn in 9s). */
    speed: [1, 0.1, 3, 0.05] as Tuple,
    /** Width of the loop (px); capped to the window. Products scale with it. */
    size: [880, 400, 1400, 10] as Tuple,
    /** Product name, maker and biomaterial under each product, in one of six Inter treatments, or none. */
    labels: { type: 'select' as const, options: ['Hidden', 'Catalog', 'Made from', 'Material first', 'Eyebrow', 'Chip', 'Whisper'], default: 'Hidden' },
  },
}

/** The Future Fabric catalog (studio/ecofabriq/products.json); every sheet also ships in public/work/filo/sprites. */
const PRODUCTS = catalog.map((p, i) => ({
  ...p,
  sheet: `/work/filo/sprites/${p.sprite}`,
  /** Staggered turns: golden-ratio steps keep neighbours from ever facing the same way at once. */
  phase: (i * 0.618034) % 1,
}))
/** Px per view in the shipped sheets (1536px, 6 × 6). */
const VIEW_PX = 256
const LAP_SECONDS = 60
const TURN_SECONDS = 9

/* Design space: a 1000-wide stage; everything scales with the loop's width. The products travel an
   invisible lemniscate of Bernoulli drawn like the Filo tag's embossed mark: stretched tall so the lobes
   read as near-circles, the left lobe larger than the right, and the whole loop tilted up to the right.
   The stage is as tall as that needs. */
const STAGE_W = 1000
const ITEM = 128
const A = 380
const Y_STRETCH = 1.2
/** Each lobe scales about the crossing, so the curve stays smooth there (it's an inflection point). */
const LEFT_LOBE = 1.14
const RIGHT_LOBE = 0.84
const TILT_DEG = -9
const SAMPLES = 1200

/** Points evenly spaced by arc length, so products travel at one speed through the lobes and the crossing. */
function buildPath() {
  const tilt = (TILT_DEG * Math.PI) / 180
  const shaped: [number, number][] = []
  for (let i = 0; i <= SAMPLES; i++) {
    const t = (i / SAMPLES) * Math.PI * 2
    const d = 1 + Math.sin(t) ** 2
    const s = Math.cos(t) < 0 ? LEFT_LOBE : RIGHT_LOBE
    const x = (s * A * Math.cos(t)) / d
    const y = (s * Y_STRETCH * A * Math.sin(t) * Math.cos(t)) / d
    shaped.push([x * Math.cos(tilt) - y * Math.sin(tilt), x * Math.sin(tilt) + y * Math.cos(tilt)])
  }
  // Centre the drawn loop on the stage and size the stage to hold it plus a product's height.
  const xs = shaped.map(([x]) => x)
  const ys = shaped.map(([, y]) => y)
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const height = Math.ceil(maxY - minY + ITEM)
  const raw = shaped.map(([x, y]): [number, number] => [x - (minX + maxX) / 2 + STAGE_W / 2, y - (minY + maxY) / 2 + height / 2])
  const lengths = [0]
  for (let i = 1; i < raw.length; i++) lengths.push(lengths[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]))
  const total = lengths[lengths.length - 1]
  const even: [number, number][] = []
  for (let i = 0, j = 0; i < SAMPLES; i++) {
    const target = (i / SAMPLES) * total
    while (lengths[j + 1] < target) j++
    const f = (target - lengths[j]) / (lengths[j + 1] - lengths[j] || 1)
    even.push([raw[j][0] + (raw[j + 1][0] - raw[j][0]) * f, raw[j][1] + (raw[j + 1][1] - raw[j][1]) * f])
  }
  return { points: even, height }
}

/**
 * What's next: the seventeen Future Fabric products travelling an infinity loop, each turning on its
 * own, staggered. One clock drives travel and turns, so the speed dial changes both without a jump. Runs
 * only on screen; reduced motion holds every product still, facing front, spaced round the loop.
 */
export function FiloMaterialLoop() {
  const dials = useTuning('Filo next loop', CONFIG)
  const { points, height } = useMemo(buildPath, [])
  const rootRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([])
  const labelRefs = useRef<(HTMLDivElement | null)[]>([])
  const speedRef = useRef(dials.loop.speed)
  useEffect(() => { speedRef.current = dials.loop.speed }, [dials.loop.speed])
  // Lets a labels switch position the new labels at once, even while the loop is paused off screen.
  const placeRef = useRef<() => void>(undefined)
  const labels = dials.loop.labels
  useEffect(() => placeRef.current?.(), [labels])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    const bitmaps: (ImageBitmap | undefined)[] = []
    const shown = PRODUCTS.map(() => -1)
    let decodedAt = 0
    let k = 1
    let clock = 0
    let last = 0
    let raf = 0
    let visible = false
    let near = false
    let alive = true
    let timer = 0

    const place = () => {
      const lap = reduced.matches ? 0 : clock / LAP_SECONDS
      PRODUCTS.forEach((p, i) => {
        const item = itemRefs.current[i]
        if (!item) return
        const at = (((lap + i / PRODUCTS.length) % 1) + 1) % 1
        const [x, y] = points[Math.floor(at * points.length) % points.length]
        const move = `translate(${((x - ITEM / 2) * k).toFixed(1)}px, ${((y - ITEM / 2) * k).toFixed(1)}px)`
        item.style.transform = move
        // Lower on the stage reads as nearer: it draws over what it passes.
        item.style.zIndex = String(Math.round(y))
        // Labels ride in their own layer above every product, so no product covers a name.
        const label = labelRefs.current[i]
        if (label) label.style.transform = move
        const bitmap = bitmaps[i]
        const canvas = canvasRefs.current[i]
        if (!bitmap || !canvas) return
        const view = reduced.matches ? 0 : Math.floor((((clock / TURN_SECONDS + p.phase) % 1) + 1) % 1 * SHEET_VIEWS)
        if (view === shown[i]) return
        shown[i] = view
        const ctx = canvas.getContext('2d')
        const t = bitmap.width / SHEET_GRID
        ctx?.clearRect(0, 0, canvas.width, canvas.height)
        ctx?.drawImage(bitmap, (view % SHEET_GRID) * t, Math.floor(view / SHEET_GRID) * t, t, t, 0, 0, canvas.width, canvas.height)
      })
    }
    placeRef.current = place
    const tick = (now: number) => {
      if (last) clock += ((now - last) / 1000) * speedRef.current
      last = now
      place()
      raf = requestAnimationFrame(tick)
    }
    const sync = () => {
      cancelAnimationFrame(raf)
      raf = 0
      last = 0
      if (visible && !reduced.matches) raf = requestAnimationFrame(tick)
      else place()
    }
    // Each sheet decodes once at the canvases' device-pixel size (never above the sheet's own).
    const decode = async () => {
      const px = Math.min(VIEW_PX, Math.round(ITEM * k * devicePixelRatio))
      if (!near || px <= decodedAt) return
      decodedAt = px
      await Promise.all(PRODUCTS.map(async (p, i) => {
        const next = await decodeSheet(p.sheet, px * SHEET_GRID)
        if (!alive || decodedAt !== px) return next.close()
        bitmaps[i]?.close()
        bitmaps[i] = next
        shown[i] = -1
      }))
      if (alive) place()
    }
    const resize = new ResizeObserver(([entry]) => {
      k = entry.contentRect.width / STAGE_W
      if (!k) return
      const px = Math.round(ITEM * k * devicePixelRatio)
      canvasRefs.current.forEach((c) => { if (c) { c.width = px; c.height = px } })
      shown.fill(-1)
      place()
      // Debounced, so dragging the size dial decodes once it settles.
      clearTimeout(timer)
      timer = window.setTimeout(() => void decode(), decodedAt ? 200 : 0)
    })
    const ahead = new IntersectionObserver(([entry]) => {
      near = entry.isIntersecting
      if (near) void decode()
    }, { rootMargin: '900px 0px' })
    const onScreen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      sync()
    })
    resize.observe(root)
    ahead.observe(root)
    onScreen.observe(root)
    reduced.addEventListener('change', sync)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      clearTimeout(timer)
      resize.disconnect()
      ahead.disconnect()
      onScreen.disconnect()
      reduced.removeEventListener('change', sync)
      bitmaps.forEach((b) => b?.close())
    }
  }, [points])

  return (
    <div
      ref={rootRef}
      className="fnl"
      data-labels={labels}
      style={{ '--fnl-size': `${dials.loop.size}px`, '--fnl-item': `${(ITEM / STAGE_W) * 100}%`, '--fnl-aspect': `${STAGE_W} / ${height}` } as CSSProperties}
      role="img"
      aria-label={`Seventeen products made from biomaterials travel an infinity loop, turning: ${PRODUCTS.map((p) => `${p.name} by ${p.companies}, ${p.material}`).join('; ')}.`}
    >
      {PRODUCTS.map((p, i) => (
        <div key={p.code} ref={(el) => { itemRefs.current[i] = el }} className="fnl__item" aria-hidden="true">
          <canvas ref={(el) => { canvasRefs.current[i] = el }} />
        </div>
      ))}
      {labels !== 'Hidden' && (
        <div className="fnl__labels" aria-hidden="true">
          {PRODUCTS.map((p, i) => (
            <div key={p.code} ref={(el) => { labelRefs.current[i] = el }} className="fnl__item">
              <ProductLabel product={p} style={labels} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ProductLabel({ product: p, style }: { product: (typeof PRODUCTS)[number]; style: string }) {
  switch (style) {
    case 'Catalog':
      return <div className="fnl__label"><p className="fnl__code">{p.code}</p><p className="fnl__name">{p.name}</p><p>{p.companies}</p><p className="fnl__mat">{p.material}</p></div>
    case 'Made from':
      return <div className="fnl__label"><p className="fnl__name">{p.name}</p><p>{p.companies}</p><p className="fnl__made">Made from {p.material}</p></div>
    case 'Material first':
      return <div className="fnl__label"><p className="fnl__name">{p.material}</p><p>{p.name}, {p.companies}</p></div>
    case 'Eyebrow':
      return <div className="fnl__label"><p className="fnl__eyebrow">{p.category}</p><p className="fnl__name">{p.name}</p><p>{p.companies} · {p.material}</p></div>
    case 'Chip':
      return <div className="fnl__label"><p className="fnl__name">{p.name}</p><p>{p.companies}</p><span className="fnl__chip">{p.material}</span></div>
    default:
      return <div className="fnl__label"><p className="fnl__name">{p.name}</p><p>{p.material}</p></div>
  }
}
