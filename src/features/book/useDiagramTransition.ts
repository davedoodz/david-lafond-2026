import { useEffect, useLayoutEffect, useRef } from 'react'
import { PAGE_HEIGHT, diagramMarkup, diagramSource, type DiagramSettings } from './layoutDiagram'
import type { PageLayout } from './pageLayouts'
import './diagramTransition.css'

export const DIAGRAM_PRESETS = ['construct', 'sweep', 'cascade', 'bloom', 'fade'] as const
export type DiagramMotion = { animate: boolean; preset: string; durationMs: number; scanDim: number }

type RunningPage = {
  image: HTMLImageElement
  overlay: HTMLDivElement
  animations: Animation[]
  target: boolean
  ready: boolean
  revision: number
}
type Geometry = { kind: string; x: number; y: number; w: number; h: number }
type Entry = { start: number; end: number; from: Keyframe; origin?: string }

const ENTER = 'cubic-bezier(0.22, 1, 0.36, 1)'
/** The diagram draws inside this window; the scan dims before it and settles after it. */
const DRAW_START = 0.15
const DRAW_END = 0.85
const SPAN = DRAW_END - DRAW_START
const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const hidden = { opacity: 0 }

/** Rules (dots, grid, edge guides) reveal as one layer, so they render exactly like the resting image. */
function ruleReveal(preset: string): Keyframe[] {
  const end = DRAW_START + SPAN * 0.9
  const reveal = (from: string, to: string, easing = ENTER): Keyframe[] => [
    { clipPath: from, opacity: 0, offset: 0 },
    { clipPath: from, opacity: 0, offset: DRAW_START, easing: 'linear' },
    { clipPath: from, opacity: 1, offset: DRAW_START + 0.01, easing },
    { clipPath: to, opacity: 1, offset: end },
    { clipPath: to, opacity: 1, offset: DRAW_END + 0.01 },
    { clipPath: to, opacity: 0, offset: 0.98 },
    { clipPath: to, opacity: 0, offset: 1 },
  ]
  switch (preset) {
    case 'sweep': return reveal('inset(0 100% 0 0)', 'inset(0 0% 0 0)', 'linear')
    case 'cascade': return reveal('inset(0 0 100% 0)', 'inset(0 0 0% 0)')
    case 'bloom': return reveal('circle(0% at 50% 50%)', 'circle(72% at 50% 50%)')
    case 'fade': return [
      { opacity: 0, offset: 0 },
      { opacity: 0, offset: DRAW_START + SPAN * 0.1 },
      { opacity: 1, offset: DRAW_END - SPAN * 0.1 },
      { opacity: 1, offset: DRAW_END + 0.01 },
      { opacity: 0, offset: 0.98 },
      { opacity: 0, offset: 1 },
    ]
    default: return reveal('inset(0 100% 100% 0)', 'inset(0 0% 0% 0)')
  }
}

/** Each preset maps one block element (fill, outline, handle) to a window of the shared timeline.
 * Only transform and opacity animate; outlines only fade, since scaling a hairline smears it. */
function entry(preset: string, g: Geometry): Entry {
  const cx = (g.x + g.w / 2) / 100
  const cy = (g.y + g.h / 2) / 100
  switch (preset) {
    case 'sweep': {
      const start = DRAW_START + SPAN * 0.85 * clamp01(cx)
      return { start, end: start + SPAN * 0.12, from: hidden }
    }
    case 'cascade': {
      const start = DRAW_START + SPAN * 0.8 * clamp01(cy)
      return { start, end: start + SPAN * 0.2, from: { opacity: 0, transform: 'translateY(-1.5px)' } }
    }
    case 'bloom': {
      const distance = clamp01(Math.hypot(cx - 0.5, cy - 0.5) / Math.SQRT1_2)
      const start = DRAW_START + SPAN * 0.7 * distance
      return { start, end: start + SPAN * 0.25, from: { opacity: 0, transform: 'scale(0.85)' }, origin: '50% 50%' }
    }
    case 'fade':
      return { start: DRAW_START + SPAN * 0.1, end: DRAW_END - SPAN * 0.1, from: hidden }
    default: {
      // construct: rules first (ruleReveal), then outlines in reading order, then fills settle inside them.
      const order = clamp01(cy * 0.7 + cx * 0.3)
      if (g.kind === 'fill') {
        const start = DRAW_START + SPAN * (0.45 + 0.35 * order)
        return { start, end: start + SPAN * 0.2, from: { opacity: 0, transform: 'scaleY(0)' }, origin: '50% 0%' }
      }
      const start = DRAW_START + SPAN * ((g.kind === 'handle' ? 0.28 : 0.25) + 0.35 * order)
      return { start, end: start + SPAN * 0.2, from: g.kind === 'handle' ? { opacity: 0, transform: 'scale(0)' } : hidden, origin: '50% 50%' }
    }
  }
}

