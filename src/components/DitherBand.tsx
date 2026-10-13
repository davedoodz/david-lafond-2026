/**
 * Animated Paper "Dithering" wave behind the header and footer.
 *
 * Uses the framework-free ShaderMount (one small WebGL canvas per band). ShaderMount
 * already pauses when the band is offscreen or the tab is hidden, so the two bands
 * cost nothing while you read the middle of the page.
 *
 * Mouse interaction: Paper's dithering shader is extended with a soft cursor field
 * that boosts (or clears) the dither and warps the pattern around the pointer.
 * Pointer uniforms are only pushed while the cursor is near a band or the effect
 * is still easing out, so an idle page never pays for it.
 */
import { useEffect, useRef, type CSSProperties } from 'react'
import {
  DitheringShapes,
  DitheringTypes,
  ShaderFitOptions,
  ShaderMount,
  ditheringFragmentShader,
  getShaderColorFromString,
} from '@paper-design/shaders'
import { releaseShader } from '../lib/releaseShader'
import { useRoute } from '../lib/router'
import { useTuningController } from '../tuning/useTuning'
import './DitherBand.css'

type Tuple = [number, number, number, number]

/** Paper's shader + a cursor field + round-dot styles. Anchors are asserted so a package update can't silently drop the effect. */
function withMouseField(source: string): string {
  const inject = (src: string, anchor: string, add: string, before = false) => {
    if (!src.includes(anchor)) throw new Error(`DitherBand: shader anchor missing: ${anchor}`)
    return src.replace(anchor, before ? `${add}\n${anchor}` : `${anchor}\n${add}`)
  }
  let out = inject(
    source,
    'uniform float u_type;',
    `uniform vec2 u_mouse;        // drawing-buffer px, gl_FragCoord space
uniform float u_mouseAmt;     // 0..1 presence
uniform float u_mouseRadius;  // drawing-buffer px
uniform float u_mouseBoost;   // + fills dots in, - clears them
uniform float u_dotStyle;     // 0 square (Paper), 1 round, 2 bayer halftone, 3 halftone, 4 stepped grid
uniform float u_dotRadius;    // dot radius as a fraction of the cell
uniform float u_mouseWarp;    // + pushes pattern out, - pulls in`,
  )
  out = inject(
    out,
    'vec2 shapeUV = normalizedUV;',
    `  vec2 mDelta = (canvasPixelizedUV + .5 * u_resolution) - u_mouse;
  float mDist = length(mDelta) / max(u_mouseRadius, 1.);
  float mFall = u_mouseAmt * exp(-2. * mDist * mDist);
  shapeUV -= (mDelta / max(length(mDelta), 1e-3)) * mFall * u_mouseWarp * u_mouseRadius / u_resolution;`,
  )
  out = inject(out, 'int type = int(floor(u_type));', '  shape = clamp(shape + mFall * u_mouseBoost, 0., 1.);', true)
  out = inject(
    out,
    'float res = step(.5, shape + dithering);',
    `  if (u_dotStyle > .5) {
    float cellR = length(fract(pxSizeUV) - .5);
    float cellAA = .75 / pxSize;
    float rad = u_dotRadius;
    if (u_dotStyle > 3.5) {
      // Stepped grid: every cell has a dot; brightness steps in 4 levels.
      res = floor(shape * 4. + .35) / 4.;
      rad *= .6;
    } else if (u_dotStyle > 2.5) {
      // Halftone: every cell has a dot; the shape scales it.
      res = smoothstep(.04, .14, shape);
      rad *= sqrt(shape);
    } else if (u_dotStyle > 1.5) {
      // Bayer halftone: Bayer picks the dots; the shape scales them.
      rad *= .4 + .6 * shape;
    }
    res *= 1. - smoothstep(rad - cellAA, rad + cellAA, cellR);
  }`,
  )
  return out
}

const interactiveDitheringShader = withMouseField(ditheringFragmentShader)

const DOT_STYLES = { square: 0, round: 1, 'bayer halftone': 2, halftone: 3, 'stepped grid': 4 } as const

type BandLook = { color: string; pixelSize: number; scale: number }

