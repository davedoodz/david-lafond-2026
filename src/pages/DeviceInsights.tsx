import { useEffect, useRef, useState } from 'react'
import { Activity, ArrowRight, Check, Heart, Mic } from 'lucide-react'
import { EditableText } from '../components/EditableText'
import './DeviceInsights.css'

const PERIODS = [
  { label: 'Day', range: 'Today · October 5', mood: 'Finding your calm', stress: 'Moderate', hr: '72', hrv: '46', entries: '3', emotions: ['Calm', 'Tense', 'Hopeful'], values: [65, 58, 38, 30, 54, 62, 75], ticks: ['6 AM', '12 PM', '6 PM'], note: 'A demanding morning. More settled after your afternoon reflection.', source: 'Today’s voice entries', quote: '“Talking it through helped me slow down.”' },
  { label: 'Week', range: 'September 29 – October 5', mood: 'More room to recover', stress: 'Easing', hr: '70', hrv: '49', entries: '12', emotions: ['Hopeful', 'Calm', 'Overwhelmed'], values: [35, 44, 32, 57, 50, 69, 76], ticks: ['Mon', 'Thu', 'Sun'], note: 'Higher body stress often coincided with meeting-heavy days in your journal.', source: 'This week’s voice entries', quote: '“I noticed I carry meetings with me afterward.”' },
  { label: 'Month', range: 'October · 4 weeks', mood: 'Patterns, not just moments', stress: 'Lower', hr: '69', hrv: '52', entries: '38', emotions: ['Calm', 'Grateful', 'Anxious'], values: [32, 40, 35, 51, 46, 63, 73], ticks: ['Week 1', 'Week 2', 'Week 4'], note: 'Your reflections describe more calm, alongside steadier recovery signals.', source: 'This month’s voice entries', quote: '“I’m catching the loop a little earlier now.”' },
] as const

type Props = { copy: { eyebrow: string; title: string; body: string; align: 'left' | 'center' }; edit: (path: string) => (value: string) => void }

/** Illustrative data: biometrics indicate activation; emotions come from voice reflections. */
export function DeviceInsights({ copy, edit }: Props) {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [playing, setPlaying] = useState(true)
  const [step, setStep] = useState(0)
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => { setReduced(media.matches); if (media.matches) { setPlaying(false); setStep(2) } }
    update()
    media.addEventListener('change', update)
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting)
      if (!entry.isIntersecting && !media.matches) setStep(0)
      if (entry.isIntersecting && !media.matches) setPlaying(true)
    }, { threshold: 0.15 })
    if (ref.current) observer.observe(ref.current)
    return () => { observer.disconnect(); media.removeEventListener('change', update) }
  }, [])
  useEffect(() => {
    if (!visible || !playing) return
    const timer = setTimeout(() => {
      if (step < 4) setStep(step + 1)
      else setPlaying(false)
    }, step < 2 ? 1900 : 4800)
    return () => clearTimeout(timer)
  }, [visible, playing, step])
  const period = PERIODS[Math.max(0, step - 2)]
  const connected = step >= 2
  return (
    <section ref={ref} className="case__section insights" data-section="dynamic" data-layout="insights" data-copy-align={copy.align} data-connected={connected} data-playing={visible && playing && !reduced} aria-labelledby="case-insights">
      <header className="insights__heading case__section-copy">
        <EditableText className="case__eyebrow eyebrow" label="Insights eyebrow" value={copy.eyebrow} onChange={edit('dynamic.eyebrow')} />
        <EditableText as="h2" id="case-insights" className="case__title" label="Insights title" value={copy.title} onChange={edit('dynamic.title')} />
        <EditableText className="case__body" label="Insights body" value={copy.body} onChange={edit('dynamic.body')} />
      </header>
      <div className="insights__devices">
        <div className="insights__watch">
          <div className="insights__watch-screen">
            <img src="/work/unwind/devices/momo-open.webp" alt="" />
            <span className="insights__watch-time">9:41</span>
            <Heart size={24} />
            <strong>{connected ? 'In sync.' : step === 1 ? 'Connecting…' : 'Your day, captured.'}</strong>
            <p>{connected ? 'Your body signals meet your story.' : 'Heart rate, HRV and the moments in between.'}</p>
            <div className="insights__watch-metrics"><span>72<small>BPM</small></span><span>46<small>HRV · ms</small></span></div>
            <span className="insights__watch-status">{connected ? <Check size={13} /> : <Activity size={13} />} {connected ? 'Synced to iPhone' : 'Ready to sync'}</span>
          </div>
          <img className="insights__frame" src="/work/unwind/devices/watch-starlight.png" alt="Apple Watch prototype" />
        </div>
        <div className="insights__bridge" aria-hidden="true"><span /><span /><span /><ArrowRight size={18} /></div>
        <div className="insights__phone">
          <div className="insights__phone-screen">
            <div className="insights__status">9:41 <span>••• ▰</span></div>
            {!connected ? <div className="insights__sync"><img src="/work/unwind/devices/momo-open.webp" alt="" /><h3>{step === 1 ? 'Connecting the dots.' : 'A little more understanding.'}</h3><p>Body signals from your Watch.<br />Meaning from your voice.</p><div className="insights__sync-sources"><Heart size={20} /><span>+</span><Mic size={20} /></div></div> :
              <div className="insights__dashboard" key={period.label}>
                <div className="insights__app-title"><span>Your patterns</span><img src="/work/unwind/devices/momo-open.webp" alt="" /></div>
                <nav className="insights__periods" aria-label="Analytics time range">{PERIODS.map((p, i) => <button key={p.label} type="button" aria-pressed={period.label === p.label} onClick={() => { setStep(i + 2); setPlaying(false) }}>{p.label}</button>)}</nav>
                <small className="insights__range">{period.range}</small>
                <h3>{period.mood}</h3>
                <div className="insights__chart"><span>Mood from your reflections</span><svg viewBox="0 0 240 95" role="img" aria-label={`${period.label} mood trend moves toward calmer reflections`}><path d="M0 25H240 M0 55H240 M0 85H240" stroke="#e7eaed" fill="none" /><polyline points={period.values.map((v, i) => `${i * 40},${100 - v}`).join(' ')} fill="none" stroke="#58afe2" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />{period.values.map((v, i) => <circle key={i} cx={i * 40} cy={100 - v} r="3" fill="#58afe2" />)}</svg><div className="insights__ticks">{period.ticks.map(t => <span key={t}>{t}</span>)}</div></div>
                <div className="insights__metrics"><div><small>Body stress</small><strong>{period.stress}</strong></div><div><small>Avg. heart rate</small><strong>{period.hr}<em> bpm</em></strong></div><div><small>Avg. HRV</small><strong>{period.hrv}<em> ms</em></strong></div></div>
                <div className="insights__emotions"><small>{period.source}</small><div>{period.emotions.map(e => <span key={e}>{e}</span>)}</div></div>
                <div className="insights__reflection"><Mic size={13} /><span>{period.entries} voice reflections</span><p>{period.quote}</p></div>
                <p className="insights__note">{period.note}</p>
              </div>}
            <div className="insights__home" />
          </div>
          <img className="insights__frame" src="/work/unwind/devices/iphone-silver.png" alt="iPhone analytics prototype" />
        </div>
      </div>
    </section>
  )
}
