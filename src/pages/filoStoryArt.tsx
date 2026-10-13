import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { EditableText } from '../components/EditableText'
import type { Story } from './caseStudyFlows'
import './filoStoryArt.css'

type StoryCopy = Pick<Story, 'problemLabel' | 'problemTitle' | 'problemBody' | 'opportunityLabel' | 'opportunityTitle' | 'opportunityBody' | 'solutionLabel' | 'solutionTitle' | 'solutionBody' | 'spacing' | 'textWidth'>
export type FiloStorySettings = StoryCopy & {
  animationPreset: string
  loopSeconds: number
  playbackSpeed: number
  toteSpin: number
  parkaSpin: number
  blouseSpin: number
  windbreakerSpin: number
}

const ASSETS = '/work/filo/studio/'
const PHONE_SCENES = ['nfc', 'file', 'listening', 'warning', 'approval'] as const
const PRESETS = ['quiet dissolve', 'material drift', 'exploded assembly']

function MaterialImage({ asset, className = '' }: { asset: string; className?: string }) {
  return <img className={`fs-material-image ${className}`} src={`${ASSETS}${asset}.webp`} alt="" loading="lazy" decoding="async" draggable={false} />
}

/** Full-resolution Futurefabric 3D renders: 36 transparent 768px views in a 6 × 6 sheet. */
function Product({ name, spin, className = '' }: { name: string; spin: number; className?: string }) {
  return <div className={`fs-product ${className}`} style={{ '--fs-spin': spin } as CSSProperties}>
    <div className="fs-turntable" style={{ backgroundImage: `url(/work/filo/sprites-hd/${name}-spritesheet.webp)` }} />
  </div>
}

type Spins = Pick<FiloStorySettings, 'toteSpin' | 'parkaSpin' | 'blouseSpin' | 'windbreakerSpin'>

function MarketGap({ s }: { s: Spins }) {
  return <>
    <div className="fs-gap-material fs-move">
      <MaterialImage asset="cellulose" className="fs-gap-photo" />
      <MaterialImage asset="tag-scan" className="fs-gap-tag" />
    </div>
    <div className="fs-gap-library fs-move"><MaterialImage asset="library" /></div>
    <Product name="zara-pinatex-bag" spin={s.toteSpin} className="fs-gap-bag fs-move" />
    <Product name="northface" spin={s.parkaSpin} className="fs-gap-garment fs-move" />
    <MaterialImage asset="nfc" className="fs-gap-nfc fs-symbol" />
  </>
}

function Opportunity({ s }: { s: Spins }) {
  return <>
    <svg className="fs-thread" viewBox="0 0 800 440" fill="none" aria-hidden="true">
      <path pathLength="1" d="M150 240 C205 365 280 320 325 225 S400 160 455 240 S580 340 665 205" />
    </svg>
    <div className="fs-opportunity-material fs-move"><MaterialImage asset="thread-tag" /></div>
    <div className="fs-opportunity-record fs-move"><img src="/work/filo/story/phone-file.webp" alt="" loading="lazy" decoding="async" /></div>
    <Product name="orange-fiber-x-h-m-conscious-exclusive-collection-2019" spin={s.blouseSpin} className="fs-opportunity-garment fs-move" />
    <MaterialImage asset="nfc" className="fs-opportunity-nfc fs-symbol" />
  </>
}

function Solution({ s }: { s: Spins }) {
  return <>
    <div className="fs-solution-material fs-move"><MaterialImage asset="tag-scan" /></div>
    <Product name="xtep-pla-windbreaker" spin={s.windbreakerSpin} className="fs-solution-garment fs-move" />
    <div className="fs-solution-phone fs-move">
      {PHONE_SCENES.map((scene, index) => <img
        className="fs-phone-frame"
        key={scene}
        src={`/work/filo/story/phone-${scene}.webp`}
        alt=""
        loading="lazy"
        decoding="async"
        style={{ '--phase': index === 0 ? 0 : (index - PHONE_SCENES.length) / PHONE_SCENES.length } as CSSProperties}
      />)}
    </div>
    <MaterialImage asset="warning" className="fs-solution-warning fs-symbol" />
  </>
}

/** Like Momo: play on entry, stop offscreen, restart from the first frame on return. */
function StoryFilm({ kind, label, children }: { kind: string; label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    let visible = false
    const sync = () => {
      el.dataset.live = String(visible && !reduced.matches)
      el.dataset.paused = String(document.hidden)
    }
    const observer = new IntersectionObserver(([entry]) => {
      // Observe the visual, not the taller article, so mobile can always trigger playback.
      visible = entry.isIntersecting
      sync()
    }, { threshold: 0 })
    observer.observe(el)
    reduced.addEventListener('change', sync)
    document.addEventListener('visibilitychange', sync)
    sync()
    return () => {
      observer.disconnect()
      reduced.removeEventListener('change', sync)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [])
  return <div className={`fs-film fs-film--${kind}`} ref={ref} role="img" aria-label={label}>
    <div className="fs-stage" aria-hidden="true">{children}</div>
  </div>
}

export function FiloStory({ s, edit }: { s: FiloStorySettings; edit: (path: string) => (next: string) => void }) {
  const requested = new URLSearchParams(window.location.search).get('filoAnimation')?.replaceAll('-', ' ')
  const preset = requested && PRESETS.includes(requested) ? requested : s.animationPreset
  const rows = [
    ['problem', s.problemLabel, s.problemTitle, s.problemBody,
      'Looped material study: a swatch becomes an NFC-tagged sample while the surrounding material library, a Piñatex tote and a Moon Parka remain disconnected.', <MarketGap key="gap" s={s} />],
    ['opportunity', s.opportunityLabel, s.opportunityTitle, s.opportunityBody,
      'A lime thread connects the physical Filo tag, its Technical File and an illustrative Orange Fiber garment.', <Opportunity key="opportunity" s={s} />],
    ['solution', s.solutionLabel, s.solutionTitle, s.solutionBody,
      'Automatic Filo concept film: tap the tag, open the Technical File, capture a bench observation, flag the supplier-claimed 60 degree limit against 130 degree fusing, and prepare a sample plan for human approval. No real actions are performed.', <Solution key="solution" s={s} />],
  ] as const
  return <section
    id="filo-story"
    data-section="story"
    className="case__section filo-story"
    data-preset={preset}
    aria-label="Market gap, opportunity and solution"
    style={{
      '--section-pad-top': `${s.spacing.top}px`,
      '--section-pad-bottom': `${s.spacing.bottom}px`,
      '--fs-chapter-gap': `${s.spacing.contentGap}px`,
      '--fs-copy-width': `${s.textWidth}px`,
      '--fs-duration': `${s.loopSeconds / s.playbackSpeed}s`,
    } as CSSProperties}
  >
    {rows.map(([key, label, title, body, description, visual]) => <article className="fs-chapter" data-chapter={key} key={key}>
      <div className="fs-copy">
        <p className="eyebrow">{label}</p>
        <EditableText as="h2" value={title} label={`${label} title`} onChange={edit(`story.${key}Title`)} />
        <EditableText as="p" value={body} label={`${label} body`} onChange={edit(`story.${key}Body`)} />
      </div>
      <StoryFilm kind={key} label={description}>{visual}</StoryFilm>
    </article>)}
  </section>
}