/** Header is rotated 180° (`flip`), so its offsets mirror the footer's: −y hides band past the top edge, +y past the bottom. */
const band = (flip: boolean, frame: number, look: BandLook) => ({
  color: { type: 'color' as const, default: look.color },
  opacity: [0.25, 0, 1, 0.01] as Tuple,
  speed: [1.15, 0, 4, 0.01] as Tuple,
  pixelSize: [look.pixelSize, 1, 12, 0.1] as Tuple,
  scale: [look.scale, 0.2, 4, 0.01] as Tuple,
  shape: { type: 'select' as const, options: ['wave', 'simplex', 'warp', 'dots', 'ripple', 'swirl'], default: 'wave' },
  pattern: { type: 'select' as const, options: ['4x4', '2x2', '8x8', 'random'], default: '4x4' },
  flip,
  frame: [frame, 0, 1_000_000, 1] as Tuple,
  mouse: {
    enabled: true,
    radius: [219, 20, 600, 1] as Tuple,
    boost: [-0.99, -1, 1, 0.01] as Tuple,
    warp: [0.34, -2, 2, 0.01] as Tuple,
    follow: [0.15, 0.02, 1, 0.01] as Tuple,
  },
  desktop: {
    height: [287, 60, 600, 1] as Tuple,
    widthScale: [200, 50, 200, 1] as Tuple,
    x: [0, -600, 600, 1] as Tuple,
    y: [flip ? -63 : 63, -300, 300, 1] as Tuple,
  },
  mobile: {
    height: [265, 60, 600, 1] as Tuple,
    widthScale: [626, 50, 800, 1] as Tuple,
    x: [0, -600, 600, 1] as Tuple,
    y: [flip ? -58 : 58, -300, 300, 1] as Tuple,
  },
})

type PageLook = { color: string; opacity: number }

/** Project-page header bands: colour and opacity presets per page. `site` = the global header band above. */
const PAGE_PRESETS = {
  momo: {
    'momo blue': { color: '#53BFFE', opacity: 0.35 },
    sky: { color: '#9ED8FF', opacity: 0.45 },
    'deep sea': { color: '#1E7FB8', opacity: 0.3 },
    lilac: { color: '#B9A7F5', opacity: 0.35 },
  },
  filo: {
    moss: { color: '#4F6B4A', opacity: 0.3 },
    sage: { color: '#8DB38B', opacity: 0.35 },
    'deep moss': { color: '#3B5237', opacity: 0.3 },
    clay: { color: '#C98F6B', opacity: 0.3 },
  },
  'harvard-mit': {
    crimson: { color: '#A51C30', opacity: 0.5 },
    silver: { color: '#BDBDBD', opacity: 0.2 },
    ink: { color: '#4A4A4A', opacity: 0.6 },
    ember: { color: '#FF6A3D', opacity: 0.3 },
  },
} satisfies Record<string, Record<string, PageLook>>
type ProjectPage = keyof typeof PAGE_PRESETS
/** Dial group per project page (key in CONFIG). */
const PAGE_GROUP: Record<ProjectPage, 'momoPage' | 'filoPage' | 'harvardMitPage'> = {
  momo: 'momoPage',
  filo: 'filoPage',
  'harvard-mit': 'harvardMitPage',
}

const pageBand = (page: ProjectPage, custom: PageLook) => ({
  preset: { type: 'select' as const, options: ['site', ...Object.keys(PAGE_PRESETS[page]), 'custom'], default: 'site' },
  headerColor: { type: 'color' as const, default: custom.color },
  headerOpacity: [custom.opacity, 0, 1, 0.01] as Tuple,
  _collapsed: true,
})

const CONFIG = {
  header: {
    ...band(true, 554221, { color: '#676767', pixelSize: 6.2, scale: 1.17 }),
    /** Dot rendering on top of the dither, shared by the header and footer bands. `square` is Paper's original output. */
    dots: {
      style: { type: 'select' as const, options: Object.keys(DOT_STYLES), default: 'square' },
      radius: [0.36, 0.1, 0.5, 0.01] as Tuple,
    },
    _collapsed: false,
  },
  footer: { ...band(false, 440992, { color: '#706B68', pixelSize: 4.2, scale: 1.14 }), _collapsed: true },
  /** Header band on each project page only (footer and every other page keep the site bands). */
  momoPage: pageBand('momo', PAGE_PRESETS.momo['momo blue']),
  filoPage: pageBand('filo', PAGE_PRESETS.filo.moss),
  harvardMitPage: pageBand('harvard-mit', PAGE_PRESETS['harvard-mit'].crimson),
}

