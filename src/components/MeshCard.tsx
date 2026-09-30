/**
 * Paper "MeshGradient" fill for a case-study card (Unwind).
 *
 * Same ShaderMount pattern as DitherBand: one WebGL canvas that pauses when the
 * card is offscreen or the tab is hidden. The card's flat background colour
 * stays underneath as the paint-before-WebGL fallback.
 */
import { useEffect, useRef } from 'react'
import {
  ShaderFitOptions,
  ShaderMount,
  getShaderColorFromString,
  meshGradientFragmentShader,
} from '@paper-design/shaders'
import { releaseShader } from '../lib/releaseShader'
import { useTuning } from '../tuning/useTuning'

type Tuple = [number, number, number, number]

const CONFIG = {
  color1: { type: 'color' as const, default: '#E9EEF8' },
  color2: { type: 'color' as const, default: '#CBEFFE' },
  color3: { type: 'color' as const, default: '#53BFFE' },
  color4: { type: 'color' as const, default: '#00D0FF' },
  speed: [1, 0, 4, 0.01] as Tuple,
  distortion: [0.8, 0, 1, 0.01] as Tuple,
  swirl: [0.1, 0, 1, 0.01] as Tuple,
  scale: [1, 0.2, 4, 0.01] as Tuple,
  frame: [2_738_589.6, 0, 5_000_000, 1] as Tuple,
}

type MeshState = { uniforms: Record<string, unknown>; speed: number; mount: ShaderMount }
/** Live state per card host, so a transition can spawn a matching copy (spawnMesh). */
const meshes = new WeakMap<Element, MeshState>()

/**
 * Starts a copy of a card's mesh shader in `host`, on the same uniforms, speed and current
 * frame, so it continues the card's animation seamlessly. Returns dispose, or null if `card`
 * has no mesh.
 */
export function spawnMesh(card: Element, host: HTMLElement) {
  const source = card.querySelector('.works__mesh')
  const state = source && meshes.get(source)
  if (!state) return null
  const frame = (state.mount as unknown as { currentFrame: number }).currentFrame
  const mount = new ShaderMount(host, meshGradientFragmentShader, state.uniforms as never, undefined, state.speed, frame, 1)
  return () => releaseShader(mount)
}

export function MeshCard() {
  const t = useTuning('Unwind shader', CONFIG)
  const hostRef = useRef<HTMLDivElement>(null)
  const mountRef = useRef<ShaderMount | null>(null)

  const uniforms = {
    u_colors: [t.color1, t.color2, t.color3, t.color4].map((c) => getShaderColorFromString(c)),
    u_colorsCount: 4,
    u_distortion: t.distortion,
    u_swirl: t.swirl,
    u_grainMixer: 0,
    u_grainOverlay: 0,
    u_fit: ShaderFitOptions.contain,
    u_scale: t.scale,
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
    const mount = new ShaderMount(host, meshGradientFragmentShader, uniformsRef.current, undefined, reduced ? 0 : t.speed, t.frame, 1)
    mountRef.current = mount
    meshes.set(host, { uniforms: uniformsRef.current, speed: reduced ? 0 : t.speed, mount })
    return () => {
      meshes.delete(host)
      releaseShader(mount)
      mountRef.current = null
    }
    // Speed/frame/uniform changes are pushed below without recreating the WebGL context.
  }, [])

  const uniformKey = JSON.stringify(uniforms)
  useEffect(() => {
    mountRef.current?.setUniforms(uniformsRef.current)
    const state = hostRef.current && meshes.get(hostRef.current)
    if (state) state.uniforms = uniformsRef.current
  }, [uniformKey])

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    mountRef.current?.setSpeed(reduced ? 0 : t.speed)
    const state = hostRef.current && meshes.get(hostRef.current)
    if (state) state.speed = reduced ? 0 : t.speed
  }, [t.speed])

  useEffect(() => {
    mountRef.current?.setFrame(t.frame)
  }, [t.frame])

  return <div ref={hostRef} className="works__mesh" aria-hidden="true" />
}
