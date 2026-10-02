/**
 * Project card → project page: the card's four edges travel out to the
 * viewport edges while its corner radius relaxes, then the page is committed
 * underneath and the full-screen card fades away to reveal it.
 *
 * One fixed overlay, animated by a clip-path inset per frame, so the page
 * behind never re-lays out. Each edge has its own start delay: equal delays
 * grow the card evenly, staggered delays make some corners arrive first.
 */
import { flushSync } from 'react-dom'
import { navigate, type Route } from '../../lib/router'
import { preloadRoute } from '../../lib/routeChunks'
import { pageUrl } from '../book/bookPages'
import { spawnMesh } from '../../components/MeshCard'
import { sampleSpring, toCssTiming, type Easing, type Spring } from '../pageTransition/cssTiming'
import './projectOpen.css'

export type Edges = { top: number; right: number; bottom: number; left: number }

/**
 * How the card becomes the page.
 * - expand: the card's colour grows to fill the screen, then fades to the page.
 * - curtain: grows like expand, then lifts away upward to uncover the page.
 * - window: the card's frame grows to fill the screen, showing the real page inside it.
 * - iris: the page opens in a growing circle from the card's centre.
 * - zoom: the view zooms through the card while the page fades up.
 */
export const OPEN_EFFECTS = ['expand', 'curtain', 'window', 'iris', 'zoom'] as const
export type OpenEffect = (typeof OPEN_EFFECTS)[number]

/**
 * How a card's own artwork (Filo wall, Harvard & MIT crane loop) behaves while the card
 * grows (expand / curtain). The artwork stays live: it keeps animating during the run.
 *   grow      scales with the card so it always covers it, like the card is being enlarged
 *   zoom      grows, then keeps pushing in past cover: you fall into the artwork
 *   parallax  grows at a fraction of the card's speed: the frame opens faster than the art
 *   anchor    stays its card size, centred: the frame opens around it
 *   lift      grows while drifting up and fading: it rises out of the way of the page
 *   fade      grows and fades out, handing over to the page
 *   off       colour only (the old behaviour)
 */
export const CONTENT_FEELS = ['grow', 'zoom', 'parallax', 'anchor', 'lift', 'fade', 'off'] as const
export type ContentFeel = (typeof CONTENT_FEELS)[number]

/** Sent to the card as it starts growing; `detail.ms` = time left to settle its artwork. */
export const SETTLE_EVENT = 'project-open:settle'

export type OpenSpec = {
  /** Card artwork during expand/curtain; see CONTENT_FEELS. */
  contentFeel: ContentFeel
  /** How strong the feel is (zoom push, parallax lag, lift distance). */
  contentStrength: number
  /** Share of the run, at its end, over which the artwork fades out (0 = stays). */
  contentFade: number
  effect: OpenEffect
  /** Cards with Momo (Unwind): Momo flies from the card into the nav's Momo on the page. */
  momoFlight: boolean
  /** Seconds Momo keeps animating after the click before it flies into the nav (0 = fly as soon as the page is ready). */
  momoHoldSeconds: number
  timing: Easing | Spring
  /** Start delay per edge, as a fraction of the whole duration. */
  delay: Edges
  /** expand: each corner squares off as its two edges come within this many px of the screen edge. */
  cornerZone: number
  endRadius: number
  /** Share of the run over which the card title fades out. */
  titleFade: number
  /** Darkening of the page around the growing card at the end of the run. */
  dim: number
  /** Fade of the full-screen card after the page is committed. */
  revealMs: number
}

type Ease = { fn: (t: number) => number; duration: number }

/** Cubic-bezier easing solved per frame (Newton, then bisection). */
function bezier([x1, y1, x2, y2]: readonly number[]): (t: number) => number {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  const sampleX = (u: number) => ((ax * u + bx) * u + cx) * u
  const sampleY = (u: number) => ((ay * u + by) * u + cy) * u
  const slopeX = (u: number) => (3 * ax * u + 2 * bx) * u + cx
  return (x) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let u = x
    for (let i = 0; i < 6; i++) {
      const error = sampleX(u) - x
      const slope = slopeX(u)
      if (Math.abs(error) < 1e-5) return sampleY(u)
      if (Math.abs(slope) < 1e-6) break
      u -= error / slope
    }
    let lo = 0
    let hi = 1
    u = x
    for (let i = 0; i < 20; i++) {
      const value = sampleX(u)
      if (Math.abs(value - x) < 1e-5) break
      if (value < x) lo = u
      else hi = u
      u = (lo + hi) / 2
    }
    return sampleY(u)
  }
}

