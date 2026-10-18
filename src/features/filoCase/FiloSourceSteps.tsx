import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { useTuning } from '../../tuning/useTuning'
import './filoSourceSteps.css'

/**
 * Filo "source" section: three steps from the innovator's first data to the open Technical File.
 * The data card, the sample box and the flat tag are crops of David's reference (public/work/filo/steps,
 * whitened so the page shows through via multiply, shadows kept). Step 3 is one realistic phone whose
 * screen loops scanning → tag detected → Technical File, rebuilt in HTML.
 */

const ICON = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

const ICONS: Record<string, ReactNode> = {
  composition: <><circle cx="12" cy="12" r="8" /><circle cx="9.5" cy="10" r="1.2" /><circle cx="14.5" cy="10.5" r="1.2" /><path d="M9 14.5c1.6 1.4 4.4 1.4 6 0" /></>,
  weight: <><path d="M7.5 9h9l2 10h-13z" /><path d="M10 9V7.5a2 2 0 0 1 4 0V9" /></>,
  width: <><path d="M4 12h16" /><path d="M7 9l-3 3 3 3M17 9l3 3-3 3" /></>,
  care: <><path d="M3.5 7.5l2.2 10.5h12.6l2.2-10.5" /><path d="M4.4 11.5c1.9 1.3 3.8 1.3 5.2 0 1.4 1.3 3.4 1.3 4.8 0 1.4 1.3 3.3 1.3 5.2 0" /></>,
  verify: <><path d="M12 3.5l7 2.8v5c0 4.3-2.9 7.6-7 9.2-4.1-1.6-7-4.9-7-9.2v-5z" /><path d="M9 12l2.1 2.1L15 10.2" /></>,
}
const Icon = ({ name }: { name: string }) => <svg className="fss-icon" viewBox="0 0 24 24" aria-hidden="true" {...ICON}>{ICONS[name]}</svg>

const PROPERTIES = [
  ['composition', 'Composition', '100% BC'],
  ['weight', 'Weight', '120 gsm'],
  ['width', 'Width', '145 cm'],
  ['care', 'Recommended care', 'Max 60°C'],
] as const
const OPEN_CHECKS = ['Heat tolerance', 'Seam performance', 'Pilling']

const Logo = () => <img className="fss-logo" src="/work/filo/filo-mark.webp" width={990} height={466} alt="Filo" />

/**
 * The Momo case study's in-app status bar (phoneFilm.js `statusBar`, with its saved Status icons gaps:
 * Wi-Fi 6.1pt, battery 7.4pt), drawn in the same 390pt screen units so it scales with the phone and
 * sits level with the frame's Dynamic Island.
 */
const StatusBar = () => <svg className="fss-status" viewBox="0 0 390 54" aria-hidden="true">
  <text x="52" y="30" dominantBaseline="middle">9:41</text>
  {[4.3, 5.9, 8.4, 10.7].map((h, i) => <rect key={i} x={278.2 + i * 4.93} y={34 - h} width="3.3" height={h} rx="1.1" />)}
  <path className="fss-status__wifi" d="M303.28 26.25A11.1 11.1 0 0 1 318.12 26.25M306.05 29.33A6.95 6.95 0 0 1 315.35 29.33" />
  <path className="fss-status__wedge" d="M310.7 33.8L308.9 31.79A2.7 2.7 0 0 1 312.5 31.79Z" />
  <rect className="fss-status__cell" x="325.05" y="23.7" width="20" height="11" rx="4" />
  <path opacity=".4" d="M346.25 27.45h.7a.7.7 0 0 1 .7.7v2.1a.7.7 0 0 1-.7.7h-.7z" />
  <rect x="326.4" y="25" width="17.3" height="8.4" rx="2.5" />
</svg>

function ScanLayer() {
  return <div className="fss-layer fss-layer--scan">
    <Logo />
    <div className="fss-center">
      <span className="fss-scan" aria-hidden="true">
        <i /><i /><i />
        <svg viewBox="0 0 24 24" {...ICON} strokeWidth={1.7}><path d="M8.5 9.2a4 4 0 0 1 0 5.6M11.6 7a7.2 7.2 0 0 1 0 10M14.8 4.8a10.4 10.4 0 0 1 0 14.4" /></svg>
      </span>
      <p className="fss-center__title">Ready to scan</p>
      <p>Hold near a Filo tag</p>
    </div>
  </div>
}

function DetectLayer() {
  return <div className="fss-layer fss-layer--detect">
    <Logo />
    <div className="fss-center">
      <span className="fss-check" aria-hidden="true">
        <svg viewBox="0 0 24 24" {...ICON} strokeWidth={1.8}><path d="M6.5 12.5l3.6 3.6L17.5 8.5" /></svg>
      </span>
      <p className="fss-center__title">Tag detected</p>
      <p>Opening material record…</p>
    </div>
  </div>
}

