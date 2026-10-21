// Davebot's cursor gaze — ported from ditto's src/components/davebotGaze.ts.
//
// Gaze translates the two eye paths inside the group clipped to the head dome.
// The idle bob/sway on the avatar body is CSS (ghost.css).
//
// Touch screens have no cursor to follow, so there the eyes live on their own:
// they glance between points from 3 o'clock to 6 o'clock (right round to
// straight down, toward the page from the nav's corner) and blink now and
// then. The blink squashes each eye about its own middle in the same transform
// as the gaze, so a blink never slides the eyes. Pointer screens keep the
// steady, unblinking cursor gaze.
//
// The clip is NOT a safety net worth relying on: a cut-off pupil reads as a
// rendering bug, not as anatomy. Nor is the budget fixed, because the head
// drifts while gaze is running. So every frame the reach is capped to the room
// actually left inside the head, measured from live geometry. See `reachAlong`.
//
// Direction is exact: the offset is the unit vector to the pointer. Magnitude
// uses the angle to the pointer rather than a linear distance ramp:
//
//   gain = distance / hypot(distance, depth)   =   sin(atan2(distance, depth))
//
// That is the projection of a real eyeball rotating to face a target `depth`
// away, so it saturates — once the pointer is well past the knee the eye holds
// near-full deflection and keeps pointing straight at it, which is what reads
// as "looking at you". A linear ramp instead keeps drifting and reads as vague.

export type GazeSettings = {
  /** Requested pupil displacement in viewBox units; the mark is 32 wide and
   * its head radius is 12. The per-frame clip budget may cap the applied
   * value below this. */
  travel: number
  /** Perceived distance to Davebot in screen px; sets how fast gaze saturates. */
  depth: number
  /** Exponential follow, 0 = locked to the pointer, 0.9 = slow and floaty. */
  smoothing: number
  /** Inward eye rotation for near targets, 0 = parallel eyes, 1 = strongly crossed. */
  convergence: number
  /** Whole-body lean toward the pointer at full deflection, in screen px. */
  lean: number
}

export const GAZE_DEFAULTS: GazeSettings = {
  travel: 5,
  depth: 900,
  smoothing: 0.9,
  convergence: 0.35,
  lean: 3,
}

// Support function of an axis-aligned box with half-extents a and b along a unit
// direction: the furthest any point of that box reaches along u. The eye's own
// bounding box contains the eye whatever its shape or rotation, so bounding the
// box bounds the eye. The ellipse boundary radius is smaller than this and would
// under-report the reach, which is what let the eye cross the silhouette.
const boxSupport = (a: number, b: number, ux: number, uy: number): number =>
  a * Math.abs(ux) + b * Math.abs(uy)

// Largest t >= 0 with |c + t*u| <= limit, i.e. how far a point may advance
// along a direction before leaving a circle of that radius.
const maxAdvance = (cx: number, cy: number, ux: number, uy: number, limit: number): number => {
  if (limit <= 0) return 0
  const dot = cx * ux + cy * uy
  const discriminant = dot * dot - (cx * cx + cy * cy) + limit * limit
  if (discriminant <= 0) return 0
  return Math.max(0, Math.sqrt(discriminant) - dot)
}

type Eye = {
  transform: SVGTransform
  /** Own geometry, re-read each frame because expressions reshape the eyes. */
  path: SVGPathElement
}

type Target = {
  mount: HTMLElement
  /** Builds the eye matrices (gaze translate plus blink squash). */
  svg: SVGSVGElement
  /** The head silhouette that clips the eyes; its `d` is repainted each frame. */
  clip: SVGGraphicsElement
  eyes: Eye[]
  centerX: number
  centerY: number
  currentX: number
  currentY: number
  targetX: number
  targetY: number
}