function toEase(timing: Easing | Spring): Ease {
  if (timing.type === 'easing') return { fn: bezier(timing.ease), duration: timing.duration * 1000 }
  const { samples, duration } = sampleSpring(timing)
  const last = samples.length - 1
  return {
    duration: duration * 1000,
    fn: (t) => {
      if (t >= 1) return 1
      const position = Math.max(0, t) * last
      const i = Math.floor(position)
      return samples[i] + (samples[Math.min(i + 1, last)] - samples[i]) * (position - i)
    },
  }
}

const EDGES = ['top', 'right', 'bottom', 'left'] as const
let running = false

export function openProject(card: HTMLElement, route: Route, spec: OpenSpec) {
  const commit = () => navigate(route, { transition: false })
  if (running) return
  const pageReady = preloadRoute(route)
  // The book opens on its cover; start that download while the card grows.
  if (route === 'harvard-mit') new Image().src = pageUrl(1, 'medium')
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    void pageReady.then(commit)
    return
  }
  running = true
  if (spec.effect === 'window' || spec.effect === 'iris' || spec.effect === 'zoom') {
    if (typeof document.startViewTransition === 'function') {
      void revealThrough(card, spec, pageReady, commit).finally(() => (running = false))
      return
    }
  }
  const momo = spec.momoFlight ? liftMomo(card, spec.momoHoldSeconds) : null

  const rect = card.getBoundingClientRect()
  const cardStyle = getComputedStyle(card)
  const title = card.querySelector<HTMLElement>('.card-title')

  const overlay = document.createElement('div')
  overlay.className = 'project-open'
  overlay.setAttribute('aria-hidden', 'true')
  const dim = document.createElement('div')
  dim.className = 'project-open__dim'
  const surface = document.createElement('div')
  surface.className = 'project-open__card'
  surface.style.backgroundColor = cardStyle.backgroundColor
  overlay.append(dim, surface)

  // A layer that tracks the growing rect. Cards with a live shader (Unwind): the shader grows
  // in it, continuing from the card's current frame, so it reflows like the card.
  const frameLayer = document.createElement('div')
  frameLayer.className = 'project-open__frame'
  surface.prepend(frameLayer)
  const disposeShader = spawnMesh(card, frameLayer)
  // Other cards: a live mirror of the card's artwork rides inside, shaped by the content feel.
  const content = !disposeShader && spec.contentFeel !== 'off' ? mirrorArtwork(card) : null
  if (content) frameLayer.append(content.layer)
  // Keep the card's bottom shade on it, so the first frame matches the card exactly.
  const shade = card.querySelector('.card-shade')
  if ((disposeShader || content) && shade) {
    const layer = document.createElement('div')
    layer.className = 'project-open__shade'
    const style = getComputedStyle(shade)
    layer.style.background = style.backgroundImage
    layer.style.opacity = style.opacity
    frameLayer.append(layer)
  }

  // The title rides along with the card's bottom-left corner while it fades.
  let titleClone: HTMLElement | null = null
  if (title) {
    const titleRect = title.getBoundingClientRect()
    const titleStyle = getComputedStyle(title)
    titleClone = document.createElement('div')
    titleClone.className = 'project-open__title'
    titleClone.textContent = title.innerText
    for (const property of ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'color', 'textShadow'] as const) {
      titleClone.style[property] = titleStyle[property]
    }
    titleClone.style.left = `${titleRect.left}px`
    titleClone.style.top = `${titleRect.top}px`
    titleClone.style.width = `${titleRect.width}px`
    surface.append(titleClone)
  }

  document.body.append(overlay)
  const vw = overlay.clientWidth
  const vh = overlay.clientHeight
  const from: Edges = { top: rect.top, right: vw - rect.right, bottom: vh - rect.bottom, left: rect.left }
  const startRadius = parseFloat(cardStyle.borderTopLeftRadius) * (rect.width / card.offsetWidth || 1)
  const ease = toEase(spec.timing)
  const maxDelay = Math.min(0.9, Math.max(...EDGES.map((edge) => spec.delay[edge])))
  const edgeDuration = ease.duration * (1 - maxDelay)
  // Card artwork mid-move (the Harvard & MIT crane loop) finishes its current move before the page opens.
  card.dispatchEvent(new CustomEvent(SETTLE_EVENT, { detail: { ms: ease.duration * 0.85 } }))

  const block = (event: Event) => event.preventDefault()
  overlay.addEventListener('wheel', block, { passive: false })
  overlay.addEventListener('touchmove', block, { passive: false })

  const draw = (elapsed: number) => {
    const inset = {} as Edges
    for (const edge of EDGES) {
      const local = (elapsed - spec.delay[edge] * ease.duration) / edgeDuration
      inset[edge] = from[edge] * (1 - ease.fn(Math.min(1, Math.max(0, local))))
    }
    const overall = ease.fn(Math.min(1, elapsed / ease.duration))
    // Each corner follows its own two edges: full card radius while they are far from the
    // screen, easing to square as they arrive, so the card turns full-bleed as it lands.
    const corner = (a: number, b: number) => {
      const t = spec.cornerZone > 0 ? Math.min(1, Math.max(0, Math.min(a, b) / spec.cornerZone)) : 1
      return (startRadius * t * t * (3 - 2 * t)).toFixed(2)
    }
    const radii = `${corner(inset.top, inset.left)}px ${corner(inset.top, inset.right)}px ${corner(inset.bottom, inset.right)}px ${corner(inset.bottom, inset.left)}px`
    const width = vw - inset.left - inset.right
    const height = vh - inset.top - inset.bottom
    Object.assign(frameLayer.style, {
      left: `${inset.left.toFixed(2)}px`,
      top: `${inset.top.toFixed(2)}px`,
      width: `${width.toFixed(2)}px`,
      height: `${height.toFixed(2)}px`,
    })
    if (content) {
      content.sync()
      const { scale, y, opacity } = contentPose(spec, width / rect.width, height / rect.height, overall, elapsed / ease.duration)
      content.layer.style.transform = `translate(-50%, calc(-50% + ${(y * height).toFixed(2)}px)) scale(${(scale * rect.width / content.width).toFixed(4)})`
      content.layer.style.opacity = opacity.toFixed(3)
    }
    surface.style.clipPath = `inset(${inset.top.toFixed(2)}px ${inset.right.toFixed(2)}px ${inset.bottom.toFixed(2)}px ${inset.left.toFixed(2)}px round ${radii})`
    dim.style.opacity = String(spec.dim * Math.min(1, Math.max(0, overall)))
    if (titleClone) {
      const fade = spec.titleFade > 0 ? Math.min(1, elapsed / (spec.titleFade * ease.duration)) : 1
      titleClone.style.opacity = String(1 - fade)
      titleClone.style.transform = `translate3d(${(inset.left - from.left).toFixed(2)}px, ${(from.bottom - inset.bottom).toFixed(2)}px, 0)`
    }
  }

  const finish = async () => {
    // A failed chunk load still navigates; the route's Suspense boundary retries it.
    await pageReady.catch(() => {})
    // Momo keeps animating at full screen for its hold before the page appears and it flies home.
    await momo?.hold()
    // Commit the page under the full-screen card, then let the card go.
    flushSync(commit)
    surface.style.clipPath = 'none'
    dim.style.opacity = '0'
    const reveal = overlay.animate(
      spec.effect === 'curtain' ? [{ transform: 'none' }, { transform: 'translateY(-100%)' }] : [{ opacity: 1 }, { opacity: 0 }],
      {
        duration: spec.revealMs,
        easing: spec.effect === 'curtain' ? 'cubic-bezier(0.7, 0, 0.2, 1)' : 'cubic-bezier(0.4, 0, 0.2, 1)',
        fill: 'forwards',
      },
    )
    content?.sync()
    const flight = momo?.land(spec.revealMs + 120)
    await Promise.all([reveal.finished.catch(() => {}), flight])
    disposeShader?.()
    overlay.remove()
    running = false
  }

  draw(0)
  const start = performance.now()
  const frame = (now: number) => {
    const elapsed = now - start
    draw(elapsed)
    if (elapsed < ease.duration) requestAnimationFrame(frame)
    else void finish()
  }
  requestAnimationFrame(frame)
}