function FileLayer() {
  return <div className="fss-layer fss-layer--file">
    <div className="fss-bar"><Logo /><span className="fss-more" aria-hidden="true">···</span></div>
    <div className="fss-photo">
      <img src="/work/filo/studio/cellulose.webp" alt="" loading="lazy" decoding="async" />
      <span className="fss-pill">In development</span>
    </div>
    <p className="fss-name">Bacterial Cellulose</p>
    <dl className="fss-props">
      {PROPERTIES.map(([icon, label, value]) => <div key={label}>
        <dt><Icon name={icon} />{label}</dt>
        <dd>{value}</dd>
      </div>)}
    </dl>
    <div className="fss-verify">
      <p><Icon name="verify" /><span>Needs verification</span><span className="fss-count">3 items</span></p>
      <ul>
        {OPEN_CHECKS.map((check) => <li key={check}>
          <span className="fss-dot" aria-hidden="true" />{check}
          <svg className="fss-chevron" viewBox="0 0 24 24" aria-hidden="true" {...ICON}><path d="M10 7l5 5-5 5" /></svg>
        </li>)}
      </ul>
    </div>
  </div>
}

/** A realistic phone (the Momo frame) over the three screens; the flat tag peeks out behind it. */
function TapPhone() {
  return <div className="fss-tap">
    <img className="fss-crop fss-crop--tag" src="/work/filo/steps/flat-tag.webp" width={236} height={420} loading="lazy" decoding="async" alt="" />
    <div className="fss-phone">
      <div className="fss-screen">
        <StatusBar />
        <ScanLayer />
        <DetectLayer />
        <FileLayer />
        <span className="fss-home" aria-hidden="true" />
      </div>
      <img className="fss-frame" src="/work/momo/hero/phone-frame.png" width={1312} height={2672} alt="" draggable={false} />
    </div>
  </div>
}

/**
 * Step 1: the innovator's desktop app, cross-fading through its screens on the same on-screen clock
 * as the phone. Each frame holds, then fades into the next; the last fades back into the first.
 */
const APP_FRAMES = [
  ['app-materials', 'Filo materials library: Bacterial Cellulose saved as a draft beside published materials, with its summary and properties.'],
  ['app-add-material', 'Add a new material: the innovator uploads a datasheet, lab report, OEKO-TEX certificate and material photos.'],
  ['app-extracting', 'Extracting information: Filo reads the documents into a draft record, each value linked to its source document.'],
  ['app-review', 'Review and confirm: Bacterial Cellulose is ready to publish, every property traced to a page of its source document.'],
] as const

function AppDeck() {
  return <div className="fss-app">
    {APP_FRAMES.map(([file, alt], i) => <img
      key={file}
      className="fss-app__frame"
      src={`/work/filo/steps/${file}.webp`}
      width={1536}
      height={1024}
      loading="lazy"
      decoding="async"
      alt={alt}
      style={{ '--i': i } as CSSProperties}
    />)}
  </div>
}

const STEPS: { title: string; visual: ReactNode }[] = [
  {
    title: 'Material innovator\nprovides initial data.',
    visual: <AppDeck />,
  },
  {
    title: 'Sample arrives\nwith a Filo tag.',
    visual: <img className="fss-crop fss-crop--box" src="/work/filo/steps/sample-box.webp" width={480} height={545} loading="lazy" decoding="async"
      alt="An opened recycled-card sample box holding a folded cellulose swatch." />,
  },
  {
    title: 'Technical designer taps the tag.\nThe Technical File opens.',
    visual: <TapPhone />,
  },
]

type Tuple = [number, number, number, number]
const CONFIG = {
  /** Step 1's desktop app loop. */
  app: {
    /** How long each of the four screens stays up, fade included (s). */
    seconds: [3.5, 1.5, 8, 0.1] as Tuple,
  },
  /** Step 3's phone and tag, as one group. Defaults centre the group under its number and title. */
  phone: {
    /** Size of the phone and tag together (1 = the 272px phone). */
    scale: [0.8, 0.5, 1.2, 0.01] as Tuple,
    /** Move from the centred spot (px): positive x goes right, positive y goes down. */
    x: [0, -200, 200, 1] as Tuple,
    y: [0, -200, 200, 1] as Tuple,
  },
}

export function FiloSourceSteps({ spacing }: { spacing: { top: number; bottom: number } }) {
  const dials = useTuning('Filo source steps', CONFIG)
  const ref = useRef<HTMLOListElement>(null)
  // Each step's loop runs only while that step is on screen, so the app starts on its first screen
  // and the phone on "scanning" when the reader reaches them.
  useEffect(() => {
    const steps = ref.current?.children
    if (!steps) return
    const observer = new IntersectionObserver(entries => {
      for (const { target, isIntersecting } of entries) {
        const step = target as HTMLElement
        if (isIntersecting) step.dataset.playing = ''
        else delete step.dataset.playing
      }
    }, { threshold: 0.2 })
    for (const step of steps) observer.observe(step)
    return () => observer.disconnect()
  }, [])
  return <section
    className="case__section filo-steps"
    data-section="source"
    aria-label="From initial material data to an open Technical File"
    style={{
      '--section-pad-top': `${spacing.top}px`,
      '--section-pad-bottom': `${spacing.bottom}px`,
      '--fss-app-cycle': `${dials.app.seconds * APP_FRAMES.length}s`,
      '--fss-phone-scale': dials.phone.scale,
      '--fss-phone-x': `${dials.phone.x}px`,
      '--fss-phone-y': `${dials.phone.y}px`,
    } as CSSProperties}
  >
    <ol ref={ref} className="fss-steps">
      {STEPS.map((step, i) => <li key={i} className="fss-step">
        <span className="fss-num case__eyebrow eyebrow">{String(i + 1).padStart(2, '0')}</span>
        <h3 className="fss-title">{step.title}</h3>
        <div className="fss-visual">{step.visual}</div>
      </li>)}
    </ol>
  </section>
}
