import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ShaderFitOptions, ShaderMount, getShaderColorFromString, meshGradientFragmentShader } from '@paper-design/shaders'
import { Momo, type MomoMode } from '../../components/MomoCard'
import { releaseShader } from '../../lib/releaseShader'
import { useTuning } from '../../tuning/useTuning'
import './momoWelcome.css'

const CONFIG = {
  blackOverlay: [0.34, 0, 0.85, 0.01] as [number, number, number, number],
  prototypeWidth: [380, 180, 600, 5] as [number, number, number, number],
  momo: {
    size: [120, 50, 180, 1] as [number, number, number, number],
    x: [0, -30, 30, 1] as [number, number, number, number],
    y: [0, -30, 30, 1] as [number, number, number, number],
    mode: { type: 'select' as const, options: ['asleep', 'awake', 'both'], default: 'asleep' },
    _collapsed: false,
  },
}

// Paper file 01M2EBW39E793RGX29545TP971, shader 3K9-0; same package/version as the card shader.
const UNIFORMS = {
  u_colors: ['#E9EEF8', '#CBEFFE', '#53BFFE', '#00D0FF'].map(getShaderColorFromString),
  u_colorsCount: 4, u_distortion: 0.8, u_swirl: 0.1, u_grainMixer: 0, u_grainOverlay: 0,
  u_fit: ShaderFitOptions.contain, u_scale: 1, u_rotation: 0, u_offsetX: 0, u_offsetY: 0,
  u_originX: 0.5, u_originY: 0.5, u_worldWidth: 0, u_worldHeight: 0,
}

/** Non-interactive 12-second welcome loop; holds the complete UI, then fades to shader only. */
export function MomoWelcome() {
  const host = useRef<HTMLDivElement>(null)
  const shader = useRef<HTMLDivElement>(null)
  const mountRef = useRef<ShaderMount | null>(null)
  const [visible, setVisible] = useState(false)
  const [entered, setEntered] = useState(false)
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const t = useTuning('Momo welcome', CONFIG)

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setReduced(media.matches)
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting)
      if (entry.intersectionRatio >= 0.5) setEntered(true)
    }, { threshold: [0, 0.5] })
    observer.observe(host.current!)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const mount = new ShaderMount(shader.current!, meshGradientFragmentShader, UNIFORMS, undefined, 0, 3861815.999999438, 1)
    mountRef.current = mount
    return () => { releaseShader(mount); mountRef.current = null }
  }, [])

  useEffect(() => {
    const update = () => mountRef.current?.setSpeed(visible && !document.hidden && !reduced ? 1 : 0)
    update()
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [visible, reduced])

  return <div className="momo-welcome" ref={host} role="img" aria-label="Animated Momo welcome screen" style={{ '--welcome-width': `${t.prototypeWidth}px`, '--welcome-overlay': t.blackOverlay, '--welcome-momo-size': `${t.momo.size}%`, '--welcome-momo-x': `${t.momo.x}%`, '--welcome-momo-y': `${t.momo.y}%` } as CSSProperties}>
    <div className="momo-welcome__phone" data-visible={visible} data-entered={entered}>
      <div className="momo-welcome__screen">
        <div className="momo-welcome__shader" ref={shader} aria-hidden="true" />
        <div className="momo-welcome__shade" aria-hidden="true" />
        <div className="momo-welcome__content" aria-hidden="true">
          <div className="momo-welcome__mascot momo-welcome__enter">
            {reduced ? <img src="/work/unwind/intro/momo-open.webp" alt="" /> : <Momo mode={t.momo.mode as MomoMode} size={`${t.momo.size}%`} x={`${t.momo.x}%`} y={`${t.momo.y}%`} />}
          </div>
          <div className="momo-welcome__brand momo-welcome__enter">
            <img className="momo-welcome__mark" src="/work/unwind/hero/momo-mark.svg" alt="" width={77.28} height={66} />
            <img className="momo-welcome__type" src="/work/unwind/hero/momo-type.png" alt="" />
          </div>
          <div className="momo-welcome__actions momo-welcome__enter">
            <div className="momo-welcome__primary">Get started</div>
            <div className="momo-welcome__secondary">I already have an account</div>
          </div>
          <p className="momo-welcome__legal momo-welcome__enter">
            By continuing, you agree to Momo’s<br /><u>Terms of Service</u> and <u>Privacy Policy</u>
          </p>
        </div>
      </div>
      <img className="momo-welcome__frame" src="/work/unwind/hero/phone-frame.png" width={1312} height={2672} alt="" draggable={false} />
    </div>
  </div>
}
