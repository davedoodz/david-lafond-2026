import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
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

const StatusBar = () => <div className="fss-status" aria-hidden="true">
  <span>9:41</span>
  <svg viewBox="0 0 46 12" fill="currentColor">
    <rect x="0" y="7.5" width="3" height="4.5" rx=".8" /><rect x="4.5" y="5.5" width="3" height="6.5" rx=".8" /><rect x="9" y="3" width="3" height="9" rx=".8" /><rect x="13.5" y=".5" width="3" height="11.5" rx=".8" />
    <path d="M24.5 3.6a7.6 7.6 0 0 1 9.8 0l-1.3 1.4a5.7 5.7 0 0 0-7.2 0zm2.2 2.4a4.3 4.3 0 0 1 5.4 0l-2.7 3z" />
    <rect x="37.5" y="1.5" width="7" height="9" rx="2.2" transform="rotate(90 41 6)" fill="none" stroke="currentColor" opacity=".45" />
    <rect x="37.4" y="3.4" width="7.2" height="5.2" rx="1.2" />
  </svg>
</div>

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

const STEPS: { title: string; visual: ReactNode }[] = [
  {
    title: 'Material innovator\nprovides initial data.',
    visual: <img className="fss-crop fss-crop--card" src="/work/filo/steps/data-card.webp" width={450} height={530} loading="lazy" decoding="async"
      alt="Initial data card: 100% bacterial cellulose, 120 gsm, 145 cm wide, care max 60°C, OEKO-TEX pending, spec sheet and lab report." />,
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

export function FiloSourceSteps({ spacing }: { spacing: { top: number; bottom: number } }) {
  const ref = useRef<HTMLElement>(null)
  // The phone loop runs only while the section is on screen, so it always starts on "scanning".
  useEffect(() => {
    const section = ref.current
    if (!section) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) section.dataset.playing = ''
      else delete section.dataset.playing
    }, { threshold: 0.2 })
    observer.observe(section)
    return () => observer.disconnect()
  }, [])
  return <section
    ref={ref}
    className="case__section filo-steps"
    data-section="source"
    aria-label="From initial material data to an open Technical File"
    style={{ '--section-pad-top': `${spacing.top}px`, '--section-pad-bottom': `${spacing.bottom}px` } as CSSProperties}
  >
    <ol className="fss-steps">
      {STEPS.map((step, i) => <li key={i} className="fss-step">
        <span className="fss-num case__eyebrow eyebrow">{String(i + 1).padStart(2, '0')}</span>
        <h3 className="fss-title">{step.title}</h3>
        <div className="fss-visual">{step.visual}</div>
      </li>)}
    </ol>
  </section>
}
