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
import { useTuning } from '../tuning/useTuning'
import './DitherBand.css'

type Tuple = [number, number, number, number]

/** Paper's shader + a cursor field. Anchors are asserted so a package update can't silently drop the effect. */
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
  return out
}

const interactiveDitheringShader = withMouseField(ditheringFragmentShader)

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

const CONFIG = {
  header: { ...band(true, 554221, { color: '#676767', pixelSize: 6.2, scale: 1.17 }), _collapsed: false },
  footer: { ...band(false, 440992, { color: '#706B68', pixelSize: 4.2, scale: 1.14 }), _collapsed: true },
}

type Props = { position: 'header' | 'footer' }

export function DitherBand({ position }: Props) {
  const values = useTuning('Dither bands', CONFIG)[position]
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
  }
  const uniformsRef = useRef(uniforms)
  uniformsRef.current = uniforms
  // Read by the pointer loop without re-subscribing listeners on every dial change.
  const mouseRef = useRef({ ...values.mouse, flip: values.flip })
  mouseRef.current = { ...values.mouse, flip: values.flip }

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const initial = { ...uniformsRef.current, u_mouse: [0, 0], u_mouseAmt: 0, u_mouseRadius: 1 }
    const mount = new ShaderMount(host, interactiveDitheringShader, initial, undefined, reduced ? 0 : values.speed, values.frame, 1)
    mountRef.current = mount
    return () => {
      mount.dispose()
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

    const tick = (): void => {
      raf = 0
      const mount = mountRef.current
      const canvas = host.querySelector('canvas')
      if (!mount || !canvas) return
      const m = mouseRef.current
      const rect = host.getBoundingClientRect()
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