type Props = { position: 'header' | 'footer' }

export function DitherBand({ position }: Props) {
  const { values: all, setValue } = useTuningController('Dither bands', CONFIG)
  const route = useRoute()
  const page = position === 'header' && route in PAGE_GROUP ? (route as ProjectPage) : null
  const group = page ? PAGE_GROUP[page] : null
  const u = group ? all[group] : null
  // Moving a custom colour dial means "use my numbers": flip that page's preset to 'custom'.
  const customKey = u ? `${group}|${u.headerColor}|${u.headerOpacity}` : ''
  const customKeyRef = useRef(customKey)
  useEffect(() => {
    const prev = customKeyRef.current
    customKeyRef.current = customKey
    // Only a dial move on the same page counts, not arriving on a different page.
    if (!u || !prev || prev.split('|')[0] !== group || prev === customKey) return
    if (u.preset !== 'custom') setValue(`${group}.preset`, 'custom')
  }, [customKey, group, u, setValue])
  const pageHeader: PageLook | null =
    !page || !u || u.preset === 'site'
      ? null
      : u.preset === 'custom'
        ? { color: u.headerColor, opacity: u.headerOpacity }
        : ((PAGE_PRESETS[page] as Record<string, PageLook>)[u.preset] ?? null)
  const base = all[position]
  const values = { ...base, ...pageHeader }
  const dots = all.header.dots
  const hostRef = useRef<HTMLDivElement>(null)
  const mountRef = useRef<ShaderMount | null>(null)

  const uniforms = {
    u_colorBack: getShaderColorFromString('#00000000'),
    u_colorFront: getShaderColorFromString(values.color),
    u_shape: DitheringShapes[values.shape as keyof typeof DitheringShapes],
    u_type: DitheringTypes[values.pattern as keyof typeof DitheringTypes],
    u_pxSize: values.pixelSize,
    u_fit: ShaderFitOptions.none,
    u_scale: values.scale,
    u_rotation: 0,
    u_offsetX: 0,
    u_offsetY: 0,
    u_originX: 0.5,
    u_originY: 0.5,
    u_worldWidth: 0,
    u_worldHeight: 0,
    u_mouseBoost: values.mouse.boost,
    u_mouseWarp: values.mouse.warp,
    u_dotStyle: DOT_STYLES[dots.style as keyof typeof DOT_STYLES],
    u_dotRadius: dots.radius,
  }
  const uniformsRef = useRef(uniforms)
  uniformsRef.current = uniforms
  const speedRef = useRef(values.speed)
  speedRef.current = values.speed
  const frameRef = useRef(values.frame)
  frameRef.current = values.frame
  // Read by the pointer loop without re-subscribing listeners on every dial change.
  const mouseRef = useRef({ ...values.mouse, flip: values.flip })
  mouseRef.current = { ...values.mouse, flip: values.flip }

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let mount: ShaderMount
    const start = () => {
      const initial = { ...uniformsRef.current, u_mouse: [0, 0], u_mouseAmt: 0, u_mouseRadius: 1 }
      mount = new ShaderMount(host, interactiveDitheringShader, initial, undefined, reduced ? 0 : speedRef.current, frameRef.current, 1)
      mountRef.current = mount
      // The header band outlives every page; if the browser still drops its context
      // (too many live WebGL contexts), start a fresh one instead of showing a blank band.
      host.querySelector('canvas')?.addEventListener('webglcontextlost', restart, { once: true })
    }
    const restart = () => {
      releaseShader(mount)
      start()
    }
    start()
    return () => {
      host.querySelector('canvas')?.removeEventListener('webglcontextlost', restart)
      releaseShader(mount)
      mountRef.current = null
    }
    // Speed/frame/uniform changes are pushed below without recreating the WebGL context.
  }, [])

  const uniformKey = JSON.stringify(uniforms)
  useEffect(() => {
    mountRef.current?.setUniforms(uniformsRef.current)
  }, [uniformKey])

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    mountRef.current?.setSpeed(reduced ? 0 : values.speed)
  }, [values.speed])

  useEffect(() => {
    mountRef.current?.setFrame(values.frame)
  }, [values.frame])

  // Cursor field: eases toward the pointer, fades in near the band, fades out away from it.
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let targetX = 0
    let targetY = 0
    let hasPointer = false
    let x = 0
    let y = 0
    let amt = 0
    let raf = 0

    // The band's box in page coordinates, measured once and on resize. Reading it
    // per frame forced a layout on every scroll frame; the viewport rect is derived
    // from the scroll offset instead.
    // Re-measured at most twice a second as a backstop for content moving the footer band.
    let box: { left: number; top: number; width: number; height: number } | null = null
    let measuredAt = 0
    const measure = (): void => {
      const r = host.getBoundingClientRect()
      box = { left: r.left + window.scrollX, top: r.top + window.scrollY, width: r.width, height: r.height }
      measuredAt = performance.now()
    }
    const resize = new ResizeObserver(() => {
      box = null
    })
    resize.observe(host)
    resize.observe(document.documentElement)

    const tick = (): void => {
      raf = 0
      const mount = mountRef.current
      const canvas = host.querySelector('canvas')
      if (!mount || !canvas) return
      const m = mouseRef.current
      if (!box || performance.now() - measuredAt > 500) measure()
      const b = box!
      const left = b.left - window.scrollX
      const top = b.top - window.scrollY
      const rect = { left, top, right: left + b.width, bottom: top + b.height, width: b.width, height: b.height }
      const inside =
        hasPointer &&
        m.enabled &&
        targetX > rect.left - m.radius &&
        targetX < rect.right + m.radius &&
        targetY > rect.top - m.radius &&
        targetY < rect.bottom + m.radius
      if (!inside && amt === 0) return

      if (amt === 0) {
        // Entering: start at the pointer instead of sweeping in from the last exit point.
        x = targetX
        y = targetY
      }
      x += (targetX - x) * m.follow
      y += (targetY - y) * m.follow
      const goal = inside ? 1 : 0
      amt += (goal - amt) * m.follow
      if (Math.abs(goal - amt) < 0.002) amt = goal

      const sx = canvas.width / rect.width
      const sy = canvas.height / rect.height
      // gl_FragCoord is bottom-left origin; the flipped band is rotated 180° in CSS.
      const gx = (m.flip ? rect.right - x : x - rect.left) * sx
      const gy = (m.flip ? y - rect.top : rect.bottom - y) * sy
      mount.setUniforms({ u_mouse: [gx, gy], u_mouseAmt: amt, u_mouseRadius: m.radius * sx })

      const settled = amt === goal && Math.abs(targetX - x) < 0.3 && Math.abs(targetY - y) < 0.3
      if (!settled) raf = requestAnimationFrame(tick)
    }
    const kick = (): void => {
      if (!raf) raf = requestAnimationFrame(tick)
    }
    const onMove = (event: PointerEvent): void => {
      if (event.pointerType !== 'mouse') return
      targetX = event.clientX
      targetY = event.clientY
      hasPointer = true
      kick()
    }
    const onLeave = (event: PointerEvent): void => {
      if (event.relatedTarget !== null) return
      hasPointer = false
      kick()
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerout', onLeave)
    window.addEventListener('scroll', kick, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      resize.disconnect()
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerout', onLeave)
      window.removeEventListener('scroll', kick)
    }
  }, [])

  const style = {
    '--band-h-d': `${values.desktop.height}px`,
    '--band-w-d': `${values.desktop.widthScale}%`,
    '--band-x-d': `${values.desktop.x}px`,
    '--band-y-d': `${values.desktop.y}px`,
    '--band-h-m': `${values.mobile.height}px`,
    '--band-w-m': `${values.mobile.widthScale}%`,
    '--band-x-m': `${values.mobile.x}px`,
    '--band-y-m': `${values.mobile.y}px`,
    opacity: values.opacity,
  } as CSSProperties

  return (
    <div className={`dither-band dither-band--${position}`} style={style} aria-hidden="true">
      <div ref={hostRef} className={`dither-band__canvas${values.flip ? ' is-flipped' : ''}`} />
    </div>
  )
}
