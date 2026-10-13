import { useEffect, useRef, useState } from 'react'
import { FiloMark, FiloPhone, StatusBar } from './FiloPhone'
import './filoWelcome.css'

const SWATCH_SRC = '/work/filo/materials/bc01-swatch.webp'

/**
 * Hero device: Filo's launch screen. The swatch tag is the interface — tap a sample's paper tag
 * with the phone to open its Technical File. Non-interactive; loops subtly while on screen.
 */
export function FiloWelcome({ active }: { active: boolean }) {
  const host = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const el = host.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.12 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const live = active && visible && !reduced

  return (
    <div
      className="filo-welcome"
      ref={host}
      role="img"
      aria-label="Filo's launch screen: a bacterial-cellulose swatch with its paper tag, ready to open with a tap"
    >
      <FiloPhone>
        <StatusBar time="9:41" />
        <div className="filo-welcome__stage" data-visible={visible || undefined}>
          <div className="filo-welcome__brand">
            <FiloMark size={20} />
            <span>filo</span>
          </div>

          <div className="filo-welcome__swatch">
            <img src={SWATCH_SRC} alt="" draggable={false} />
            <span className="filo-welcome__swatch-tint" aria-hidden="true" />
          </div>

          <svg className="filo-welcome__tagrig" viewBox="0 0 393 852" aria-hidden="true" data-live={live || undefined}>
            <defs>
              <clipPath id="filo-welcome-chip">
                <rect x="258" y="222" width="88" height="40" rx="8" />
              </clipPath>
            </defs>
            <path className="filo-welcome__thread" d="M300,84 C298,98 302,112 300,128" />
            <g className="filo-welcome__tagbody">
              <rect className="filo-welcome__tagrect" x="238" y="132" width="128" height="160" rx="18" />
              <circle className="filo-welcome__taghole" cx="302" cy="128" r="6.5" />
              <text className="filo-welcome__tagid" x="302" y="184">BC-01</text>
              <text className="filo-welcome__tagsupplier" x="302" y="205">Polybion</text>
              <image href={SWATCH_SRC} x="258" y="222" width="88" height="40" clipPath="url(#filo-welcome-chip)" preserveAspectRatio="xMidYMid slice" />
              <rect className="filo-welcome__chipline" x="258" y="222" width="88" height="40" rx="8" />
              <path className="filo-welcome__tagwave" d="M288,280 a8,8 0 0 1 16,0" />
              <path className="filo-welcome__tagwave" d="M292,280 a4,4 0 0 1 8,0" />
            </g>
          </svg>

          <p className="filo-welcome__caption">SS27 Overshirt · OS-114</p>

          <div className="filo-welcome__nfc" data-live={live || undefined}>
            <span className="filo-welcome__ring" />
            <span className="filo-welcome__ring" />
            <span className="filo-welcome__ring" />
            <span className="filo-welcome__nfc-core">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 15a7 7 0 0 1 10 0M4 12a11 11 0 0 1 16 0" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="12" cy="18" r="1.6" fill="#fff" />
              </svg>
            </span>
          </div>
          <p className="filo-welcome__nfc-label">
            Hold near tag
            <span>to open the Technical File</span>
          </p>

          <button className="filo-welcome__primary" type="button" tabIndex={-1}>
            Open Technical File
          </button>
          <p className="filo-welcome__footer">Synced · SS27 Overshirt · OS-114</p>
        </div>
      </FiloPhone>
    </div>
  )
}
