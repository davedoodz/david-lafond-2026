/**
 * The click-drag ink brush — ported from ditto's `public/draw.js`. A
 * graphite-textured stroke that fades out after the pointer lifts, skipping
 * interactive elements and active text selection.
 */

export type InkOptions = {
  enabled: boolean
  width: number
  fadeMs: number
  colorDark: string
  colorLight: string
}

export type InkEngine = {
  setOptions: (next: InkOptions) => void
  /** Registers the protected-element list fresh (call after DOM changes). */
  refreshExclusions: () => void
  begin: (event: PointerEvent) => void
  move: (event: PointerEvent) => void
  finish: () => void
  destroy: () => void
  resize: () => void
}

const PROTECTED_SELECTOR = 'a, button, input, [role="button"], video, [data-no-ink]'
const PAD = 8

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value))
const smootherstep = (value: number): number => value * value * value * (value * (value * 6 - 15) + 10)

type Point = { x: number; y: number; t: number }

type Stroke = {
  bitmap: HTMLCanvasElement
  context: CanvasRenderingContext2D | null
  color: string
  x: number
  y: number
  minX: number
  minY: number
  maxX: number
  maxY: number
  fadeAt: number
  /** Page scroll when the stroke began; the stroke is drawn offset by any scroll since, so it stays put on the page. */
  scrollX: number
  scrollY: number
}

function isBlocked(target: EventTarget | null): boolean {
  const element = target instanceof Element ? target : null
  return !element || Boolean(element.closest(PROTECTED_SELECTOR))
}

function isVisibleControl(element: Element): boolean {
  if (element.closest('[hidden]')) return false
  const style = getComputedStyle(element)
  return style.display !== 'none' && style.visibility !== 'hidden'
}

/** True when (x, y) lies on the glyph box of selectable text under `target`.
 * Strokes refuse to start there, so a drag on copy becomes a highlight;
 * text marked `user-select: none` doesn't count, so ink can start on labels. */
function isTextAtPoint(target: EventTarget | null, x: number, y: number): boolean {
  const element = target instanceof Element ? target : (target as Node | null)?.parentElement
  if (!element || element === document.body || element === document.documentElement) return false
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  let node = walker.nextNode()
  while (node) {
    if (node.textContent?.trim() && node.parentElement && getComputedStyle(node.parentElement).userSelect !== 'none') {
      range.selectNodeContents(node)
      for (const rect of range.getClientRects()) {
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return true
      }
    }
    node = walker.nextNode()
  }
  return false
}

const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])'

/** A text highlight may only begin when the press lands on the text itself.
 * Presses on empty space (even inside a paragraph's box) can't start a sweep
 * selection; form fields and controls keep their native mouse behaviour. */
export function allowsSelectionStart(event: MouseEvent): boolean {
  if (event.button !== 0) return true
  const element = event.target instanceof Element ? event.target : null
  if (!element || element.closest(`${EDITABLE_SELECTOR}, ${PROTECTED_SELECTOR}`)) return true
  return isTextAtPoint(event.target, event.clientX, event.clientY)
}

function widthForSpeed(speed: number, base: number): number {
  return Math.max(base * 0.5, Math.min(base * 1.35, base * 1.45 - speed * 1.5))
}

/** Pointer position in the stroke's own space: viewport coords at the scroll the stroke began with. */
function position(event: PointerEvent, stroke: Stroke): Point {
  return { x: event.clientX + window.scrollX - stroke.scrollX, y: event.clientY + window.scrollY - stroke.scrollY, t: event.timeStamp }
}

