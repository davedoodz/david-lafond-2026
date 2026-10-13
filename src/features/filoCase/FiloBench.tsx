import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { FiloMark, FiloPhone, StatusBar } from './FiloPhone'
import './filoBench.css'

/**
 * Persona portrait replacement: a top-down sample-room bench still life instead of an
 * illustrated portrait (no image-generation credits available). Same box as Momo's
 * `.persona__photo` (1374×1145, rounded) — see `casePersona.tsx` / `.persona__photo` CSS.
 * Subtle life (steam, a notification landing on the phone) only while on screen and only
 * without `prefers-reduced-motion`.
 */
export function FiloBench() {
  const root = useRef<HTMLDivElement>(null)
  const [live, setLive] = useState(false)
  useEffect(() => {
    const el = root.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setLive(entry.isIntersecting), { threshold: 0.25 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={root}
      className="persona__photo filo-persona"
      data-live={live || undefined}
      role="img"
      aria-label="Overhead view of a sample-room bench: a bacterial-cellulose swatch tagged BC-01 beside a tech pack for the SS27 overshirt, tailor's chalk, a tape measure, pins, a coffee cup and an iPhone showing Filo"
    >
      <div className="filo-persona__light" aria-hidden="true" />
      <div className="filo-persona__grain" aria-hidden="true" />

      {/* Tech pack sheet, underneath everything else. */}
      <div className="filo-persona__item filo-persona__techpack" style={{ '--x': '3%', '--y': '4%', '--w': '46%', '--r': '-2deg' } as CSSProperties}>
        <div className="filo-persona__techpack-head">
          <span>SS27 · OS-114</span>
          <span>OVERSHIRT</span>
        </div>
        <svg className="filo-persona__sketch" viewBox="0 0 220 240" aria-hidden="true">
          <g fill="none" stroke="#9a948b" strokeWidth={1.3} strokeLinejoin="round" strokeLinecap="round">
            <path d="M70 26 Q110 10 150 26 L168 50 L150 64 L146 212 Q110 222 74 212 L70 64 L52 50 Z" />
            <path d="M70 26 L58 70 M150 26 L162 70" />
            <path d="M92 20 Q110 32 128 20" />
            <path d="M80 110 h26 v30 h-26 Z" />
            <path d="M114 110 h26 v30 h-26 Z" />
          </g>
          <g stroke="#b8674a" strokeWidth={1} strokeDasharray="3 3">
            <path d="M52 50 H26" />
            <path d="M168 50 H194" />
            <path d="M70 70 V208" />
          </g>
          <g fill="#b8674a" fontSize={8} letterSpacing="0.01em">
            <text x={14} y="48" transform="rotate(-90 14 48)">CHEST 128 CM</text>
            <text x={199} y="48">CB 71 CM</text>
            <text x={44} y="140" transform="rotate(-90 44 140)">SLEEVE 64 CM</text>
          </g>
        </svg>
      </div>

      {/* Tape measure, coiled, lower-left. */}
      <div className="filo-persona__item filo-persona__tape" style={{ '--x': '2%', '--y': '70%', '--w': '19%', '--r': '-9deg' } as CSSProperties}>
        <svg viewBox="0 0 160 80" aria-hidden="true">
          <ellipse cx={34} cy={40} rx={30} ry={30} fill="#e7c349" stroke="#c7a62f" strokeWidth={1.5} />
          <ellipse cx={34} cy={40} rx={11} ry={11} fill="#f4e7b8" stroke="#c7a62f" strokeWidth={1} />
          <circle cx={34} cy={40} r={3.4} fill="#746224" />
          <path d="M60 46 C92 52 120 50 150 36" fill="none" stroke="#f1e3ad" strokeWidth={9} strokeLinecap="round" />
          <path d="M60 46 C92 52 120 50 150 36" fill="none" stroke="#c7a62f" strokeWidth={0.75} strokeDasharray="1 5.2" />
        </svg>
      </div>

      {/* Tailor's chalk, clear of the swatches. */}
      <div className="filo-persona__item filo-persona__chalk" style={{ '--x': '8%', '--y': '58%', '--w': '8%', '--r': '16deg' } as CSSProperties}>
        <svg viewBox="0 0 70 34" aria-hidden="true">
          <path d="M4 20 L10 8 H56 L66 14 L58 26 H10 Z" fill="#e9e4d8" stroke="#c9c2b2" strokeWidth={1} />
          <path d="M10 8 L4 20 L10 26" fill="none" stroke="#c9c2b2" strokeWidth={0.8} />
        </svg>
      </div>

      {/* Second fabric swatch, overlapping the hero swatch's lower-right corner. */}
      <div className="filo-persona__item filo-persona__swatch filo-persona__swatch--b" style={{ '--x': '58%', '--y': '46%', '--w': '24%', '--r': '-7deg' } as CSSProperties}>
        <div className="filo-persona__swatch-fill" style={{ backgroundImage: "url('/work/filo/bench/fabric036.webp')" }} />
      </div>

      {/* Primary biocell swatch, the hero: larger, with its paper tag on a thread kept inside the frame. */}
      <div className="filo-persona__item filo-persona__swatch filo-persona__swatch--a" style={{ '--x': '24%', '--y': '11%', '--w': '50%', '--r': '3deg' } as CSSProperties}>
        <div className="filo-persona__swatch-fill" style={{ backgroundImage: "url('/work/filo/bench/biocell.webp')" }} />
        <svg className="filo-persona__thread" viewBox="0 0 120 60" aria-hidden="true">
          <path d="M18 24 C36 18 46 28 40 40 C34 50 50 48 58 38" fill="none" stroke="#a6a09c" strokeWidth={1.1} />
        </svg>
        <div className="filo-persona__tag">
          <FiloMark size={10} />
          <span>BC-01</span>
          <em>Polybion</em>
        </div>
      </div>

      {/* Pins, stuck into the hero swatch's edge — above the swatches so they read on top. */}
      <svg className="filo-persona__item filo-persona__pins" style={{ '--x': '40%', '--y': '20%', '--w': '9%', '--r': '0deg' } as CSSProperties} viewBox="0 0 90 40" aria-hidden="true">
        {[{ x: 10, y: 22, r: -40 }, { x: 28, y: 10, r: -8 }, { x: 46, y: 26, r: 24 }, { x: 64, y: 8, r: 52 }].map((p, i) => (
          <g key={i} transform={`translate(${p.x} ${p.y}) rotate(${p.r})`}>
            <line x1={0} y1={0} x2={22} y2={0} stroke="#9a948b" strokeWidth={1} />
            <circle cx={0} cy={0} r={3.4} fill={i % 2 ? '#4f6b4a' : '#b8674a'} />
          </g>
        ))}
      </svg>

      {/* Coffee cup, warm steam. */}
      <div className="filo-persona__item filo-persona__cup" style={{ '--x': '3%', '--y': '83%', '--w': '13%', '--r': '0deg' } as CSSProperties}>
        <svg viewBox="0 0 90 70" aria-hidden="true">
          <ellipse cx={45} cy={56} rx={36} ry={10} fill="#efe7d8" stroke="#d8cdb6" strokeWidth={1} />
          <path d="M20 30 Q20 54 45 54 Q70 54 70 30 Z" fill="#fff" stroke="#d8cdb6" strokeWidth={1.3} />
          <ellipse cx={45} cy={30} rx={25} ry={8} fill="#6b4a33" />
          <path d="M70 32 q14 -2 13 10 q-1 11 -14 9" fill="none" stroke="#d8cdb6" strokeWidth={2.2} />
        </svg>
        <svg className="filo-persona__steam" viewBox="0 0 40 60" aria-hidden="true">
          <path className="filo-persona__steam-path" d="M12 56 C4 44 20 38 12 26 C6 16 18 10 14 2" fill="none" stroke="#c9c2b2" strokeWidth={2} strokeLinecap="round" />
          <path className="filo-persona__steam-path filo-persona__steam-path--b" d="M26 56 C18 46 32 40 24 28 C18 18 28 12 24 4" fill="none" stroke="#c9c2b2" strokeWidth={1.6} strokeLinecap="round" />
        </svg>
      </div>

      {/* iPhone lying face-up on the bench, large enough to read, showing a Filo notification arriving. */}
      <div className="filo-persona__item filo-persona__phone" style={{ '--x': '63%', '--y': '28%', '--w': '29%', '--r': '-9deg' } as CSSProperties}>
        <FiloPhone>
          <StatusBar time="9:41" />
          <div className="filo-persona__screen">
            <h1>Good morning</h1>
            <p>Tuesday, 7:02 AM</p>
            <div className="filo-persona__notif">
              <FiloMark size={16} />
              <div>
                <b>Filo</b>
                <span>Test results in · BC-01 pilling grade 3</span>
              </div>
              <i className="filo-persona__notif-dot" />
            </div>
          </div>
        </FiloPhone>
      </div>
    </div>
  )
}
