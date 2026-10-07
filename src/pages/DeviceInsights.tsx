import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Activity, Footprints, Heart } from 'lucide-react'
import { EditableText } from '../components/EditableText'
import './DeviceInsights.css'
import type { SectionSpacing, TextReveal } from './caseStudyContent'

/* Port of studio/unwind-insights-sequence (settings: Watch "companion", link "trace").
   Momo only speaks up when the signals agree: heart rate up, no movement or workout to explain it,
   and HRV below this person's usual. The phone is the case study's "gentle nudge" lock screen. */
const MOMO = '/work/unwind/devices/momo-open.webp'
const STEPS = [
  { id: 'sense', label: 'The Watch senses', ms: 2800 },
  { id: 'send', label: 'Watch to iPhone', ms: 2800 },
  { id: 'nudge', label: 'A gentle nudge', ms: 3600 },
] as const
type StepId = (typeof STEPS)[number]['id']
const TRANSITION_MS = 700
const SCALE = 1.1
/* Unscaled row: Watch 260 + gap 190 + phone 300; phone height 300 × 1780 / 874. */
const BASE_W = 750
const NUDGE = { title: 'Something on your mind?', body: 'Things seem a little more tense than usual. Want to talk it out?', yes: 'Yes, let’s talk it out', no: 'Not now' }
const TRACE = 'M 0 60 H 56 L 62 60 L 67 34 L 74 88 L 80 50 L 85 60 H 150'
const SIGNALS = [
  [Heart, 'Heart rate up · 40 min'],
  [Footprints, 'Sitting still, no workout'],
  [Activity, 'HRV below your usual'],
] as const

const head = (time: string) => <><span className="mc-time mc-time--left">Momo</span><span className="mc-time">{time}</span></>

function watchScreen(id: StepId) {
  if (id === 'sense')
    return (
      <div className="mc-w mc-w--center">{head('9:41')}
        <div className="mc-momo mc-momo--sm"><img src={MOMO} alt="" /><span className="mc-heart"><Heart size={9} strokeWidth={2.4} /></span></div>
        <div className="mc-title">Momo noticed</div>
        <div className="mc-signals">{SIGNALS.map(([Icon, text], i) => <div key={text} style={{ '--i': i } as CSSProperties}><Icon size={10} strokeWidth={2.2} />{text}</div>)}</div>
      </div>
    )
  if (id === 'send')
    return (
      <div className="mc-w mc-w--center">{head('9:41')}
        <div className="mc-momo mc-fly"><img src={MOMO} alt="" /></div>
        <div className="mc-trail"><i /><i /><i /></div>
        <div className="mc-title">Off to your iPhone</div>
        <div className="mc-body">Taking this moment with me.</div>
      </div>
    )
  return (
    <div className="mc-w mc-w--center">{head('9:41')}
      <div className="mc-bubble">I’m on your iPhone when you want to talk.</div>
      <img className="mc-small" src={MOMO} alt="" />
    </div>
  )
}

const phoneScreen = (id: StepId) => (
  <div className="mc-lock" data-dim={id !== 'nudge' || undefined}>
    <img className="mc-lock__bg" src="/work/unwind/flows/lockscreen.webp" alt="" />
    {id === 'nudge' && (
      <div className="mc-note">
        <span className="mc-note__icon" />
        <div className="mc-note__copy">
          <div className="mc-note__row"><span className="mc-note__app">Momo</span><span className="mc-note__time">now</span></div>
          <p className="mc-note__title">{NUDGE.title}</p>
          <p className="mc-note__text">{NUDGE.body}</p>
        </div>
        <div className="mc-note__actions"><span>{NUDGE.yes}<i className="mc-cursor" aria-hidden="true" /></span><span>{NUDGE.no}</span></div>
      </div>
    )}
  </div>
)

/* Crossfade like the studio's swap(): the new screen enters while the previous one leaves for TRANSITION_MS. */
function Screens({ step, render }: { step: StepId; render: (id: StepId) => ReactNode }) {
  const [layers, setLayers] = useState<{ id: StepId; n: number; phase?: 'entering' | 'leaving' }[]>([{ id: step, n: 0 }])
  useEffect(() => {
    setLayers(prev => {
      const top = prev[prev.length - 1]
      return top.id === step ? prev : [{ ...top, phase: 'leaving' }, { id: step, n: top.n + 1, phase: 'entering' }]
    })
    const timer = setTimeout(() => setLayers(prev => prev.filter(l => l.phase !== 'leaving')), TRANSITION_MS + 50)
    return () => clearTimeout(timer)
  }, [step])
  return <>{layers.map(l => <div key={l.n} className={`mc-screen${l.phase ? ` mc-screen--${l.phase}` : ''}`}>{render(l.id)}</div>)}</>
}