export function createInkEngine(canvas: HTMLCanvasElement, initial: InkOptions): InkEngine {
  const output = canvas.getContext('2d')
  let options = initial
  let dpr = 1
  let active: Stroke | null = null
  let frame = 0
  let timer = 0
  let last: Point | null = null
  let lastWidth = 2
  let protectedElements: Element[] = []
  let strokes: Stroke[] = []
  let surfaceOnBegin: 'dark' | 'light' = 'dark'

  function requestFrame(): void {
    if (frame) return
    clearTimeout(timer)
    timer = 0
    frame = requestAnimationFrame(render)
  }

  function sizeCanvas(): void {
    dpr = Math.max(1, window.devicePixelRatio || 1)
    canvas.width = Math.round(window.innerWidth * dpr)
    canvas.height = Math.round(window.innerHeight * dpr)
    strokes = []
    active = null
    last = null
    output?.clearRect(0, 0, canvas.width, canvas.height)
  }

  function render(now: number): void {
    frame = 0
    if (!output) return
    output.clearRect(0, 0, canvas.width, canvas.height)
    strokes = strokes.filter(stroke => now < stroke.fadeAt + options.fadeMs)

    let fading = false
    let nextFade = Infinity
    const scrollX = window.scrollX
    const scrollY = window.scrollY
    for (const stroke of strokes) {
      const fadeProgress = stroke.fadeAt === Infinity ? 0 : clamp01((now - stroke.fadeAt) / options.fadeMs)
      if (fadeProgress > 0) fading = true
      else nextFade = Math.min(nextFade, stroke.fadeAt)
      output.globalAlpha = 1 - smootherstep(fadeProgress)
      output.drawImage(stroke.bitmap, stroke.x + Math.round((stroke.scrollX - scrollX) * dpr), stroke.y + Math.round((stroke.scrollY - scrollY) * dpr))
    }
    output.globalAlpha = 1

    // Cut every live affordance back out so a mark can cross the composition
    // without covering or stealing a control.
    output.save()
    output.globalCompositeOperation = 'destination-out'
    output.fillStyle = '#000'
    for (const element of protectedElements) {
      if (!element.isConnected || !isVisibleControl(element)) continue
      const rect = element.getBoundingClientRect()
      if (!rect.width || !rect.height) continue
      output.fillRect(
        Math.floor((rect.left - 2) * dpr),
        Math.floor((rect.top - 2) * dpr),
        Math.ceil((rect.width + 4) * dpr),
        Math.ceil((rect.height + 4) * dpr),
      )
    }
    output.restore()

    if (active || fading) frame = requestAnimationFrame(render)
    else if (nextFade !== Infinity) {
      timer = window.setTimeout(requestFrame, Math.max(0, nextFade + options.fadeMs - performance.now()))
    }
  }

  function makeStroke(color: string): Stroke {
    const bitmap = document.createElement('canvas')
    bitmap.width = canvas.width
    bitmap.height = canvas.height
    const context = bitmap.getContext('2d')!
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    context.lineCap = 'round'
    context.lineJoin = 'round'
    return {
      bitmap, context, color, x: 0, y: 0, minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity, fadeAt: Infinity,
      scrollX: window.scrollX, scrollY: window.scrollY,
    }
  }

  /** Graphite texture: a velocity-tapered core plus fine edge grain. */
  function stamp(a: Point, b: Point, width: number): void {
    if (!active?.context) return
    const context = active.context
    const dx = b.x - a.x
    const dy = b.y - a.y
    const length = Math.hypot(dx, dy) || 1
    const alongX = dx / length
    const alongY = dy / length
    const acrossX = -alongY
    const acrossY = alongX

    context.save()
    context.globalAlpha = 0.68
    context.strokeStyle = active.color
    context.lineWidth = width * (0.85 + Math.random() * 0.3)
    context.beginPath()
    context.moveTo(a.x, a.y)
    context.lineTo(b.x, b.y)
    context.stroke()

    const steps = Math.max(1, Math.floor(length / 0.9))
    for (let i = 0; i <= steps; i += 1) {
      const progress = i / steps
      const centreX = a.x + dx * progress
      const centreY = a.y + dy * progress
      for (let speck = 0; speck < 3; speck += 1) {
        const bias = Math.random()
        const spread = (bias * bias - 0.5) * width * 1.6
        const jitter = (Math.random() - 0.5) * 0.9
        const x = centreX + acrossX * spread + alongX * jitter
        const y = centreY + acrossY * spread + alongY * jitter
        context.globalAlpha = (Math.abs(spread) < width * 0.4 ? 0.14 : 0.07) + Math.random() * 0.12
        context.fillStyle = active.color
        context.beginPath()
        context.arc(x, y, 0.35 + Math.random() * 0.6, 0, Math.PI * 2)
        context.fill()
      }
    }
    context.restore()

    const reach = width * 2 + PAD
    active.minX = Math.min(active.minX, a.x - reach, b.x - reach)
    active.minY = Math.min(active.minY, a.y - reach, b.y - reach)
    active.maxX = Math.max(active.maxX, a.x + reach, b.x + reach)
    active.maxY = Math.max(active.maxY, a.y + reach, b.y + reach)
    requestFrame()
  }

  sizeCanvas()

  // Strokes are anchored to the page, so scrolling must repaint them at their new offset.
  const onScroll = (): void => {
    if (strokes.length) requestFrame()
  }
  window.addEventListener('scroll', onScroll, { passive: true })

  return {
    setOptions: next => {
      options = next
    },
    refreshExclusions: () => {
      protectedElements = [...document.querySelectorAll(PROTECTED_SELECTOR)]
    },
    begin: event => {
      if (!options.enabled || event.pointerType !== 'mouse' || event.button !== 0) return
      // No sketching while the DialKit panel is open (flag set by DevRoot).
      if (document.documentElement.hasAttribute('data-dialkit-open')) return
      if (isBlocked(event.target) || isTextAtPoint(event.target, event.clientX, event.clientY)) return
      protectedElements = [...document.querySelectorAll(PROTECTED_SELECTOR)]
      const owner = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-surface]') : null
      surfaceOnBegin = owner?.dataset.surface === 'light' ? 'light' : 'dark'
      active = makeStroke(surfaceOnBegin === 'light' ? options.colorLight : options.colorDark)
      strokes.push(active)
      last = position(event, active)
      lastWidth = options.width
      stamp(last, { ...last, x: last.x + 0.01, y: last.y + 0.01 }, lastWidth)
    },
    move: event => {
      if (!active) return
      if (isBlocked(event.target) || (document.getSelection()?.toString().length ?? 0) > 0) {
        last = null
        return
      }
      const events = event.getCoalescedEvents?.() ?? [event]
      for (const sample of events.length ? events : [event]) {
        const point = position(sample, active)
        if (!last) {
          last = point
          continue
        }
        const elapsed = Math.max(1, point.t - last.t)
        const speed = Math.hypot(point.x - last.x, point.y - last.y) / elapsed
        const targetWidth = widthForSpeed(speed, options.width)
        const width = lastWidth + (targetWidth - lastWidth) * 0.4
        stamp(last, point, width)
        last = point
        lastWidth = width
      }
    },
    finish: () => {
      if (!active) return
      const stroke = active
      const left = Math.max(0, Math.floor(stroke.minX * dpr))
      const top = Math.max(0, Math.floor(stroke.minY * dpr))
      const right = Math.min(canvas.width, Math.ceil(stroke.maxX * dpr))
      const bottom = Math.min(canvas.height, Math.ceil(stroke.maxY * dpr))
      if (right > left && bottom > top) {
        const cropped = document.createElement('canvas')
        cropped.width = right - left
        cropped.height = bottom - top
        cropped.getContext('2d')?.drawImage(stroke.bitmap, left, top, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height)
        stroke.bitmap = cropped
        stroke.x = left
        stroke.y = top
      }
      stroke.context = null
      stroke.fadeAt = performance.now()
      active = null
      last = null
      requestFrame()
    },
    destroy: () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
      clearTimeout(timer)
      strokes = []
      active = null
    },
    resize: sizeCanvas,
  }
}