/** Touch-screen idle look (see the header): how often the eyes move and blink, and how fast. */
const IDLE = {
  /** Hold between glances, ms (random in the range). */
  glanceMs: [900, 3200],
  /** Share of `travel` each glance reaches (random in the range). */
  glanceReach: [0.45, 1],
  /** Per-frame follow while glancing: quick, like a saccade, where the cursor gaze floats. */
  follow: 0.3,
  /** Gap between blinks, ms (random in the range), and the chance a blink comes as a double. */
  blinkMs: [2400, 5600],
  doubleBlink: 0.2,
  /** One blink: shut and open again, ms, and how flat the eye gets at its shut point. */
  blinkLength: 150,
  shut: 0.1,
} as const

const between = ([low, high]: readonly [number, number]): number => low + Math.random() * (high - low)

export type GazeTracker = {
  /** Registers one rendered avatar. Returns false when its eyes are missing. */
  track: (mount: HTMLElement) => boolean
  /** Unregisters one avatar and hands its eye paths back untouched. */
  untrack: (mount: HTMLElement) => void
  setSettings: (next: GazeSettings) => void
  destroy: () => void
}

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max)

const sanitize = (raw: Partial<GazeSettings>): GazeSettings => ({
  travel: Number.isFinite(raw.travel) ? clamp(raw.travel as number, 0, 6) : GAZE_DEFAULTS.travel,
  depth: Number.isFinite(raw.depth) ? clamp(raw.depth as number, 40, 900) : GAZE_DEFAULTS.depth,
  smoothing: Number.isFinite(raw.smoothing) ? clamp(raw.smoothing as number, 0, 0.9) : GAZE_DEFAULTS.smoothing,
  convergence: Number.isFinite(raw.convergence) ? clamp(raw.convergence as number, 0, 1) : GAZE_DEFAULTS.convergence,
  lean: Number.isFinite(raw.lean) ? clamp(raw.lean as number, 0, 12) : GAZE_DEFAULTS.lean,
})

const releaseTarget = (target: Target): void => {
  for (const eye of target.eyes) {
    const list = eye.path.transform.baseVal
    if (list.numberOfItems > 0) list.removeItem(list.numberOfItems - 1)
  }
  target.mount.style.transform = ''
}

