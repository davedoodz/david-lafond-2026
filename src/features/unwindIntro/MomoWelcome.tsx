import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ShaderFitOptions, ShaderMount, getShaderColorFromString, meshGradientFragmentShader } from '@paper-design/shaders'
import { Momo } from '../../components/MomoCard'
import { releaseShader } from '../../lib/releaseShader'
import { useTuningController } from '../../tuning/useTuning'
import './momoWelcome.css'

const CONFIG = {
  blackOverlay: [0.34, 0, 0.85, 0.01] as [number, number, number, number],
  replay: { type: 'action' as const, label: 'Replay welcome entrance' },
}

// Paper file 01M2EBW39E793RGX29545TP971, shader 3K9-0; same package/version as the card shader.
const UNIFORMS = {
  u_colors: ['#E9EEF8', '#CBEFFE', '#53BFFE', '#00D0FF'].map(getShaderColorFromString),
  u_colorsCount: 4, u_distortion: 0.8, u_swirl: 0.1, u_grainMixer: 0, u_grainOverlay: 0,
  u_fit: ShaderFitOptions.contain, u_scale: 1, u_rotation: 0, u_offsetX: 0, u_offsetY: 0,
  u_originX: 0.5, u_originY: 0.5, u_worldWidth: 0, u_worldHeight: 0,
}

/** Welcome-screen interaction study. Account and legal destinations are not supplied. */
export function MomoWelcome() {
  const host = useRef<HTMLDivElement>(null)
  const shader = useRef<HTMLDivElement>(null)
  const mountRef = useRef<ShaderMount | null>(null)
  const [visible, setVisible] = useState(false)
  const [entered, setEntered] = useState(false)
  const [take, setTake] = useState(0)
  const [awake, setAwake] = useState(false)
  const [actionsReady, setActionsReady] = useState(false)
  const reaction = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const replay = () => { setActionsReady(false); setEntered(true); setTake(n => n + 1) }
  const { values: t } = useTuningController('Momo welcome', CONFIG, { onAction: replay })

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setReduced(media.matches)
    media.addEventListener('change', change)
    return () => { media.removeEventListener('change', change); clearTimeout(reaction.current) }
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

  const greet = () => {
    clearTimeout(reaction.current)
    setAwake(true)
    reaction.current = setTimeout(() => setAwake(false), 2400)
  }

  return <div className="momo-welcome" ref={host} style={{ '--welcome-overlay': t.blackOverlay } as CSSProperties}>
    <div className="momo-welcome__phone" data-visible={visible} data-entered={entered}>
      <div className="momo-welcome__screen">
        <div className="momo-welcome__shader" ref={shader} aria-hidden="true" />
        <div className="momo-welcome__shade" aria-hidden="true" />
        <div key={take} className="momo-welcome__content">
          <button className="momo-welcome__mascot momo-welcome__enter" style={{ '--delay': '600ms' } as CSSProperties} disabled={!entered && !reduced} aria-label="Say hello to Momo" onClick={greet}>
            {reduced ? <img src="/work/unwind/intro/momo-open.webp" alt="" /> : <Momo mode={awake ? 'awake' : 'asleep'} size="120%" x="0%" y="0%" />}
          </button>
          <img className="momo-welcome__brand momo-welcome__enter" style={{ '--delay': '1500ms' } as CSSProperties} src="/work/unwind/hero/momo-wordmark.png" alt="Momo" width={679} height={186} />
          <div className="momo-welcome__actions momo-welcome__enter" style={{ '--delay': '2250ms' } as CSSProperties} onAnimationEnd={() => setActionsReady(true)}>
            <button className="momo-welcome__primary" disabled={!actionsReady && !reduced} onClick={greet}>Get started</button>
            <button className="momo-welcome__secondary" disabled={!actionsReady && !reduced} onClick={greet}>I already have an account</button>
          </div>
          <p className="momo-welcome__legal momo-welcome__enter" style={{ '--delay': '2950ms' } as CSSProperties}>
            By continuing, you agree to Momo’s<br /><u>Terms of Service</u> and <u>Privacy Policy</u>
          </p>
        </div>
      </div>
      <img className="momo-welcome__frame" src="/work/unwind/hero/phone-frame.png" width={1312} height={2672} alt="" draggable={false} />
    </div>
    <button type="button" className="momo-welcome__replay" onClick={replay}>Replay welcome</button>
  </div>
}
