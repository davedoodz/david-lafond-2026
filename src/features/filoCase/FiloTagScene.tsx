import type { ReactNode } from 'react'
import { StatusBar } from './FiloPhone'
import type { DeviceScene, DeviceSceneStep } from '../../pages/DeviceInsights'
import './filoTagScene.css'

/* Filo's "Cross-device" scene for DeviceInsights: the swatch tag is the interface. A physical
   bacterial-cellulose sample sits on the bench with a paper tag (NFC) tied on a thread; holding
   the iPhone near it opens that material's Technical File. Fills DeviceInsights' generic
   left/link/phone scene slots — see DeviceInsights.tsx's DeviceScene contract. */

const SWATCH_URL = '/work/filo/bench/biocell.webp'
const THREAD_D = 'M6 62 C40 50 60 76 92 62 C124 48 148 76 184 60'

const STEPS: DeviceSceneStep[] = [
  { id: 'sense', label: 'Hold near the tag', ms: 2600 },
  { id: 'read', label: 'Reading the tag', ms: 2000 },
  { id: 'file', label: 'Technical File opens', ms: 4200 },
]

/* Pinked (zigzag) edge like the sample room's shears — generated once, not hand-typed. */
function pinkedClip(teeth = 11, depth = 2.4): string {
  const pts: string[] = []
  const edge = (from: number, to: number, axis: 'x' | 'y', fixed: number, flip: boolean) => {
    for (let i = 0; i <= teeth; i++) {
      const t = from + ((to - from) * i) / teeth
      const offset = i % 2 === 0 ? 0 : flip ? -depth : depth
      pts.push(axis === 'x' ? `${t.toFixed(1)}% ${(fixed + offset).toFixed(1)}%` : `${(fixed + offset).toFixed(1)}% ${t.toFixed(1)}%`)
    }
  }
  edge(0, 100, 'x', 0, false)
  edge(0, 100, 'y', 100, false)
  edge(100, 0, 'x', 100, true)
  edge(100, 0, 'y', 0, true)
  return `polygon(${pts.join(', ')})`
}
const SWATCH_CLIP = pinkedClip()

function NfcGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="6.5" cy="12" r="1.7" fill="currentColor" />
      <path d="M10.6 7.1a6.9 6.9 0 0 1 0 9.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14.6 3.4a12.2 12.2 0 0 1 0 17.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity=".65" />
    </svg>
  )
}
function CheckGlyph({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12.6 9.4 17 19 6.6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function AlertGlyph({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4.2 2.6 20h18.8L12 4.2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 10v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="17.3" r="1" fill="currentColor" />
    </svg>
  )
}

/* ---------- left: the sample on the bench ---------- */

function benchLeft(id: string): ReactNode {
  return (
    <div className="ftg-bench" data-step={id}>
      <div className="ftg-swatch" style={{ clipPath: SWATCH_CLIP, WebkitClipPath: SWATCH_CLIP, backgroundImage: `url(${SWATCH_URL})` }} />
      <svg className="ftg-thread" viewBox="0 0 90 56" aria-hidden="true">
        <path d="M24 8 C42 2 52 14 44 26 C36 38 54 34 60 22" fill="none" />
      </svg>
      <div className="ftg-tag">
        <span className="ftg-tag__hole" aria-hidden="true" />
        <span className="ftg-tag__code">BC-01 · Polybion</span>
        <span className="ftg-tag__nfc" data-active={id === 'sense' || undefined}><NfcGlyph size={12} /></span>
      </div>
    </div>
  )
}

/* ---------- link: NFC field / thread between tag and phone ---------- */

function sceneLink(id: string): ReactNode {
  return (
    <svg className="ftg-link" data-state={id} viewBox="0 0 190 120" aria-hidden="true">
      <path className="ftg-link__base" pathLength={100} d={THREAD_D} />
      <path className="ftg-link__live" pathLength={100} d={THREAD_D} />
      <g className="ftg-link__nfc" transform="translate(16 60)">
        <path d="M0 -14 A14 14 0 0 1 0 14" />
        <path d="M0 -25 A25 25 0 0 1 0 25" />
        <path d="M0 -36 A36 36 0 0 1 0 36" />
      </g>
    </svg>
  )
}

/* ---------- phone: NFC sense sheet → read progress → Technical File summary ---------- */

function AppPeek() {
  return (
    <div className="ftg-peek" aria-hidden="true">
      <StatusBar time="9:41" />
      <div className="ftg-peek__title">Filo</div>
      <div className="ftg-peek__card" />
      <div className="ftg-peek__card ftg-peek__card--sm" />
    </div>
  )
}

function SenseScreen() {
  return (
    <div className="ftg-scr">
      <AppPeek />
      <div className="ftg-dim" />
      <div className="ftg-sheet">
        <div className="ftg-sheet__grabber" />
        <div className="ftg-sheet__icon" data-active="true"><NfcGlyph size={28} /></div>
        <p className="ftg-sheet__title">Ready to Scan</p>
        <p className="ftg-sheet__sub">Hold near tag</p>
        <div className="ftg-sheet__cancel">Cancel</div>
      </div>
    </div>
  )
}

function ReadScreen() {
  return (
    <div className="ftg-scr">
      <AppPeek />
      <div className="ftg-dim" />
      <div className="ftg-sheet">
        <div className="ftg-sheet__grabber" />
        <div className="ftg-sheet__icon" data-state="done"><CheckGlyph size={26} /></div>
        <p className="ftg-sheet__title">Reading tag…</p>
        <p className="ftg-sheet__sub">BC-01 · Polybion</p>
        <div className="ftg-thread-track"><div className="ftg-thread-track__fill" /></div>
      </div>
    </div>
  )
}

function FileScreen() {
  return (
    <div className="ftg-scr ftg-scr--file">
      <StatusBar time="9:41" />
      <div className="ftg-file__head">
        <span className="ftg-file__eyebrow">BC-01 · Polybion</span>
        <h3 className="ftg-file__title">SS27 Overshirt · OS-114</h3>
      </div>
      <div className="ftg-file__stats">
        <div className="ftg-file__stat"><span className="ftg-file__stat-n">14</span><span className="ftg-file__stat-l">Known</span></div>
        <div className="ftg-file__stat"><span className="ftg-file__stat-n">2</span><span className="ftg-file__stat-l">Missing</span></div>
        <div className="ftg-file__stat" data-warn><span className="ftg-file__stat-n">1</span><span className="ftg-file__stat-l">Watch-for</span></div>
      </div>
      <div className="ftg-flag">
        <span className="ftg-flag__icon"><AlertGlyph /></span>
        <div className="ftg-flag__body">
          <p className="ftg-flag__title">Heat limit 60 °C</p>
          <p className="ftg-flag__text">Your fusing step runs at 130 °C.</p>
          <div className="ftg-flag__actions">
            <span className="ftg-flag__action ftg-flag__action--primary">Switch to sew-in interlining</span>
            <span className="ftg-flag__action">Ask factory</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function phoneScreen(id: string): ReactNode {
  return (
    <div className="ftg-canvas">
      {id === 'sense' && <SenseScreen />}
      {id === 'read' && <ReadScreen />}
      {id === 'file' && <FileScreen />}
    </div>
  )
}

export const FILO_SCENE: DeviceScene = {
  steps: STEPS,
  left: benchLeft,
  phone: phoneScreen,
  link: sceneLink,
  ariaLabel: 'A bacterial-cellulose swatch tagged BC-01 and Polybion sits on the bench. The iPhone is held near its NFC tag, reads the tag, and opens the Technical File — flagging that the fusing step runs hotter than the material\u2019s 60 degree heat limit.',
}
