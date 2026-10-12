/**
 * The portfolio as a 3D flip book: `page-flip` turns the pages (drag, swipe,
 * click, or the controller), a tilt layer gives it depth, and a zoom layer
 * scales and pans it for detail.
 *
 * Layers, outside in:
 *   .book        stage: size container, perspective, zoom/pan pointer input
 *   .book__tilt  rotateX/Y, eased toward the pointer
 *   .book__shift slides the book so a lone cover sits centered
 *   .book__zoom  translate + scale while zoomed
 *   host         page-flip block (created here, destroyed by page-flip)
 *
 * Images: every page starts empty, pages near the open spread get the 480 px
 * thumb, the closest get the 1600 px medium, and while zoomed the visible
 * pages swap to the 4961 px detail scan once it has decoded.
 */
import { useEffect, useRef, type CSSProperties, type RefObject } from 'react'
import { PageFlip, type Orientation } from 'page-flip'
import { PAGE_COUNT, PAGE_ASPECT, pageUrl, pageSurface, type PageQuality } from './bookPages'

export type BookState = { index: number; orientation: Orientation; zoom: number }

export type BookController = {
  next: () => void
  prev: () => void
  first: () => void
  last: () => void
  /** Open page `index` (0-based) without an animation, e.g. from the grid. */
  jumpTo: (index: number) => void
  zoomBy: (factor: number) => void
  zoomReset: () => void
}

export type BookLook = {
  /** Share of the largest size that fits the stage. */
  scale: number
  flipMs: number
  coverMaterial: string
  coverFlipMs: number
  /** Covers and interior leaves round only their outside edge, never the binding. */
  coverRadius: number
  pageRadius: number
  tiltRestX: number
  tiltRestY: number
  tiltHover: number
  /** Hover: how much the book sinks away under the pointer (share of its size). */
  push: number
  /** Page-block thickness at its thickest (px); splits between the sides as you read. */
  thickness: number
  /** Light sheen that slides across the pages with the tilt (0..1). */
  glare: number
  maxZoom: number
  detailAtZoom: number
  hint: { preset: string; size: number; inset: number; speed: number }
}

type Props = {
  look: BookLook
  startIndex: number
  active: boolean
  controllerRef: RefObject<BookController | null>
  onChange: (state: BookState) => void
}

/** Below this spread width the book shows one page at a time. */
const MIN_PAGE_WIDTH = 260
const MEDIUM_RADIUS = 4
const THUMB_RADIUS = 14
const RANK: Record<PageQuality | 'none', number> = { none: 0, thumb: 1, medium: 2, detail: 3 }

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** Pages (0-based) on screen for an open index. */
function visiblePages(index: number, orientation: Orientation): number[] {
  if (orientation === 'portrait' || index === 0 || index === PAGE_COUNT - 1) return [index]
  const left = index % 2 === 1 ? index : index - 1
  return [left, left + 1]
}

