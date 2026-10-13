import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { FiloPhone, StatusBar } from './FiloPhone'
import './filoFlowScreens.css'

const SWATCH_URL = '/work/filo/flows/biocell-swatch.webp'

/* ---------------------------------------------------------------- hooks */

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/** True while the element is meaningfully on screen. */
function useInView<T extends Element>(threshold = 0.25) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold })
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])
  return [ref, inView] as const
}

/** A looping clock in ms, quantized to ~10fps to limit re-renders; 0 and frozen while inactive. */
function useLoopClock(durationMs: number, active: boolean) {
  const [t, setT] = useState(0)
  const startRef = useRef<number | null>(null)
  const rafRef = useRef<number>(0)
  useEffect(() => {
    if (!active) {
      startRef.current = null
      setT(0)
      return
    }
    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now
      const elapsed = (now - startRef.current) % durationMs
      setT(prev => {
        const quantized = Math.round(elapsed / 90) * 90
        return prev === quantized ? prev : quantized
      })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [active, durationMs])
  return t
}

/**
 * Tier index (0/1/2) driven purely by wall-clock time, so the bare picker card
 * and the ladder phone — two independent components — stay in sync without
 * shared React state. `phase` is progress (0..1) within the current tier's slot.
 */
const TIER_SLOT_MS = 3000
function useTier(active: boolean) {
  const [state, setState] = useState({ tier: 0, phase: 0 })
  const rafRef = useRef<number>(0)
  useEffect(() => {
    if (!active) return
    const tick = () => {
      const now = performance.now()
      const cycle = now % (TIER_SLOT_MS * 3)
      const tier = Math.floor(cycle / TIER_SLOT_MS) as 0 | 1 | 2
      const phase = (cycle % TIER_SLOT_MS) / TIER_SLOT_MS
      setState(prev => (prev.tier === tier && Math.abs(prev.phase - phase) < 0.02 ? prev : { tier, phase }))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [active])
  return state
}

/* ---------------------------------------------------------------- icons */

function IconCheck() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.14" />
      <path d="M6 10.2l2.6 2.6L14.2 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IconFlag() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path d="M10 1.5v17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10 2.5c2.4-1.3 4 .4 6 0v8c-2 .4-3.6-1.3-6 0z" fill="currentColor" opacity="0.9" />
    </svg>
  )
}
function IconFaceId() {
  return (
    <svg viewBox="0 0 32 32" fill="none">
      <path d="M4 10V6a2 2 0 0 1 2-2h4M28 10V6a2 2 0 0 0-2-2h-4M4 22v4a2 2 0 0 0 2 2h4M28 22v4a2 2 0 0 1-2 2h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="14" r="1.3" fill="currentColor" />
      <circle cx="20" cy="14" r="1.3" fill="currentColor" />
      <path d="M16 13v4.5c0 .6-.5 1-1 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M11 21.5c1.3 1 3 1.5 5 1.5s3.7-.5 5-1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
function IconMic() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <rect x="7.5" y="2.5" width="5" height="9" rx="2.5" fill="currentColor" />
      <path d="M4.5 10.5a5.5 5.5 0 0 0 11 0M10 16v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
function IconShare() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <path d="M10 2.5v10.5M6 6.5 10 2.5l4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 10.5v5a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 16 15.5v-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IconAirdrop() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="2.3" fill="currentColor" />
      <path d="M5.8 6.3a6 6 0 0 1 8.4 0M3.6 4a9 9 0 0 1 12.8 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
function IconLine() {
  return (
    <svg viewBox="0 0 20 20" fill="none">
      <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 8h8M6 11h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/* ---------------------------------------------------------------- 1. Morning digest */

const TRACE = [
  { text: 'I asked 3 suppliers for A4 swatches of BC-01.', time: '02:14' },
  { text: 'Polybion replied with a sample run quote.', time: '05:40' },
  { text: 'I booked colorfastness and seam strength tests.', time: '06:02' },
  { text: 'I matched the swatch tag to OS-114’s Technical File.', time: '06:48' },
]

export function FiloDigestPhone() {
  const reduced = useReducedMotion()
  const [wrapRef, inView] = useInView<HTMLDivElement>()
  const active = inView && !reduced
  const t = useLoopClock(9000, active)
  const settled = reduced || !inView
  const g = (ms: number) => settled || t >= ms

  const cardShown = g(1900)
  const faceidShown = !settled && t >= 3300 && t < 4300
  const approved = g(4300)
  const threadPct = settled ? 100 : Math.max(0, Math.min(1, (t - 4300) / 2200)) * 100

  return (
    <div ref={wrapRef} style={{ width: '100%', height: '100%' }}>
      <FiloPhone>
        <div className="filo-scr filo-digest">
          <StatusBar time="7:02" />
          <div className="filo-scr__head" style={{ top: 70 }}>
            <p className="filo-scr__eyebrow">Monday · 7:02 AM</p>
            <h1 className="filo-scr__title">Good morning</h1>
          </div>
          <div className="filo-digest__body">
            <p className="filo-digest__trace-label">While you slept</p>
            <ol className="filo-digest__trace">
              {TRACE.map((item, i) => (
                <li key={item.text} data-shown={g(300 + i * 420) || undefined}>
                  <span className="filo-digest__dot" aria-hidden="true" />
                  <span>
                    <span className="filo-digest__trace-text">{item.text}</span>
                    <span className="filo-digest__trace-time">{item.time}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="filo-digest__spacer" />
            <div className="filo-digest__card" data-shown={cardShown || undefined}>
              {!approved ? (
                <>
                  <p className="filo-digest__card-title">Sample run · 3 suppliers · €214 · ~9 days</p>
                  <p className="filo-digest__card-sub">BC-01 for SS27 Overshirt · OS-114</p>
                  <ul className="filo-digest__suppliers">
                    <li className="filo-digest__supplier">
                      <span className="filo-digest__supplier-name">Polybion</span>
                      <span className="filo-digest__supplier-meta">8 days</span>
                      <span className="filo-digest__supplier-meta">€72</span>
                    </li>
                    <li className="filo-digest__supplier">
                      <span className="filo-digest__supplier-name">Scoby Tex</span>
                      <span className="filo-digest__supplier-meta">9 days</span>
                      <span className="filo-digest__supplier-meta">€68</span>
                    </li>
                    <li className="filo-digest__supplier">
                      <span className="filo-digest__supplier-name">Modern Synthesis</span>
                      <span className="filo-digest__supplier-meta">11 days</span>
                      <span className="filo-digest__supplier-meta">€74</span>
                    </li>
                  </ul>
                  <div className="filo-digest__action" data-pulse={faceidShown || undefined}>
                    <IconFaceId />
                    <span>Approve with Face ID</span>
                  </div>
                </>
              ) : (
                <div className="filo-digest__approved">
                  <div className="filo-digest__approved-row">
                    <IconCheck />
                    <span className="filo-digest__approved-text">Approved · ordering</span>
                  </div>
                  <p className="filo-digest__card-sub" style={{ marginTop: 6 }}>
                    3 suppliers · €214 · ~9 days
                  </p>
                  <div className="filo-digest__thread">
                    <div className="filo-digest__thread-fill" style={{ width: `${threadPct}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </FiloPhone>
    </div>
  )
}

/* ---------------------------------------------------------------- 2. Technical file */

type FileRow = { label: string; value: string; ev: 'observed' | 'claimed' | 'inferred' | 'unknown' }
type FileSection = { title: string; rows: FileRow[] }

const FILE_SECTIONS: FileSection[] = [
  { title: 'Identity', rows: [
    { label: 'Material', value: 'BC-01 · bacterial cellulose', ev: 'observed' },
    { label: 'Supplier', value: 'Polybion (Mexico)', ev: 'claimed' },
    { label: 'Style', value: 'SS27 Overshirt · OS-114', ev: 'observed' },
  ] },
  { title: 'Digital reference', rows: [
    { label: 'Pattern piece', value: 'Front panel v3', ev: 'observed' },
    { label: 'CAD file', value: 'Linked', ev: 'inferred' },
  ] },
  { title: 'Make constraints', rows: [
    { label: 'Heat limit', value: '60 °C', ev: 'claimed' },
    { label: 'Fusing step runs at', value: '130 °C', ev: 'observed' },
    { label: 'Seam type', value: 'Bonded', ev: 'inferred' },
  ] },
  { title: 'Test results', rows: [
    { label: 'Colorfastness (X12)', value: '4/5 ✓', ev: 'observed' },
    { label: 'Seam strength', value: '142 N ✓', ev: 'observed' },
    { label: 'Pilling (2,000 rubs)', value: 'Grade 3', ev: 'observed' },
    { label: 'Dimensional stability', value: 'Pending · Oct 21', ev: 'unknown' },
  ] },
  { title: 'Certifications', rows: [
    { label: 'OEKO-TEX Std 100', value: 'Claimed, unverified', ev: 'claimed' },
    { label: 'Biodegradability', value: '—', ev: 'unknown' },
  ] },
  { title: 'Supply & scale', rows: [
    { label: '500 units', value: 'Ready', ev: 'observed' },
    { label: '2,000 units', value: '1 gap', ev: 'observed' },
    { label: '10,000 units', value: 'Short 38%', ev: 'observed' },
  ] },
]
const FLAG_AFTER_ROW = 4 // flag appears once "Fusing step runs at" (row index 4 overall) has filled

function evLabel(ev: FileRow['ev']) {
  return ev === 'observed' ? 'Observed' : ev === 'claimed' ? 'Claimed' : ev === 'inferred' ? 'Inferred' : 'Unknown'
}

export function FiloFilePhone() {
  const reduced = useReducedMotion()
  const [wrapRef, inView] = useInView<HTMLDivElement>()
  const active = inView && !reduced
  const t = useLoopClock(8000, active)
  const settled = reduced || !inView
  const g = (ms: number) => settled || t >= ms

  let flat = 0
  return (
    <div ref={wrapRef} style={{ width: '100%', height: '100%' }}>
      <FiloPhone>
        <div className="filo-scr filo-file">
          <StatusBar dark={false} />
          <div className="filo-file__hero">
            <div className="filo-file__swatch" style={{ backgroundImage: `url(${SWATCH_URL})` }} />
            <div className="filo-file__hero-text">
              <p className="filo-file__hero-code">BC-01</p>
              <p className="filo-file__hero-name">Bacterial cellulose sheet</p>
              <p className="filo-file__hero-style">SS27 Overshirt · OS-114</p>
            </div>
          </div>
          <div className="filo-file__scroll">
            {FILE_SECTIONS.map(section => (
              <div key={section.title}>
                <p className="filo-file__section-title">{section.title}</p>
                <div className="filo-file__rows">
                  {section.rows.map(row => {
                    const idx = flat++
                    const shown = g(260 + idx * 190)
                    return (
                      <div className="filo-file__row" key={row.label}>
                        <span className="filo-file__row-label">{row.label}</span>
                        <span className="filo-file__row-value" data-shown={shown || undefined} data-unknown={row.ev === 'unknown' || undefined}>
                          {row.value}
                          <span className="filo-chip" data-ev={row.ev}>{evLabel(row.ev)}</span>
                        </span>
                      </div>
                    )
                  })}
                </div>
                {section.title === 'Make constraints' && (
                  <div className="filo-file__flag" data-shown={g(260 + FLAG_AFTER_ROW * 190 + 420) || undefined}>
                    <IconFlag />
                    <div>
                      <p className="filo-file__flag-title">Heat conflict</p>
                      <p className="filo-file__flag-body">Heat limit 60 °C · your fusing step runs at 130 °C.</p>
                      <p className="filo-file__flag-suggest">Switch to sew-in interlining · Ask factory</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </FiloPhone>
    </div>
  )
}

/* ---------------------------------------------------------------- 3. Bench capture */

const WAVE_HEIGHTS = [4, 9, 15, 10, 18, 7, 13, 20, 9, 16, 6, 11, 17, 8, 14, 10, 5, 12]

export function FiloBenchPhone() {
  const reduced = useReducedMotion()
  const [wrapRef, inView] = useInView<HTMLDivElement>()
  const active = inView && !reduced
  const t = useLoopClock(7600, active)
  const settled = reduced || !inView
  const g = (ms: number) => settled || t >= ms

  const motion = !settled && t < 2400
  const shutter = !settled && t >= 2400 && t < 2850
  const sheetShown = g(2550)
  const transcriptShown = g(3300)
  const filedShown = g(5000)

  return (
    <div ref={wrapRef} style={{ width: '100%', height: '100%' }}>
      <FiloPhone>
        <div className="filo-scr filo-bench">
          <div className="filo-bench__view" data-motion={motion || undefined} style={{ backgroundImage: `url(${SWATCH_URL})` }}>
            <div className="filo-bench__view-tex" style={{ backgroundImage: `url(${SWATCH_URL})` }} />
            <div className="filo-bench__dim" aria-hidden="true" />
            <div className="filo-bench__macro">Macro</div>
            <div className="filo-bench__reticle" aria-hidden="true">
              <span className="filo-bench__corner" data-c="tl" />
              <span className="filo-bench__corner" data-c="tr" />
              <span className="filo-bench__corner" data-c="bl" />
              <span className="filo-bench__corner" data-c="br" />
            </div>
          </div>
          <StatusBar dark time="9:41" />
          <div className="filo-bench__controls">
            <div className="filo-bench__thumb" style={{ backgroundImage: `url(${SWATCH_URL})` }} />
            <div className="filo-bench__shutter-btn" data-flash={shutter || undefined} />
            <span className="filo-bench__mode">Photo</span>
          </div>
          <div className="filo-bench__shutter" data-shown={shutter || undefined} />
          <div className="filo-bench__sheet" data-shown={sheetShown || undefined}>
            <div className="filo-bench__sheet-bar" />
            <div className="filo-bench__voice">
              <div className="filo-bench__mic"><IconMic /></div>
              <div className="filo-bench__wave" aria-hidden="true">
                {WAVE_HEIGHTS.map((h, i) => (
                  <span key={i} style={{ height: `${h}px`, opacity: transcriptShown ? 1 : 0.5 }} />
                ))}
              </div>
            </div>
            <p className="filo-bench__transcript" data-shown={transcriptShown || undefined}>
              “<b>Pilling after 20 rubs</b> — noticeable on the face side, bench check.”
            </p>
            <div className="filo-bench__filed" data-shown={filedShown || undefined}>
              <div className="filo-bench__filed-thumb" style={{ backgroundImage: `url(${SWATCH_URL})` }} />
              <div className="filo-bench__filed-text">
                <p className="filo-bench__filed-label">Filed to Test results › Pilling</p>
                <p className="filo-bench__filed-value">Observed · pilling after 20 rubs</p>
              </div>
            </div>
          </div>
        </div>
      </FiloPhone>
    </div>
  )
}

/* ---------------------------------------------------------------- 4 + 5. Scale ladder */

const TIERS = [
  { units: '500 units', status: 'ready' as const, statusLabel: 'Ready', cap: 100, lead: '6 wks', leadWeeks: 6, price: '€18.40/m', gap: null as string | null, fallback: false,
    suppliers: [{ name: 'Polybion', pct: 100, note: 'confirmed' }] },
  { units: '2,000 units', status: 'gap' as const, statusLabel: '1 gap', cap: 82, lead: '10 wks', leadWeeks: 10, price: '€15.90/m', gap: 'One gap: a second supplier is needed to cover the remaining 18%.', fallback: false,
    suppliers: [{ name: 'Polybion', pct: 82, note: 'confirmed' }, { name: 'Scoby Tex', pct: 18, note: 'gap, unconfirmed' }] },
  { units: '10,000 units', status: 'short' as const, statusLabel: 'Short 38%', cap: 62, lead: '16 wks', leadWeeks: 16, price: '€13.20/m', gap: 'Capacity short 38% at this tier.', fallback: true,
    suppliers: [{ name: 'Polybion', pct: 42, note: 'at capacity' }, { name: 'Scoby Tex', pct: 20, note: 'at capacity' }, { name: 'Modern Synthesis', pct: 0, note: 'declined bulk order' }] },
]

export function FiloLadderPicker() {
  const reduced = useReducedMotion()
  const [wrapRef, inView] = useInView<HTMLDivElement>()
  const { tier } = useTier(inView && !reduced)
  const activeTier = reduced || !inView ? 1 : tier

  return (
    <div ref={wrapRef} className="filo-ui" style={{ width: '100%', height: '100%' }}>
      <div className="filo-ladder-pick">
        <div className="filo-ladder-pick__card">
          <p className="filo-ladder-pick__eyebrow">Scale ladder · BC-01</p>
          <h2 className="filo-ladder-pick__title">Choose a volume tier</h2>
          <div className="filo-ladder-pick__list">
            <div className="filo-ladder-pick__cursor" style={{ top: activeTier * 54 + 23 }} aria-hidden="true" />
            {TIERS.map((tr, i) => (
              <div className="filo-ladder-pick__tier" data-active={activeTier === i || undefined} key={tr.units}>
                <span className="filo-ladder-pick__tier-units">{tr.units}</span>
                <span className="filo-ladder-pick__tier-status" data-s={tr.status}>{tr.statusLabel}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function FiloLadderPhone() {
  const reduced = useReducedMotion()
  const [wrapRef, inView] = useInView<HTMLDivElement>()
  const { tier, phase } = useTier(inView && !reduced)
  const activeTier = reduced || !inView ? 1 : tier
  const p = reduced || !inView ? 0.6 : phase
  const data = TIERS[activeTier]
  const shareOpen = p > 0.68 && p < 0.92

  return (
    <div ref={wrapRef} style={{ width: '100%', height: '100%' }}>
      <FiloPhone>
        <div className="filo-scr filo-ladder">
          <StatusBar />
          <div className="filo-scr__head">
            <p className="filo-scr__eyebrow">Scale ladder · BC-01</p>
            <h1 className="filo-scr__title">SS27 Overshirt</h1>
          </div>
          <div className="filo-ladder__body">
            <div className="filo-ladder__tier-row">
              <span className="filo-ladder__tier-units">{data.units}</span>
              <span className="filo-ladder__tier-status" data-s={data.status}>{data.statusLabel}</span>
            </div>
            <div className="filo-ladder__cap">
              <div className="filo-ladder__cap-label">
                <span>Capacity vs demand</span>
                <span>{data.cap}%</span>
              </div>
              <div className="filo-ladder__cap-bar">
                <div className="filo-ladder__cap-fill" data-short={data.status === 'short' || undefined} style={{ '--w': `${data.cap}%` } as CSSProperties} />
                <div className="filo-ladder__cap-demand" style={{ '--d': '100%' } as CSSProperties} />
              </div>
            </div>
            <div className="filo-ladder__stats">
              <div className="filo-ladder__stat">
                <p className="filo-ladder__stat-label">Lead time</p>
                <p className="filo-ladder__stat-value">{data.lead}</p>
              </div>
              <div className="filo-ladder__stat">
                <p className="filo-ladder__stat-label">Price</p>
                <p className="filo-ladder__stat-value">{data.price}</p>
              </div>
            </div>
            <div className="filo-ladder__suppliers">
              <p className="filo-ladder__suppliers-title">Supplier capacity</p>
              {data.suppliers.map(s => (
                <div className="filo-ladder__supplier-row" key={s.name}>
                  <div className="filo-ladder__supplier-top">
                    <span className="filo-ladder__supplier-name">{s.name}</span>
                    <span className="filo-ladder__supplier-pct">{s.pct}% · {s.note}</span>
                  </div>
                  <div className="filo-ladder__supplier-bar">
                    <div className="filo-ladder__supplier-fill" style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="filo-ladder__timeline">
              <p className="filo-ladder__timeline-title">Timeline to delivery</p>
              <div className="filo-ladder__timeline-track">
                <span className="filo-ladder__timeline-dot" />
                <span className="filo-ladder__timeline-line" />
                <span className="filo-ladder__timeline-dot" />
                <span className="filo-ladder__timeline-line" />
                <span className="filo-ladder__timeline-dot" />
              </div>
              <div className="filo-ladder__timeline-labels">
                <div><b>Order</b><span>Wk 0</span></div>
                <div><b>Delivery</b><span>Wk {data.leadWeeks}</span></div>
                <div><b>Cut date</b><span>Wk {data.leadWeeks + 2}</span></div>
              </div>
            </div>
            {data.gap && (
              <div className="filo-ladder__gap" data-shown="true">
                <b>{data.statusLabel}.</b> {data.gap}
              </div>
            )}
            {data.fallback && (
              <p className="filo-ladder__fallback">Fallback: <b>Piñatex-blend for overflow</b></p>
            )}
            <div className="filo-ladder__share">
              <IconShare />
              <span>Share to line review</span>
            </div>
          </div>
          <div className="filo-ladder__sheet" data-shown={shareOpen || undefined}>
            <div className="filo-ladder__sheet-bar" />
            <p className="filo-ladder__sheet-title">Share to line review</p>
            <div className="filo-ladder__sheet-targets">
              <div className="filo-ladder__sheet-target">
                <div className="filo-ladder__sheet-icon"><IconAirdrop /></div>
                AirDrop
              </div>
              <div className="filo-ladder__sheet-target">
                <div className="filo-ladder__sheet-icon"><IconLine /></div>
                Line review
              </div>
            </div>
          </div>
        </div>
      </FiloPhone>
    </div>
  )
}
