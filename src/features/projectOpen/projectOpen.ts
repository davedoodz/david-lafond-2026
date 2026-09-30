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

export type OpenSpec = {
  effect: OpenEffect
  /** Cards with Momo (Unwind): Momo flies from the card into the nav's Momo on the page. */
  momoFlight: boolean
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
  const momo = spec.momoFlight ? liftMomo(card) : null

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

  // Cards with a live shader (Unwind): the shader itself grows with the card, continuing
  // from the card's current frame. It tracks the growing rect, so it reflows like the card.
  const shader = document.createElement('div')
  shader.className = 'project-open__shader'
  surface.prepend(shader)
  const disposeShader = spawnMesh(card, shader)
  if (!disposeShader) shader.remove()
  // Keep the card's bottom shade on it, so the first frame matches the card exactly.
  const shade = card.querySelector('.card-shade')
  if (disposeShader && shade) {
    const layer = document.createElement('div')
    layer.className = 'project-open__shade'
    const style = getComputedStyle(shade)
    layer.style.background = style.backgroundImage
    layer.style.opacity = style.opacity
    shader.append(layer)
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
    if (disposeShader) {
      Object.assign(shader.style, {
        left: `${inset.left.toFixed(2)}px`,
        top: `${inset.top.toFixed(2)}px`,
        width: `${(vw - inset.left - inset.right).toFixed(2)}px`,
        height: `${(vh - inset.top - inset.bottom).toFixed(2)}px`,
      })
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

/** The visible Momo frame inside a card or nav slot, if any. */
function momoCanvas(root: ParentNode): HTMLCanvasElement | null {
  const canvases = [...root.querySelectorAll<HTMLCanvasElement>('.momo__clip')]
  return canvases.find((canvas) => Number(getComputedStyle(canvas).opacity) > 0.5) ?? canvases[0] ?? null
}

/**
 * Lifts a still of the card's Momo above the expansion, then flies it into the nav's Momo
 * once the page is committed (expand / curtain).
 */
function liftMomo(card: HTMLElement) {
  const source = momoCanvas(card)
  if (!source || !source.width) return null
  const from = source.getBoundingClientRect()
  const still = document.createElement('canvas')
  still.width = source.width
  still.height = source.height
  still.getContext('2d')?.drawImage(source, 0, 0)
  still.className = 'project-open__momo'
  Object.assign(still.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` })
  document.body.append(still)
  return {
    async land(duration: number) {
      const slot = document.querySelector<HTMLElement>('.nav-momo')
      const target = slot && momoCanvas(slot)
      if (!slot || !target) {
        await still.animate([{ opacity: 1 }, { opacity: 0 }], { duration, fill: 'forwards' }).finished.catch(() => {})
        return still.remove()
      }
      const to = target.getBoundingClientRect()
      slot.style.visibility = 'hidden'
      const dx = to.left + to.width / 2 - (from.left + from.width / 2)
      const dy = to.top + to.height / 2 - (from.top + from.height / 2)
      const flight = still.animate([{ transform: 'none' }, { transform: `translate(${dx}px, ${dy}px) scale(${to.width / from.width})` }], {
        duration,
        easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
        fill: 'forwards',
      })
      await flight.finished.catch(() => {})
      slot.style.visibility = ''
      still.remove()
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
