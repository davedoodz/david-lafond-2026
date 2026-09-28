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
import { sampleSpring, type Easing, type Spring } from '../pageTransition/cssTiming'
import './projectOpen.css'

export type Edges = { top: number; right: number; bottom: number; left: number }

export type OpenSpec = {
  timing: Easing | Spring
  /** Start delay per edge, as a fraction of the whole duration. */
  delay: Edges
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
  if (running) return
  const pageReady = preloadRoute(route)
  // The book opens on its cover; start that download while the card grows.
  if (route === 'harvard-mit') new Image().src = pageUrl(1, 'medium')
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    void pageReady.then(() => navigate(route, { transition: false }))
    return
  }
  running = true

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
    const radius = Math.max(0, startRadius + (spec.endRadius - startRadius) * overall)
    surface.style.clipPath = `inset(${inset.top.toFixed(2)}px ${inset.right.toFixed(2)}px ${inset.bottom.toFixed(2)}px ${inset.left.toFixed(2)}px round ${radius.toFixed(2)}px)`
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
    flushSync(() => navigate(route, { transition: false }))
    surface.style.clipPath = 'none'
    dim.style.opacity = '0'
    const fade = overlay.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: spec.revealMs,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'forwards',
    })
    await fade.finished.catch(() => {})
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