export function FlipBook({ look, startIndex, active, controllerRef, onChange }: Props) {
  const stageRef = useRef<HTMLDivElement>(null)
  const tiltRef = useRef<HTMLDivElement>(null)
  const shiftRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef<HTMLDivElement>(null)
  const mountRef = useRef<HTMLDivElement>(null)
  const lookRef = useRef(look)
  lookRef.current = look
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const activeRef = useRef(active)
  activeRef.current = active
  const startIndexRef = useRef(startIndex)
  const flipRef = useRef<PageFlip | null>(null)
  const updateMaterialRef = useRef<(() => void) | null>(null)
  useEffect(() => { updateMaterialRef.current?.() }, [look.coverMaterial])

  // page-flip reads its settings object live, so the flip duration dial applies without a remount.
  useEffect(() => {
    const flip = flipRef.current
    if (flip) flip.getSettings().flippingTime = look.flipMs
  }, [look.flipMs])

  // Book scale dial: re-fit without remounting.
  const relayoutRef = useRef<(() => void) | null>(null)
  useEffect(() => {
    relayoutRef.current?.()
  }, [look.scale])

  useEffect(() => {
    const stage = stageRef.current!
    const tilt = tiltRef.current!
    const shift = shiftRef.current!
    const zoomLayer = zoomRef.current!
    const mount = mountRef.current!
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')

    // Page elements: page-flip moves these nodes, so they are plain DOM, not React.
    const images: HTMLImageElement[] = []
    const quality: Array<PageQuality | 'none'> = []
    const pages = Array.from({ length: PAGE_COUNT }, (_, i) => {
      const page = document.createElement('div')
      page.className = 'book-page'
      // Covers are rigid boards; interior leaves remain paper.
      page.dataset.density = i === 0 || i === PAGE_COUNT - 1 ? 'hard' : 'soft'
      page.dataset.surface = pageSurface(i + 1)
      if (i === 0 || i === PAGE_COUNT - 1) page.dataset.cover = i === 0 ? 'front' : 'back'
      const img = document.createElement('img')
      img.alt = i === 0 ? 'Portfolio front cover' : i === PAGE_COUNT - 1 ? 'Portfolio back cover' : `Portfolio page ${i + 1}`
      img.decoding = 'async'
      page.appendChild(img)
      if (i === 0) {
        const hint = document.createElement('span')
        hint.className = 'book__cover-hint'
        hint.setAttribute('aria-hidden', 'true')
        hint.innerHTML = '<span></span><span></span>'
        page.appendChild(hint)
      }
      images.push(img)
      quality.push('none')
      return page
    })

    const setQuality = (i: number, next: PageQuality) => {
      if (quality[i] === next) return
      quality[i] = next
      images[i].src = pageUrl(i + 1, next)
    }

    /** Load around `center`; never downgrade medium, so turning back is instant. */
    const hydrate = (center: number) => {
      for (let i = 0; i < PAGE_COUNT; i++) {
        const distance = Math.abs(i - center)
        const want: PageQuality | null = distance <= MEDIUM_RADIUS ? 'medium' : distance <= THUMB_RADIUS ? 'thumb' : null
        if (want && RANK[want] > RANK[quality[i]]) setQuality(i, want)
      }
    }

    // --- Size: pick the orientation from the stage, then size the host to it.
    // page-flip turns portrait when the block is narrower than 2 × minWidth;
    // the host width below always lands on the same side of that line.
    const host = document.createElement('div')
    host.className = 'book__host'
    mount.appendChild(host)
    let orientation: Orientation = 'landscape'
    const layout = () => {
      const style = getComputedStyle(stage)
      const scale = lookRef.current.scale
      const w = (stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)) * scale
      const h = (stage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)) * scale
      const spread = Math.min(w, h * PAGE_ASPECT * 2)
      const width = spread >= MIN_PAGE_WIDTH * 2 ? spread : Math.min(w, h * PAGE_ASPECT)
      mount.style.width = `${Math.max(0, Math.floor(width))}px`
    }
    layout()

    const startIndex = startIndexRef.current
    const flip = new PageFlip(host, {
      width: 496,
      height: Math.round(496 / PAGE_ASPECT),
      size: 'stretch',
      minWidth: MIN_PAGE_WIDTH,
      maxWidth: 3000,
      minHeight: Math.round(MIN_PAGE_WIDTH / PAGE_ASPECT),
      maxHeight: Math.round(3000 / PAGE_ASPECT),
      autoSize: true,
      showCover: true,
      usePortrait: true,
      drawShadow: false,
      maxShadowOpacity: 0,
      flippingTime: lookRef.current.flipMs,
      startPage: startIndex,
      mobileScrollSupport: true,
      showPageCorners: false,
      // Clicks are turned by onClick below (page-flip misses many under the tilt); it still owns drags.
      disableFlipByClick: true,
      swipeDistance: 24,
    })
    flipRef.current = flip
    hydrate(startIndex)
    setQuality(0, 'medium')
    setQuality(PAGE_COUNT - 1, 'medium')

    // --- Zoom + pan, eased in one rAF loop that sleeps when settled.
    const view = { zoom: 1, x: 0, y: 0 }
    const target = { zoom: 1, x: 0, y: 0 }
    const tiltNow = { x: lookRef.current.tiltRestX, y: lookRef.current.tiltRestY }
    const tiltTarget = { ...tiltNow }
    let sinkNow = 0
    let sinkTarget = 0
    let frame = 0
    let detailPages: number[] = []
    let detailToken = 0

    const report = () => onChangeRef.current({ index: flip.getCurrentPageIndex(), orientation, zoom: target.zoom })

    const clampPan = () => {
      const w = zoomLayer.offsetWidth
      const h = zoomLayer.offsetHeight
      const limitX = (w * (target.zoom - 1)) / 2
      const limitY = (h * (target.zoom - 1)) / 2
      target.x = clamp(target.x, -limitX, limitX)
      target.y = clamp(target.y, -limitY, limitY)
    }

    const releaseDetail = () => {
      detailToken++
      for (const i of detailPages) setQuality(i, 'medium')
      detailPages = []
    }

    /** Swap the visible pages to the detail scan after it has decoded, so nothing flashes. */
    const loadDetail = () => {
      const wanted = visiblePages(flip.getCurrentPageIndex(), orientation)
      if (wanted.every((i) => quality[i] === 'detail')) return
      const token = ++detailToken
      for (const i of wanted) {
        if (quality[i] === 'detail') continue
        const probe = new Image()
        probe.src = pageUrl(i + 1, 'detail')
        probe
          .decode()
          .then(() => {
            if (token !== detailToken) return
            setQuality(i, 'detail')
            detailPages.push(i)
          })
          .catch(() => {})
      }
    }

    const tick = () => {
      frame = 0
      const ease = reducedMotion ? 1 : 0.2
      let moving = false
      for (const key of ['zoom', 'x', 'y'] as const) {
        const delta = target[key] - view[key]
        if (Math.abs(delta) > (key === 'zoom' ? 0.0005 : 0.05)) {
          view[key] += delta * ease
          moving = true
        } else view[key] = target[key]
      }
      for (const key of ['x', 'y'] as const) {
        const delta = tiltTarget[key] - tiltNow[key]
        if (Math.abs(delta) > 0.005) {
          tiltNow[key] += delta * (reducedMotion ? 1 : 0.08)
          moving = true
        } else tiltNow[key] = tiltTarget[key]
      }
      const sinkDelta = sinkTarget - sinkNow
      if (Math.abs(sinkDelta) > 0.0001) {
        sinkNow += sinkDelta * (reducedMotion ? 1 : 0.1)
        moving = true
      } else sinkNow = sinkTarget
      zoomLayer.style.transform = `translate3d(${view.x.toFixed(2)}px, ${view.y.toFixed(2)}px, 0) scale(${view.zoom.toFixed(4)})`
      tilt.style.transform = `rotateX(${tiltNow.x.toFixed(3)}deg) rotateY(${tiltNow.y.toFixed(3)}deg) scale(${(1 - sinkNow).toFixed(4)})`
      // Shadow and sheen follow the hover part of the tilt (the light stays put, the book moves).
      stage.style.setProperty('--tilt-x', (tiltNow.x - lookRef.current.tiltRestX).toFixed(3))
      stage.style.setProperty('--tilt-y', (tiltNow.y - lookRef.current.tiltRestY).toFixed(3))
      if (moving) schedule()
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(tick)
    }

    const setZoom = (next: number, originX?: number, originY?: number) => {
      const zoom = clamp(next, 1, lookRef.current.maxZoom)
      // Keep the point under the pointer fixed: it sits at (origin - center - pan) / zoom in book space.
      // The shift layer is the zoom layer's untransformed box, so its center is the scale origin.
      const rect = shift.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const ox = (originX ?? cx) - cx
      const oy = (originY ?? cy) - cy
      const ratio = zoom / target.zoom
      target.x = ox - (ox - target.x) * ratio
      target.y = oy - (oy - target.y) * ratio
      target.zoom = zoom
      if (zoom <= 1.001) {
        target.zoom = 1
        target.x = 0
        target.y = 0
      }
      clampPan()
      const zoomed = target.zoom > 1
      stage.classList.toggle('is-zoomed', zoomed)
      if (zoomed) {
        tiltTarget.x = 0
        tiltTarget.y = 0
      } else {
        tiltTarget.x = lookRef.current.tiltRestX
        tiltTarget.y = lookRef.current.tiltRestY
      }
      if (target.zoom >= lookRef.current.detailAtZoom) loadDetail()
      else if (target.zoom === 1) releaseDetail()
      schedule()
      report()
    }

    // --- Cover centering + shadow shape follow the open spread.
    let coverHintTimer: number | undefined
    const holdCoverHint = () => {
      clearTimeout(coverHintTimer)
      stage.setAttribute('data-cover-return-wait', '')
    }
    const releaseCoverHint = () => {
      clearTimeout(coverHintTimer)
      if (flip.getCurrentPageIndex() !== 0) return
      coverHintTimer = window.setTimeout(() => stage.removeAttribute('data-cover-return-wait'), 3000)
    }
    const syncSpread = (index: number) => {
      stage.dataset.cover = String(index === 0)
      stage.dataset.closedCover = index === 0 ? 'front' : index === PAGE_COUNT - 1 ? 'back' : ''
      const kind = orientation === 'portrait' ? 'single' : index === 0 ? 'front' : index === PAGE_COUNT - 1 ? 'back' : 'open'
      shift.dataset.spread = kind
      // Share of the book already read: the left page block grows, the right one thins.
      shift.style.setProperty('--read', String(PAGE_COUNT > 1 ? index / (PAGE_COUNT - 1) : 0))
      stage.dataset.orientation = orientation
    }

    // A lone cover has no underlying spread to conceal the lifted part of its
    // inside face. Subtract the engine's exact revealed-area polygon instead of
    // leaving that whole face painted flat (or approximating a diagonal cut).
    const clearCoverMask = () => {
      pages[1].removeAttribute('data-cover-fold')
      pages[PAGE_COUNT - 2].removeAttribute('data-cover-fold')
    }

    flip.on('flip', ({ data }) => {
      hydrate(data)
      holdCoverHint()
      if (flip.getState() === 'read') releaseCoverHint()
      syncSpread(data)
      report()
    })
    flip.on('changeOrientation', ({ data }) => {
      orientation = data
      syncSpread(flip.getCurrentPageIndex())
      report()
    })
    // Load the destination while a drag is still deciding which way to go.
    // `libFlips` lets a click tell whether page-flip already turned it (corner hot zones).
    let libFlips = 0
    flip.on('changeState', ({ data }) => {
      if (data !== 'read') delete stage.dataset.closedCover
      else queueMicrotask(() => syncSpread(flip.getCurrentPageIndex()))
      // The library emits before updating getState(); restore material afterward.
      if (data === 'read') queueMicrotask(() => updateMaterialRef.current?.())
      if (data === 'read') clearCoverMask()
      stage.dataset.flipState = data
      if (data === 'read') releaseCoverHint()
      else holdCoverHint()
      if (data === 'user_fold') {
        const index = flip.getCurrentPageIndex()
        flip.getSettings().flippingTime = index <= 1 || index >= PAGE_COUNT - 2
          ? lookRef.current.coverFlipMs : lookRef.current.flipMs
      }
      if (data === 'flipping') libFlips++
      if (data === 'user_fold' || data === 'flipping') {
        const index = flip.getCurrentPageIndex()
        hydrate(clamp(index + 2, 0, PAGE_COUNT - 1))
        hydrate(clamp(index - 2, 0, PAGE_COUNT - 1))
      }
    })
    // page-flip settles its orientation during and just after load, so listen before loading.
    flip.on('init', ({ data }) => {
      orientation = data.mode
      syncSpread(flip.getCurrentPageIndex())
      report()
    })
    flip.loadFromHTML(pages)
    const render = flip.getRender()
    const setPageRect = render.setPageRect.bind(render)
    render.setPageRect = (rect) => {
      setPageRect(rect)
      clearCoverMask()
      const calc = flip.getFlipController().getCalculation()
      if (!calc || orientation !== 'landscape') return
      const back = calc.getDirection() === 1
      const index = flip.getCurrentPageIndex()
      if (!(back && index === 1) && !(!back && index === PAGE_COUNT - 3)) return
      // The closing board lands on the entire page stack. Keep that stack
      // under the destination half, never under the now-vacant lifted half.
      shift.style.setProperty('--read', back ? '0' : '1')
      if (flip.getPage(back ? 0 : PAGE_COUNT - 1).getDrawingDensity() !== 'soft') return
      const { pageWidth: width, height } = render.getRect()
      const points = calc.getBottomClipArea().filter((point) => point !== null)
      if (points.length < 3) return
      // The library rounds calculation dimensions down; snap its outer-edge
      // vertices to the rendered box to avoid a subpixel paper sliver.
      const percent = (value: number, size: number) => Math.abs(value) < 1 ? 0 : Math.abs(value - size) < 1 ? 100 : value / size * 100
      const hole = points.map((point) => `${percent(back ? width - point.x : point.x, width)}% ${percent(point.y, height)}%`)
      const face = pages[back ? 1 : PAGE_COUNT - 2]
      images[back ? 1 : PAGE_COUNT - 2].style.setProperty('--cover-flat', `polygon(evenodd, 0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, ${hole.join(', ')}, ${hole[0]}, 0% 0%)`)
      face.setAttribute('data-cover-fold', '')
    }
    // showCover forces hard density on load; apply the selected material afterwards.
    const updateMaterial = () => {
      if (flip.getState() !== 'read') return
      const density = lookRef.current.coverMaterial === 'flexible' ? 'soft' : 'hard'
      for (const index of [0, PAGE_COUNT - 1]) {
        flip.getPage(index).setDensity(density)
        flip.getPage(index).setDrawingDensity(density)
      }
    }
    updateMaterialRef.current = updateMaterial
    updateMaterial()
    orientation = flip.getOrientation()
    syncSpread(startIndex)
    tick()
    report()

    const relayout = () => {
      layout()
      flip.update()
      setZoom(1)
    }
    relayoutRef.current = relayout
    const observer = new ResizeObserver(relayout)
    observer.observe(stage)

    // --- Pointer: tilt on hover, pan while zoomed, pinch on touch.
    const pointers = new Map<number, { x: number; y: number }>()
    let pinchDistance = 0
    let panStart: { x: number; y: number; panX: number; panY: number } | null = null

    const onPointerMove = (event: PointerEvent) => {
      if (pointers.has(event.pointerId)) pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        const distance = Math.hypot(a.x - b.x, a.y - b.y)
        if (pinchDistance > 0) setZoom(target.zoom * (distance / pinchDistance), (a.x + b.x) / 2, (a.y + b.y) / 2)
        pinchDistance = distance
        return
      }
      if (panStart && target.zoom > 1) {
        target.x = panStart.panX + (event.clientX - panStart.x)
        target.y = panStart.panY + (event.clientY - panStart.y)
        clampPan()
        schedule()
        return
      }
      if (target.zoom > 1 || !finePointer.matches || stage.dataset.flipState === 'user_fold') return
      // Push: the part of the book under the pointer dips away, and the book sinks a touch.
      const rect = host.getBoundingClientRect()
      const nx = clamp((event.clientX - rect.left) / rect.width - 0.5, -0.6, 0.6)
      const ny = clamp((event.clientY - rect.top) / rect.height - 0.5, -0.6, 0.6)
      const over = Math.abs(nx) <= 0.5 && Math.abs(ny) <= 0.5
      const reach = over ? 1 : 0.5
      tiltTarget.y = lookRef.current.tiltRestY + nx * lookRef.current.tiltHover * reach
      tiltTarget.x = lookRef.current.tiltRestX - ny * lookRef.current.tiltHover * 0.7 * reach
      sinkTarget = over ? lookRef.current.push : 0
      schedule()
    }
    let press: { x: number; y: number; libFlips: number } | null = null
    const onPointerDown = (event: PointerEvent) => {
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (pointers.size === 2) pinchDistance = 0
      press = event.isPrimary ? { x: event.clientX, y: event.clientY, libFlips } : null
      if (target.zoom > 1 && pointers.size === 1) {
        panStart = { x: event.clientX, y: event.clientY, panX: target.x, panY: target.y }
        stage.classList.add('is-panning')
        stage.setPointerCapture(event.pointerId)
      }
    }
    // A click anywhere on the right page turns forward, on the left page back. Drags, pans,
    // pinches, and clicks page-flip already turned (its corner hot zones) are left alone.
    let wholeBookFlip: Animation | null = null
    let wholeBookTurning = false
    const turn = (forward: boolean) => {
      if (wholeBookTurning) return
      const index = flip.getCurrentPageIndex()
      const coverTurn = forward ? index === 0 || index >= PAGE_COUNT - 3 : index <= 1 || index === PAGE_COUNT - 1
      flip.getSettings().flippingTime = coverTurn ? lookRef.current.coverFlipMs : lookRef.current.flipMs
      if (forward) flip.flipNext()
      else flip.flipPrev()
    }
    const onClick = (event: MouseEvent) => {
      const start = press
      press = null
      if (!start || start.libFlips !== libFlips) return
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) return
      const rect = host.getBoundingClientRect()
      const index = flip.getCurrentPageIndex()
      const lone = orientation === 'landscape' && (index === 0 || index >= PAGE_COUNT - 1)
      // A lone cover fills one half of the spread box; the other half is empty stage.
      const left = lone && index === 0 ? rect.left + rect.width / 2 : rect.left
      const right = lone && index !== 0 ? rect.left + rect.width / 2 : rect.right
      if (event.clientX < left || event.clientX > right || event.clientY < rect.top || event.clientY > rect.bottom) return
      const forward = lone ? index === 0 : event.clientX >= rect.left + rect.width / 2
      if (target.zoom > 1) setZoom(1)
      turn(forward)
    }
    const onPointerUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId)
      if (pointers.size < 2) pinchDistance = 0
      if (pointers.size === 0) {
        panStart = null
        stage.classList.remove('is-panning')
      }
    }
    const onPointerLeave = () => {
      if (target.zoom > 1) return
      tiltTarget.x = lookRef.current.tiltRestX
      tiltTarget.y = lookRef.current.tiltRestY
      sinkTarget = 0
      schedule()
    }
    // Trackpad pinch arrives as ctrl+wheel; plain wheel pans while zoomed and scrolls the page otherwise.
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) {
        event.preventDefault()
        setZoom(target.zoom * Math.exp(-event.deltaY * 0.01), event.clientX, event.clientY)
      } else if (target.zoom > 1) {
        event.preventDefault()
        target.x -= event.deltaX
        target.y -= event.deltaY
        clampPan()
        schedule()
      }
    }
    // A click on a page turns it, so double-click only leaves zoom.
    const onDoubleClick = () => {
      if (target.zoom > 1) setZoom(1)
    }
    // A second finger belongs to the pinch: keep it away from page-flip's drag handling.
    const onTouchCapture = (event: TouchEvent) => {
      if (event.touches.length > 1 && stage.contains(event.target as Node)) event.stopPropagation()
    }

    stage.addEventListener('pointermove', onPointerMove)
    stage.addEventListener('pointerdown', onPointerDown)
    stage.addEventListener('pointerup', onPointerUp)
    stage.addEventListener('pointercancel', onPointerUp)
    stage.addEventListener('pointerleave', onPointerLeave)
    stage.addEventListener('wheel', onWheel, { passive: false })
    stage.addEventListener('dblclick', onDoubleClick)
    stage.addEventListener('click', onClick)
    window.addEventListener('touchstart', onTouchCapture, { capture: true })
    window.addEventListener('touchmove', onTouchCapture, { capture: true })

    const onKey = (event: KeyboardEvent) => {
      if (!activeRef.current || event.metaKey || event.ctrlKey || event.altKey) return
      if ((event.target as HTMLElement | null)?.closest('input, textarea, [contenteditable="true"]')) return
      const actions: Record<string, () => void> = {
        ArrowRight: () => turn(true),
        ArrowLeft: () => turn(false),
        Home: () => controllerRef.current?.first(),
        End: () => controllerRef.current?.last(),
        '+': () => setZoom(target.zoom * 1.5),
        '=': () => setZoom(target.zoom * 1.5),
        '-': () => setZoom(target.zoom / 1.5),
        '0': () => setZoom(1),
        Escape: () => setZoom(1),
      }
      const action = actions[event.key]
      if (!action) return
      if (event.key === 'Escape' && target.zoom === 1) return
      event.preventDefault()
      action()
    }
    window.addEventListener('keydown', onKey)

    const flipTo = async (index: number) => {
      if (wholeBookTurning) return
      render.finishAnimation()
      const current = flip.getCurrentPageIndex()
      if (current === index) return
      if (target.zoom > 1) setZoom(1)
      hydrate(index)
      holdCoverHint()
      clearCoverMask()
      const fromCover = current === 0 || current === PAGE_COUNT - 1
      if (!fromCover) {
        shift.style.setProperty('--read', index === 0 ? '0' : '1')
        // First/Last closes the current spread with a board, even when normal
        // cover clicks use flexible paper. READ restores the selected material.
        const cover = flip.getPage(index)
        cover.setDensity('hard')
        cover.setDrawingDensity('hard')
        flip.getSettings().flippingTime = lookRef.current.coverFlipMs
        flip.flip(index)
        return
      }
      if (reducedMotion) {
        flip.turnToPage(index)
        return
      }
      // Use a solid six-face book for this turn, not the page engine's flat
      // stack. Keep its center fixed and reveal the destination only at rest.
      const solid = document.createElement('div')
      solid.className = 'book__solid'
      solid.setAttribute('aria-hidden', 'true')
      const rect = render.getRect()
      const depth = lookRef.current.thickness
      solid.style.cssText = `width:${rect.pageWidth}px;height:${rect.height}px;--solid-depth:${depth}px`
      for (const side of ['front', 'back', 'spine', 'edge', 'top', 'bottom']) {
        const face = document.createElement('div')
        face.className = `book__solid-${side}`
        if (side === 'front' || side === 'back') {
          const image = document.createElement('img')
          image.src = pageUrl(side === 'front' ? 1 : PAGE_COUNT, 'medium')
          image.alt = ''
          face.appendChild(image)
        }
        solid.appendChild(face)
      }
      zoomLayer.appendChild(solid)
      wholeBookTurning = true
      stage.dataset.wholeBookTurning = 'true'
      const previousTransition = shift.style.transition
      shift.style.transition = 'none'
      const startAngle = current === 0 ? 0 : -180
      const endAngle = index === 0 ? 0 : -180
      // Counter the cover-centering shift: the proxy rotates at the stage center.
      solid.style.left = orientation === 'portrait' ? '50%' : current === 0 ? '75%' : '25%'
      const pose = (degrees: number) => `perspective(1800px) translateZ(${-depth / 2}px) rotateY(${degrees}deg)`
      try {
        wholeBookFlip = solid.animate([
          { transform: pose(startAngle) },
          { transform: pose(endAngle) },
        ], { duration: lookRef.current.coverFlipMs, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' })
        await wholeBookFlip.finished
        flip.turnToPage(index)
        // Commit destination centering while transitions are disabled. Restoring
        // the transition in the same unflushed style batch starts a second slide.
        void getComputedStyle(shift).translate
      } catch {
        // Unmount cancels an in-flight flip before the page engine is destroyed.
      } finally {
        wholeBookFlip?.cancel()
        wholeBookFlip = null
        solid.remove()
        wholeBookTurning = false
        delete stage.dataset.wholeBookTurning
        shift.style.transition = previousTransition
      }
    }
    controllerRef.current = {
      next: () => {
        if (target.zoom > 1) setZoom(1)
        turn(true)
      },
      prev: () => {
        if (target.zoom > 1) setZoom(1)
        turn(false)
      },
      first: () => flipTo(0),
      last: () => flipTo(PAGE_COUNT - 1),
      jumpTo: (index) => {
        setZoom(1)
        hydrate(index)
        flip.turnToPage(index)
        syncSpread(index)
        report()
      },
      zoomBy: (factor) => setZoom(target.zoom * factor),
      zoomReset: () => setZoom(1),
    }

    return () => {
      wholeBookFlip?.cancel()
      cancelAnimationFrame(frame)
      clearTimeout(coverHintTimer)
      stage.removeAttribute('data-cover-return-wait')
      updateMaterialRef.current = null
      observer.disconnect()
      stage.removeEventListener('pointermove', onPointerMove)
      stage.removeEventListener('pointerdown', onPointerDown)
      stage.removeEventListener('pointerup', onPointerUp)
      stage.removeEventListener('pointercancel', onPointerUp)
      stage.removeEventListener('pointerleave', onPointerLeave)
      stage.removeEventListener('wheel', onWheel)
      stage.removeEventListener('dblclick', onDoubleClick)
      stage.removeEventListener('click', onClick)
      window.removeEventListener('touchstart', onTouchCapture, { capture: true })
      window.removeEventListener('touchmove', onTouchCapture, { capture: true })
      window.removeEventListener('keydown', onKey)
      controllerRef.current = null
      detailToken++
      flipRef.current = null
      relayoutRef.current = null
      flip.destroy()
    }
    // One book per mount; live dials are read through lookRef.
  }, [controllerRef])

  return (
    <div
      ref={stageRef}
      className="book"
      data-hint={look.hint.preset}
      style={
        {
          '--book-thickness': `${look.thickness}px`,
          '--book-glare': look.glare,
          '--book-cover-radius': `${look.coverRadius}px`,
          '--book-page-radius': `${look.pageRadius}px`,
          '--hint-size': `${look.hint.size}px`,
          '--hint-inset': `${look.hint.inset}px`,
          '--hint-duration': `${1600 / look.hint.speed}ms`,
        } as CSSProperties
      }
    >
      <div ref={tiltRef} className="book__tilt">
        <div ref={shiftRef} className="book__shift" style={{ '--flip-ms': `${look.flipMs}ms` } as CSSProperties}>
          <div ref={zoomRef} className="book__zoom">
            <div ref={mountRef} className="book__mount">
              <div className="book__block" aria-hidden="true">
                <span className="book__block-left" />
                <span className="book__block-right" />
              </div>
              <div className="book__glare" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