export const createGazeTracker = (initial: GazeSettings): GazeTracker => {
  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // No hovering pointer: phones and tablets. Their eyes look around and blink on their own.
  const touchScreen = window.matchMedia('(hover: none)')
  let settings = sanitize(initial)
  const targets: Target[] = []

  let pointerX = 0
  let pointerY = 0
  let pointerPresent = false
  let geometryDirty = true
  let frame: number | null = null

  // Idle look: a direction from 3 o'clock (0) to 6 o'clock (π/2) and a share of the travel, and
  // the start of the blink in progress (null between blinks).
  let idleAngle = 0
  let idleReach = 0
  let blinkStart: number | null = null
  let glanceTimer = 0
  let blinkTimer = 0
  const idle = (): boolean => touchScreen.matches && !reduceMotion && targets.length > 0

  const measure = (): void => {
    for (const target of targets) {
      const rect = target.mount.getBoundingClientRect()
      target.centerX = rect.left + rect.width / 2
      target.centerY = rect.top + rect.height / 2
    }
    geometryDirty = false
  }

  // How far the eyes may move along (ux, uy) before either one would cross the head's outline.
  const reachAlong = (target: Target, ux: number, uy: number, headCx: number, headCy: number, headRadius: number): number => {
    let allowance = Infinity
    for (const eye of target.eyes) {
      const box = eye.path.getBBox()
      const reachOut = boxSupport(box.width / 2, box.height / 2, ux, uy)
      const advance = maxAdvance(
        box.x + box.width / 2 - headCx,
        box.y + box.height / 2 - headCy,
        ux,
        uy,
        headRadius - reachOut,
      )
      allowance = Math.min(allowance, advance)
    }
    return allowance
  }

  // Eye height while blinking: shuts in the first 40% of the blink and opens over the rest.
  const blinkScale = (now: number): number => {
    if (blinkStart === null) return 1
    const progress = (now - blinkStart) / IDLE.blinkLength
    if (progress >= 1) {
      blinkStart = null
      return 1
    }
    const closing = progress < 0.4 ? progress / 0.4 : 1 - (progress - 0.4) / 0.6
    return 1 - (1 - IDLE.shut) * Math.sin((closing * Math.PI) / 2)
  }

  const paint = (now: number): void => {
    frame = null
    if (geometryDirty) measure()

    const looking = !pointerPresent && idle()
    const blink = looking ? blinkScale(now) : 1
    // With smoothing the eyes keep easing after the pointer stops, so the loop
    // must persist until every target has settled, and through any blink.
    let moving = blink !== 1

    for (const target of targets) {
      let nextX = 0
      let nextY = 0

      // Measured once per frame and shared by the clamp and the convergence
      // sign. The head drifts during playback, so its centre is never assumed
      // to sit at the origin.
      const headBox = target.clip.getBBox()
      const headRadius = Math.min(headBox.width, headBox.height) / 2
      const headCx = headBox.x + headBox.width / 2
      const headCy = headBox.y + headBox.height / 2

      if (pointerPresent) {
        const deltaX = pointerX - target.centerX
        const deltaY = pointerY - target.centerY
        const distance = Math.hypot(deltaX, deltaY)
        if (distance > 0.0001) {
          const gain = distance / Math.hypot(distance, settings.depth)
          const ux = deltaX / distance
          const uy = deltaY / distance
          const reach = Math.min(settings.travel * gain, reachAlong(target, ux, uy, headCx, headCy, headRadius))
          nextX = ux * reach
          nextY = uy * reach
        }
      } else if (looking) {
        const ux = Math.cos(idleAngle)
        const uy = Math.sin(idleAngle)
        const reach = Math.min(settings.travel * idleReach, reachAlong(target, ux, uy, headCx, headCy, headRadius))
        nextX = ux * reach
        nextY = uy * reach
      }

      target.targetX = nextX
      target.targetY = nextY

      const follow = reduceMotion ? 1 : looking ? IDLE.follow : 1 - settings.smoothing
      target.currentX += (target.targetX - target.currentX) * follow
      target.currentY += (target.targetY - target.currentY) * follow

      if (
        Math.abs(target.targetX - target.currentX) > 0.01 ||
        Math.abs(target.targetY - target.currentY) > 0.01
      ) {
        moving = true
      }

      // Near targets converge; distant targets stay parallel. Nearness is read
      // from the SMOOTHED offset, not the raw gain, so convergence eases with
      // the eyes instead of jumping when the pointer teleports.
      const settled =
        settings.travel > 0
          ? Math.min(Math.hypot(target.currentX, target.currentY) / settings.travel, 1)
          : 0
      const converge = pointerPresent ? settings.convergence * settings.travel * 0.35 * (1 - settled) : 0

      for (const eye of target.eyes) {
        const box = eye.path.getBBox()
        const inward = box.x + box.width / 2 + target.currentX > headCx ? -1 : 1
        // Translate by the gaze, and squash the eye about its own middle for the blink.
        const matrix = target.svg.createSVGMatrix()
        matrix.d = blink
        matrix.e = target.currentX + converge * inward
        matrix.f = target.currentY + (box.y + box.height / 2) * (1 - blink)
        eye.transform.setMatrix(matrix)
      }

      if (reduceMotion || settings.lean === 0) {
        target.mount.style.transform = ''
      } else {
        const leanScale = settings.travel > 0 ? settings.lean / settings.travel : 0
        const leanX = target.currentX * leanScale
        const leanY = target.currentY * leanScale
        target.mount.style.transform = `translate3d(${leanX.toFixed(2)}px, ${leanY.toFixed(2)}px, 0)`
      }
    }

    if (moving) frame = requestAnimationFrame(paint)
  }

  const request = (): void => {
    if (frame === null && targets.length > 0) frame = requestAnimationFrame(paint)
  }

  // Idle timers: each glance and each blink schedules the next while the idle look is on and the
  // page is visible; `startIdle` (re)starts them, `stopIdle` clears them and recentres the eyes.
  const glance = (): void => {
    // A new direction, never the same one twice running.
    let next = Math.random() * (Math.PI / 2)
    if (Math.abs(next - idleAngle) < Math.PI / 12) next = (next + Math.PI / 4) % (Math.PI / 2)
    idleAngle = next
    idleReach = between(IDLE.glanceReach)
    request()
    glanceTimer = window.setTimeout(glance, between(IDLE.glanceMs))
  }
  const blinkNow = (): void => {
    blinkStart = performance.now()
    request()
    const again = Math.random() < IDLE.doubleBlink
    blinkTimer = window.setTimeout(blinkNow, again ? IDLE.blinkLength + 110 : between(IDLE.blinkMs))
  }
  const stopIdle = (): void => {
    window.clearTimeout(glanceTimer)
    window.clearTimeout(blinkTimer)
    glanceTimer = 0
    blinkTimer = 0
    blinkStart = null
    request()
  }
  const startIdle = (): void => {
    stopIdle()
    if (!idle() || document.hidden) return
    glance()
    blinkTimer = window.setTimeout(blinkNow, between(IDLE.blinkMs))
  }

  const onPointerMove = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') return
    pointerX = event.clientX
    pointerY = event.clientY
    pointerPresent = true
    request()
  }

  const release = (): void => {
    pointerPresent = false
    request()
  }

  const onPointerOut = (event: PointerEvent): void => {
    if (event.relatedTarget !== null) return
    release()
  }

  const onVisibility = (): void => {
    if (document.hidden) release()
    startIdle()
  }

  const markDirty = (): void => {
    geometryDirty = true
    request()
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('pointerout', onPointerOut)
  window.addEventListener('blur', release)
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('scroll', markDirty, { passive: true })
  touchScreen.addEventListener('change', startIdle)
  const observer = new ResizeObserver(markDirty)
  observer.observe(document.documentElement)

  return {
    track: mount => {
      const svg = mount.querySelector<SVGSVGElement>('svg')
      const paths = svg?.querySelectorAll<SVGPathElement>('g[clip-path] > path')
      // The clip path child is the head silhouette, and getBBox works on it even
      // though clipPath contents are never painted.
      const clip = svg?.querySelector<SVGPathElement>('clipPath path')
      if (!svg || !clip || !paths || paths.length !== 2) return false

      const eyes: Eye[] = []
      for (const path of paths) {
        const transform = svg.createSVGTransform()
        transform.setTranslate(0, 0)
        // Chromium clones both the appended object and appendItem's return
        // value; only getItem yields the live handle that setMatrix updates.
        path.transform.baseVal.appendItem(transform)
        const attached = path.transform.baseVal.getItem(path.transform.baseVal.numberOfItems - 1)
        eyes.push({ transform: attached, path })
      }

      targets.push({
        mount,
        svg,
        clip,
        eyes,
        centerX: 0,
        centerY: 0,
        currentX: 0,
        currentY: 0,
        targetX: 0,
        targetY: 0,
      })
      markDirty()
      if (targets.length === 1) startIdle()
      return true
    },
    untrack: mount => {
      const index = targets.findIndex(target => target.mount === mount)
      if (index === -1) return
      releaseTarget(targets[index])
      targets.splice(index, 1)
      if (targets.length === 0) stopIdle()
    },
    setSettings: next => {
      settings = sanitize(next)
      request()
    },
    destroy: () => {
      if (frame !== null) {
        cancelAnimationFrame(frame)
        frame = null
      }
      stopIdle()
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerout', onPointerOut)
      window.removeEventListener('blur', release)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('scroll', markDirty)
      touchScreen.removeEventListener('change', startIdle)
      observer.disconnect()
      for (const target of targets) releaseTarget(target)
      targets.length = 0
    },
  }
}

// One gaze tracker for the whole app: every mounted GhostMark shares the same
// pointer listeners and rAF loop instead of each instance running its own.
let sharedTracker: GazeTracker | null = null

export const getSharedGazeTracker = (): GazeTracker => {
  sharedTracker ??= createGazeTracker(GAZE_DEFAULTS)
  return sharedTracker
}