/** Artwork scale, vertical drift (share of the frame height) and opacity for one frame. */
function contentPose(spec: OpenSpec, growX: number, growY: number, p: number, t: number) {
  const cover = Math.max(growX, growY)
  const k = spec.contentStrength
  const eased = Math.min(1, Math.max(0, p))
  let scale = cover
  let y = 0
  let opacity = 1
  switch (spec.contentFeel) {
    case 'zoom':
      scale = cover * (1 + 0.5 * k * eased)
      break
    case 'parallax':
      scale = 1 + (cover - 1) * Math.max(0, 1 - 0.5 * k)
      break
    case 'anchor':
      scale = 1
      break
    case 'lift':
      y = -0.12 * k * eased
      opacity = 1 - eased
      break
    case 'fade':
      opacity = 1 - eased * eased
      break
  }
  if (spec.contentFade > 0) opacity *= Math.min(1, Math.max(0, (1 - t) / spec.contentFade))
  return { scale, y, opacity }
}

/**
 * A copy of the card's artwork (its `.works__mesh` layer) that stays live: `sync()` copies the
 * source's inline styles (the Filo wall moves tiles that way) and canvas pixels (the
 * crane loop) onto the copy, so it keeps animating while the card grows over it.
 */
function mirrorArtwork(card: HTMLElement) {
  const source = card.querySelector<HTMLElement>(':scope > .works__mesh')
  if (!source) return null
  const width = source.offsetWidth
  const height = source.offsetHeight
  const layer = document.createElement('div')
  layer.className = 'project-open__content'
  layer.style.width = `${width}px`
  layer.style.height = `${height}px`
  // Smaller than the frame (anchor, parallax): the art shows as a card-shaped window.
  layer.style.borderRadius = getComputedStyle(card).borderTopLeftRadius
  let from: Element[] = []
  let to: Element[] = []
  const clone = () => {
    layer.replaceChildren(source.cloneNode(true))
    from = [source, ...source.querySelectorAll('*')]
    to = [layer.firstElementChild!, ...layer.firstElementChild!.querySelectorAll('*')]
  }
  clone()
  const sync = () => {
    if (!source.isConnected) return
    const now = source.querySelectorAll('*').length + 1
    if (now !== from.length) clone()
    for (let i = 0; i < from.length; i++) {
      const a = from[i]
      const b = to[i]
      if (a instanceof HTMLCanvasElement && b instanceof HTMLCanvasElement) {
        if (b.width !== a.width || b.height !== a.height) {
          b.width = a.width
          b.height = a.height
        }
        b.getContext('2d')?.drawImage(a, 0, 0)
        continue
      }
      const css = (a as HTMLElement).style?.cssText
      if (css !== undefined && (b as HTMLElement).style.cssText !== css) (b as HTMLElement).style.cssText = css
    }
  }
  sync()
  return { layer, sync, width, height }
}

