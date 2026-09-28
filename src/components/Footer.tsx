import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTuning } from '../tuning/useTuning'
import { ContactLinks } from './ContactLinks'
import { DitherBand } from './DitherBand'
import './Footer.css'

const CONFIG = {
  clockTimeZone: {
    type: 'select' as const,
    options: [
      { value: 'America/New_York', label: 'Boston / Montréal' },
      { value: 'Asia/Ho_Chi_Minh', label: 'Saigon' },
    ],
    default: 'America/New_York',
  },
  desktopHeight: [240, 120, 480, 1] as [number, number, number, number],
  mobileHeight: [200, 100, 420, 1] as [number, number, number, number],
}

/** Each click flips the name to the next emoji, then back to the name after the fifth. */
const PLACES = [
  { name: 'Boston', emoji: ['🦞', '🏛️', '⚾', '🍂', '🍩'] },
  { name: 'Montréal', emoji: ['🫎', '🍁', '🏒', '❄️', '🇨🇦'] },
  { name: 'Saigon', emoji: ['🍜', '🏮', '☕', '🥖', '🌶️'] },
]

function Place({ name, emoji }: (typeof PLACES)[number]) {
  const [step, setStep] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const label = step === 0 ? name : emoji[step - 1]
  return (
    <button
      type="button"
      className="footer__place"
      aria-label={step === 0 ? name : `${name}: ${label}`}
      onClick={() => {
        setFlipped(true)
        setStep((s) => (s + 1) % (emoji.length + 1))
      }}
    >
      {/* The name always holds the width, so the button never shrinks from under the pointer. */}
      <span className="footer__place-size" aria-hidden="true">
        {name}
      </span>
      {/* Keyed so each change replays the flip. */}
      <span key={step} className={`footer__place-face${flipped ? ' is-flip' : ''}${step ? ' is-emoji' : ''}`}>
        {label}
      </span>
    </button>
  )
}

/** Ticks once a second by writing text directly, so the footer never re-renders. */
function Clock({ timeZone }: { timeZone: string }) {
  const ref = useRef<HTMLTimeElement>(null)
  useEffect(() => {
    const format = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    let timer = 0
    const tick = () => {
      const now = new Date()
      if (ref.current) {
        ref.current.textContent = format.format(now)
        ref.current.dateTime = now.toISOString()
      }
      timer = window.setTimeout(tick, 1000 - now.getMilliseconds())
    }
    tick()
    return () => window.clearTimeout(timer)
  }, [timeZone])
  return <time ref={ref} className="footer__clock" />
}

export function Footer() {
  const t = useTuning('Footer', CONFIG)
  return (
    <footer
      className="footer"
      data-surface="dark"
      style={{ '--footer-h-d': `${t.desktopHeight}px`, '--footer-h-m': `${t.mobileHeight}px` } as CSSProperties}
    >
      <DitherBand position="footer" />
      <div className="footer__inner">
        <ContactLinks />
        <ul className="footer__places">
          {PLACES.map((place) => (
            <li key={place.name}>
              <Place {...place} />
            </li>
          ))}
          <li>
            <Clock timeZone={t.clockTimeZone} />
          </li>
        </ul>
      </div>
    </footer>
  )
}