type DeviceEntrance = { preset: 'handoff' | 'rise together' | 'split sides' | 'scale in' | 'focus' | 'still'; duration: number; stagger: number }
type Props = { copy: { eyebrow: string; title: string; body: string; align: 'left' | 'center'; spacing: SectionSpacing; watch?: { strapColor: string }; deviceEntrance?: DeviceEntrance; textReveal?: TextReveal }; edit: (path: string) => (value: string) => void }

export function DeviceInsights({ copy, edit }: Props) {
  const ref = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [step, setStep] = useState(0)
  const [scale, setScale] = useState(SCALE)
  const entrance = copy.deviceEntrance ?? { preset: 'still', duration: 0.8, stagger: 0.18 }
  const textReveal = copy.textReveal ?? { preset: 'still', duration: 0.7, stagger: 0.1 }
  const strapColor = copy.watch?.strapColor ?? '#d6ccc4'
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    let lastY = window.scrollY
    let scrollingUp = false
    const onScroll = () => {
      const y = window.scrollY
      if (y !== lastY) scrollingUp = y < lastY
      lastY = y
    }
    const update = () => {
      setReduced(media.matches)
      if (media.matches) {
        setStep(2)
        el.dataset.seen = ''
      }
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    media.addEventListener('change', update)
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting)
      if (media.matches) return
      if (entry.isIntersecting) {
        if ('seen' in el.dataset) return
        el.dataset.from = scrollingUp ? 'above' : 'below'
        el.dataset.revealReady = ''
        el.dataset.resetting = ''
        delete el.dataset.exiting
        delete el.dataset.seen
        void el.offsetWidth
        delete el.dataset.resetting
        el.dataset.seen = ''
      } else {
        setStep(0)
        // Fail open while off-screen. A missed observer callback can never strand the devices hidden.
        delete el.dataset.seen
        delete el.dataset.revealReady
        delete el.dataset.resetting
        delete el.dataset.exiting
      }
    }, { threshold: [0, 0.15] })
    observer.observe(el)
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
      media.removeEventListener('change', update)
    }
  }, [])
  useLayoutEffect(() => {
    const el = stage.current
    if (!el) return
    const observer = new ResizeObserver(() => setScale(Math.min(SCALE, el.clientWidth / BASE_W)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  /* Loops: the sequence restarts right after "Yes, let's talk it out" is tapped. */
  useEffect(() => {
    if (!visible || reduced) return
    const timer = setTimeout(() => setStep((step + 1) % STEPS.length), STEPS[step].ms)
    return () => clearTimeout(timer)
  }, [visible, reduced, step])
  const id = STEPS[step].id
  return (
    <section ref={ref} className="case__section insights" data-section="dynamic" data-layout="insights" data-copy-align={copy.align} data-device-reveal={entrance.preset} data-text-reveal={textReveal.preset} aria-labelledby="case-insights" style={{ '--section-pad-top': `${copy.spacing.top}px`, '--section-pad-bottom': `${copy.spacing.bottom}px`, '--section-content-gap': `${copy.spacing.contentGap}px`, '--mc-watch-strap': strapColor, '--mc-reveal-duration': `${entrance.duration}s`, '--mc-reveal-stagger': `${entrance.stagger}s`, '--text-reveal-duration': `${textReveal.duration}s`, '--text-reveal-stagger': `${textReveal.stagger}s` } as CSSProperties}>
      <header className="insights__heading case__section-copy">
        <EditableText className="case__eyebrow eyebrow" label="Insights eyebrow" value={copy.eyebrow} onChange={edit('dynamic.eyebrow')} />
        <EditableText as="h2" id="case-insights" className="case__title" label="Insights title" value={copy.title} onChange={edit('dynamic.title')} />
        <EditableText className="case__body" label="Insights body" value={copy.body} onChange={edit('dynamic.body')} />
      </header>
      <div ref={stage} className="mc-stage" style={{ '--mc-scale': scale } as CSSProperties} role="img" aria-label="Apple Watch notices a rising heart rate, no workout and low HRV, passes the moment to iPhone, and Momo gently asks: Something on your mind?">
        <div className="mc-devices" aria-hidden="true">
          <div className="mc-watch">
            <div className="mc-watch__screen"><Screens step={id} render={watchScreen} /></div>
            <img className="mc-watch__img" src="/work/unwind/devices/watch-starlight.png" alt="" />
          </div>
          <div className="mc-link" data-state={id}>
            <svg className="mc-trace" viewBox="0 0 150 120" preserveAspectRatio="none"><path className="mc-trace__base" pathLength={100} d={TRACE} /><path className="mc-trace__live" pathLength={100} d={TRACE} /></svg>
          </div>
          <div className="mc-phone">
            <div className="mc-phone__screen"><Screens step={id} render={phoneScreen} /></div>
            <img className="mc-phone__img" src="/work/unwind/devices/iphone-silver.png" alt="" />
          </div>
        </div>
      </div>
    </section>
  )
}