/** The visible Momo frame inside a card or nav slot, if any. */
function momoCanvas(root: ParentNode): HTMLCanvasElement | null {
  const canvases = [...root.querySelectorAll<HTMLCanvasElement>('.momo__clip')]
  return canvases.find((canvas) => Number(getComputedStyle(canvas).opacity) > 0.5) ?? canvases[0] ?? null
}

/**
 * Lifts the card's Momo above the expansion as a live mirror of the card's own clip, so
 * it keeps animating (no restart, no second clip) for `holdSeconds`, then flies into
 * the nav's Momo once the page is committed.
 */
function liftMomo(card: HTMLElement, holdSeconds: number) {
  const source = momoCanvas(card)
  if (!source || !source.width) return null
  const from = source.getBoundingClientRect()
  const mirror = document.createElement('canvas')
  mirror.className = 'project-open__momo'
  mirror.width = source.width
  mirror.height = source.height
  Object.assign(mirror.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` })
  const ctx = mirror.getContext('2d')
  // Follows whichever of the card's clips is showing, so its own blend carries on too.
  let frame = 0
  const copy = () => {
    const live = momoCanvas(card) ?? source
    ctx?.clearRect(0, 0, mirror.width, mirror.height)
    ctx?.drawImage(live, 0, 0, mirror.width, mirror.height)
    frame = requestAnimationFrame(copy)
  }
  copy()
  document.body.append(mirror)
  const started = performance.now()
  const stop = () => cancelAnimationFrame(frame)

  return {
    /** Resolves once Momo has animated for `holdSeconds` since the click. A tap or key skips it. */
    hold(): Promise<void> {
      const left = holdSeconds * 1000 - (performance.now() - started)
      if (left <= 0) return Promise.resolve()
      return new Promise<void>((resolve) => {
        const finish = () => {
          window.clearTimeout(timer)
          window.removeEventListener('pointerdown', finish)
          window.removeEventListener('keydown', finish)
          resolve()
        }
        const timer = window.setTimeout(finish, left)
        window.addEventListener('pointerdown', finish)
        window.addEventListener('keydown', finish)
      })
    },
    async land(duration: number) {
      // The card unmounts at commit: freeze on the last frame it drew for the flight.
      stop()
      const slot = document.querySelector<HTMLElement>('.nav-momo')
      const target = slot && momoCanvas(slot)
      if (!slot || !target) {
        // No Momo in the nav: Momo fades out where it is, before the page's own intro starts.
        await mirror
          .animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(0.92)' }], { duration: Math.min(duration, 380), easing: 'ease-out', fill: 'forwards' })
          .finished.catch(() => {})
        return mirror.remove()
      }
      const to = target.getBoundingClientRect()
      slot.style.visibility = 'hidden'
      const dx = to.left + to.width / 2 - (from.left + from.width / 2)
      const dy = to.top + to.height / 2 - (from.top + from.height / 2)
      const flight = mirror.animate([{ transform: 'none' }, { transform: `translate(${dx}px, ${dy}px) scale(${to.width / from.width})` }], {
        duration,
        easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
        fill: 'forwards',
      })
      await flight.finished.catch(() => {})
      slot.style.visibility = ''
      mirror.remove()
    },
  }
}

/**
 * window / iris / zoom: View Transitions snapshot the old page and the real new page, so the
 * new page itself is revealed through the card (not a flat colour). Momo morphs into the nav
 * Momo through a shared transition name.
 */
async function revealThrough(card: HTMLElement, spec: OpenSpec, pageReady: Promise<unknown>, commit: () => void) {
  const root = document.documentElement
  const rect = card.getBoundingClientRect()
  const vw = root.clientWidth
  const vh = window.innerHeight
  const radius = parseFloat(getComputedStyle(card).borderTopLeftRadius) || 0
  const ease = toEase(spec.timing)
  const { easing } = toCssTiming(spec.timing)
  const cardMomo = spec.momoFlight ? card.querySelector<HTMLElement>('.momo') : null

  root.dataset.po = spec.effect
  root.style.setProperty('--po-ms', `${ease.duration}ms`)
  root.style.setProperty('--po-ease', easing)
  if (cardMomo) cardMomo.style.viewTransitionName = 'po-momo'
  let navMomo: HTMLElement | null = null

  const transition = document.startViewTransition(async () => {
    await pageReady.catch(() => {})
    if (cardMomo) cardMomo.style.viewTransitionName = ''
    flushSync(commit)
    navMomo = cardMomo ? document.querySelector<HTMLElement>('.nav-momo .momo') : null
    if (navMomo) navMomo.style.viewTransitionName = 'po-momo'
  })

  try {
    await transition.ready
    const timing = { duration: ease.duration, easing, fill: 'both' as const }
    const pageNew = { ...timing, pseudoElement: '::view-transition-new(root)' }
    const pageOld = { ...timing, pseudoElement: '::view-transition-old(root)' }
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    if (spec.effect === 'window') {
      const inset = `inset(${rect.top}px ${vw - rect.right}px ${vh - rect.bottom}px ${rect.left}px round ${radius}px)`
      root.animate({ clipPath: [inset, `inset(0px 0px 0px 0px round ${spec.endRadius}px)`] }, pageNew)
      root.animate({ opacity: [0, 1] }, { ...pageNew, duration: ease.duration * 0.35 })
      root.animate({ filter: ['brightness(1)', `brightness(${1 - spec.dim})`] }, pageOld)
    } else if (spec.effect === 'iris') {
      const reach = Math.hypot(Math.max(cx, vw - cx), Math.max(cy, vh - cy))
      const start = Math.min(rect.width, rect.height) / 2
      root.animate({ clipPath: [`circle(${start}px at ${cx}px ${cy}px)`, `circle(${reach}px at ${cx}px ${cy}px)`] }, pageNew)
      root.animate({ filter: ['brightness(1)', `brightness(${1 - spec.dim})`] }, pageOld)
    } else {
      const through = Math.max(vw / rect.width, vh / rect.height)
      root.animate({ transformOrigin: [`${cx}px ${cy}px`, `${cx}px ${cy}px`], transform: ['scale(1)', `scale(${through})`], opacity: [1, 0] }, pageOld)
      root.animate({ transform: ['scale(0.94)', 'scale(1)'], opacity: [0, 1] }, pageNew)
    }
    await transition.finished
  } finally {
    delete root.dataset.po
    root.style.removeProperty('--po-ms')
    root.style.removeProperty('--po-ease')
    if (navMomo) (navMomo as HTMLElement).style.viewTransitionName = ''
    if (cardMomo) cardMomo.style.viewTransitionName = ''
  }
}