function clearTransitions(jobs: Map<HTMLImageElement, RunningPage>) {
  for (const job of jobs.values()) {
    job.revision++
    job.animations.forEach((animation) => animation.cancel())
    job.overlay.remove()
  }
  jobs.clear()
}

const BACKGROUND_SIZE: Record<string, string> = { fill: '100% 100%', cover: 'cover', contain: 'contain' }

/** Original ↔ skeleton is one reversible WAAPI timeline per visible page, no per-frame React renders.
 * The scan never moves: it only dims in place while the skeleton's own SVG elements draw over it.
 * The overlay is built from the same markup as the resting image, so its last frame is the hand-off.
 */
export function useDiagramTransition(enabled: boolean, pages: Record<number, PageLayout>, settings: DiagramSettings, motion: DiagramMotion, lookKey: string) {
  const previous = useRef(enabled)
  const running = useRef(new Map<HTMLImageElement, RunningPage>())
  const current = useRef({ pages, settings, motion })
  current.current = { pages, settings, motion }

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const reduce = () => { if (media.matches) clearTransitions(running.current) }
    media.addEventListener('change', reduce)
    return () => { media.removeEventListener('change', reduce); clearTransitions(running.current) }
  }, [])

  useLayoutEffect(() => {
    const changed = previous.current !== enabled
    previous.current = enabled
    if (!import.meta.env.DEV) return
    const { pages: layouts, settings: look, motion: timing } = current.current
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    // Look or timing edits mid-flight snap to the resting state instead of replaying stale geometry.
    if (!changed || !timing.animate || reduce || look.opacity === 0) {
      clearTransitions(running.current)
      return
    }
    const play = (job: RunningPage, target: boolean) => {
      job.target = target
      const revision = ++job.revision
      if (!job.ready) return
      for (const animation of job.animations) {
        animation.updatePlaybackRate(target ? 1 : -1)
        animation.play()
      }
      void Promise.all(job.animations.map((a) => a.finished)).then(async () => {
        // Keep the composed scan in place until the underlying quality upgrade is ready.
        if (!job.target && !job.image.complete) await job.image.decode().catch(() => {})
        if (job.revision !== revision || running.current.get(job.image) !== job) return
        job.overlay.remove()
        job.animations.forEach((a) => a.cancel())
        running.current.delete(job.image)
      }).catch(() => { /* Cancelled on unmount or a reduced-motion change. */ })
    }

    // Measure visible pages together, before any overlay writes force a layout.
    const targets = [...document.querySelectorAll<HTMLImageElement>('img[data-layout-page]')].flatMap((image) => {
      if (running.current.has(image) || image.closest('[aria-hidden="true"], [data-zoomed]')) return []
      const rect = image.getBoundingClientRect()
      if (!image.getClientRects().length || rect.width < 1 || rect.height < 1 || rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth) return []
      const style = getComputedStyle(image)
      if (style.visibility === 'hidden') return []
      const layout = layouts[Number(image.dataset.layoutPage)]
      const parent = image.parentElement
      if (!layout || !parent || !parent.clientWidth || !parent.clientHeight) return []
      return [{
        image, layout, parent,
        box: { left: image.offsetLeft / parent.clientWidth * 100, top: image.offsetTop / parent.clientHeight * 100, width: image.offsetWidth / parent.clientWidth * 100, height: image.offsetHeight / parent.clientHeight * 100 },
        radius: style.borderRadius,
        fit: BACKGROUND_SIZE[style.objectFit] ?? '100% 100%',
        position: style.objectPosition,
        objectFit: style.objectFit,
      }]
    })
    const scanEase = getComputedStyle(document.documentElement).getPropertyValue('--reveal-ease').trim() || 'ease-in-out'
    const duration = timing.durationMs
    for (const job of running.current.values()) play(job, enabled)

    targets.forEach(({ image, layout, parent, box, radius, fit, position, objectFit }, index) => {
      const overlay = document.createElement('div')
      overlay.className = 'diagram-transition'
      overlay.setAttribute('aria-hidden', 'true')
      Object.assign(overlay.style, { left: `${box.left}%`, top: `${box.top}%`, width: `${box.width}%`, height: `${box.height}%`, borderRadius: radius, backgroundColor: layout.background })
      const scan = document.createElement('div')
      scan.className = 'diagram-transition__scan'
      Object.assign(scan.style, { backgroundImage: `url("${image.dataset.layoutOriginal}")`, backgroundSize: fit, backgroundPosition: position })
      overlay.append(scan)
      overlay.insertAdjacentHTML('beforeend', diagramMarkup(layout, look, `diagram-transition-${index}-${crypto.randomUUID()}`))
      const svg = overlay.lastElementChild as SVGSVGElement
      // The scan's own opacity replaces the resting veil, so the page dims without a second layer.
      // Rule layers move to an image (below): inline sub-pixel strokes smear inside the 3D book.
      svg.querySelectorAll('[data-kind="veil"], defs, [data-layer="dots"], [data-layer="grid"], [data-layer="guide"]').forEach((node) => node.remove())
      const rules = document.createElement('img')
      rules.className = 'diagram-transition__rules'
      rules.alt = ''
      rules.src = diagramSource(layout, { ...look, fills: { ...look.fills, show: false }, outlines: { ...look.outlines, show: false } }, false)
      svg.before(rules)
      if (timing.preset === 'sweep') {
        const ink = layout.background === 'black' ? 'white' : 'black'
        svg.insertAdjacentHTML('beforeend', `<line data-kind="scanline" x1="0" x2="0" y1="0" y2="${PAGE_HEIGHT}" stroke="${ink}" stroke-width="0.25" opacity="0"/>`)
      }
      // The last beat hands off to the very image that stays on the page, so the settle is pixel-identical.
      const rest = document.createElement('img')
      rest.className = 'diagram-transition__rest'
      rest.alt = ''
      rest.src = diagramSource(layout, look, false)
      // Mirror the page image's own fit, so the handoff lands on identical pixels.
      Object.assign(rest.style, { objectFit, objectPosition: position })
      Object.assign(rules.style, { objectFit, objectPosition: position })
      overlay.append(rest)
      parent.append(overlay)

      const animations: Animation[] = []
      const animate = (node: Element, frames: Keyframe[]) => {
        const animation = node.animate(frames, { duration, fill: 'both', easing: 'linear' })
        animation.pause()
        animation.currentTime = enabled ? 0 : duration
        animations.push(animation)
      }
      animate(scan, [
        { opacity: 1, offset: 0, easing: scanEase },
        { opacity: timing.scanDim, offset: DRAW_START + 0.05 },
        { opacity: timing.scanDim, offset: DRAW_END - 0.05, easing: scanEase },
        { opacity: look.scanOpacity, offset: 1 },
      ])
      const handoff = (from: number, to: number): Keyframe[] => [
        { opacity: from, offset: 0 },
        { opacity: from, offset: DRAW_END + 0.01 },
        { opacity: to, offset: 0.98 },
        { opacity: to, offset: 1 },
      ]
      animate(svg, handoff(1, 0))
      animate(rules, ruleReveal(timing.preset))
      animate(rest, handoff(0, 1))
      for (const node of svg.querySelectorAll<SVGElement>('[data-kind]')) {
        const kind = node.dataset.kind!
        if (kind === 'scanline') {
          animate(node, [
            { opacity: 0, transform: 'translateX(0px)', offset: 0 },
            { opacity: 0, transform: 'translateX(0px)', offset: DRAW_START },
            { opacity: 0.8, transform: `translateX(${SPAN * 0.04 * 100}px)`, offset: DRAW_START + SPAN * 0.04 },
            { opacity: 0.8, transform: `translateX(${SPAN * 0.9 * 100}px)`, offset: DRAW_START + SPAN * 0.9 },
            { opacity: 0, transform: 'translateX(100px)', offset: DRAW_END },
            { opacity: 0, transform: 'translateX(100px)', offset: 1 },
          ])
          continue
        }
        const g: Geometry = { kind, x: Number(node.dataset.x ?? 0), y: Number(node.dataset.y ?? 0), w: Number(node.dataset.w ?? 100), h: Number(node.dataset.h ?? 100) }
        const { start, end, from, origin } = entry(timing.preset, g)
        if (origin) Object.assign(node.style, { transformBox: 'fill-box', transformOrigin: origin })
        const settled: Keyframe = from.transform ? { opacity: 1, transform: 'none' } : { opacity: 1 }
        animate(node, [
          { ...from, offset: 0 },
          { ...from, offset: clamp01(start), easing: ENTER },
          { ...settled, offset: clamp01(Math.max(start, end)) },
          { ...settled, offset: 1 },
        ])
      }

      const original = new Image()
      original.src = image.dataset.layoutOriginal!
      const job: RunningPage = { image, overlay, animations, target: enabled, ready: original.complete && original.naturalWidth > 0, revision: 0 }
      running.current.set(image, job)
      play(job, enabled)
      if (!job.ready) {
        void original.decode().catch(() => {}).then(() => {
          if (running.current.get(image) !== job) return
          job.ready = true
          play(job, job.target)
        })
      }
    })
  }, [enabled, pages, lookKey, motion.animate, motion.preset, motion.durationMs, motion.scanDim])
}
