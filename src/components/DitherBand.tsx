/**
 * Animated Paper "Dithering" wave behind the header and footer.
 *
 * Uses the framework-free ShaderMount (one small WebGL canvas per band). ShaderMount
 * already pauses when the band is offscreen or the tab is hidden, so the two bands
 * cost nothing while you read the middle of the page.
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

const band = (flip: boolean, frame: number) => ({
  color: { type: 'color' as const, default: '#706B68' },
  opacity: [0.25, 0, 1, 0.01] as [number, number, number, number],
  speed: [1.15, 0, 4, 0.01] as [number, number, number, number],
  pixelSize: [4.2, 1, 12, 0.1] as [number, number, number, number],
  scale: [1.14, 0.2, 4, 0.01] as [number, number, number, number],
  shape: { type: 'select' as const, options: ['wave', 'simplex', 'warp', 'dots', 'ripple', 'swirl'], default: 'wave' },
  pattern: { type: 'select' as const, options: ['4x4', '2x2', '8x8', 'random'], default: '4x4' },
  flip,
  frame: [frame, 0, 1_000_000, 1] as [number, number, number, number],
  desktop: {
    height: [287, 60, 600, 1] as [number, number, number, number],
    widthScale: [100, 50, 200, 1] as [number, number, number, number],
    x: [0, -600, 600, 1] as [number, number, number, number],
    y: [flip ? -4 : 0, -300, 300, 1] as [number, number, number, number],
  },
  mobile: {
    height: [265, 60, 600, 1] as [number, number, number, number],
    widthScale: [313, 50, 500, 1] as [number, number, number, number],
    x: [0, -600, 600, 1] as [number, number, number, number],
    y: [0, -300, 300, 1] as [number, number, number, number],
  },
})

const CONFIG = {
  header: { ...band(true, 554221), _collapsed: false },
  footer: { ...band(false, 440992), _collapsed: true },
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
  }
  const uniformsRef = useRef(uniforms)
  uniformsRef.current = uniforms

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const mount = new ShaderMount(host, ditheringFragmentShader, uniformsRef.current, undefined, reduced ? 0 : values.speed, values.frame, 1)
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
