import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { PlaybackToggle, RestartButton } from '../playback/VideoPlayback'
import { useTuningController } from '../../tuning/useTuning'
import { EditableText } from '../../components/EditableText'
import type { SectionSpacing, TextReveal } from '../../pages/caseStudyContent'
import './filoSourceSteps.css'

/**
 * Filo "source" steps: four case sections, create → share → receive → tap. Steps 1 and 2 are the
 * portal as looping prototypes; step 3 pairs the designer's phone (a looping prototype: the email, then
 * the record in Safari) with the sample box (cut-outs of David's photos, public/work/filo/steps). Step 4
 * is a looping scene: a phone comes over the bacterial cellulose swatch in a dealt deck, reads its tag
 * and opens the record in an App Clip.
 */

type FlowCommand = 'play' | 'pause' | 'restart'
type FlowState = { visible: boolean; userPaused: boolean }
const tellFlow = (frame: HTMLIFrameElement | null, command: FlowCommand) =>
  frame?.contentWindow?.postMessage({ filoAppFlow: command }, window.location.origin)
/** Playback rate of a prototype: player.js runs its clock and every animation at `rate` (1 = as authored). */
const tellSpeed = (frame: HTMLIFrameElement | null, rate: number) =>
  frame?.contentWindow?.postMessage({ filoAppFlow: 'speed', rate }, window.location.origin)
/** Step 3's phone prototype speed (Filo source steps › inbox › speed); the portal flows play at 1. */
const InboxSpeed = createContext(1)
/** Plays while in view, unless the reader paused it. */
const syncFlow = (frame: HTMLIFrameElement | null, state: FlowState) =>
  tellFlow(frame, state.visible && !state.userPaused ? 'play' : 'pause')

/**
 * The looping prototypes: the innovator's portal in steps 1 and 2 (adding a material, then sharing and
 * tagging it), the designer's phone in step 3 and the tap scene in step 4. Each runs in its own document
 * (public/work/filo/*.html) so the app's generic class names (.card, .btn, .nav) never meet the page's.
 * Playback matches the Momo prototype: each plays while in view, clicking it pauses or plays, the
 * top-right button replays it, and once fully off screen it rewinds (clearing a pause) so the next
 * visit starts on its first screen.
 */
const APP_FLOWS = [
  { src: '/work/filo/filo-app-flow.html', title: 'Filo portal: a cursor adds Bacterial Cellulose, from the materials library through document upload and extraction to review and publish.' },
  { src: '/work/filo/filo-app-share.html', title: 'Filo portal: the published Bacterial Cellulose record is shared as a link, written to an NFC tag for its physical sample, and sent by email.' },
]
const PHONE_FLOW = { src: '/work/filo/filo-phone-receive.html', title: 'A designer’s phone: the Filo email lands in Mail, and its link opens the Bacterial Cellulose record in Safari, with its documents, open checks and photos.' }
const TAP_FLOW = { src: '/work/filo/filo-phone-tap.html', title: 'Six tagged swatches are dealt out; a phone comes over the bacterial cellulose one, its Dynamic Island reads the tag, and Open shows the record in an App Clip: overview, documents, photos, samples, then BC-001’s Technical File.' }
/** window: the portal in its window chrome. phone: step 3's phone on a clear ground. scene: step 4's wide scene on a clear ground. */
type FlowVariant = 'window' | 'phone' | 'scene'
function AppFlow({ src, title, variant = 'window' }: { src: string; title: string; variant?: FlowVariant }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const live = useRef<FlowState>({ visible: false, userPaused: false })
  const [toggleKey, setToggleKey] = useState(0)
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const inboxSpeed = useContext(InboxSpeed)
  const speed = variant === 'phone' ? inboxSpeed : 1
  const speedRef = useRef(speed)

  // Sent on every change; a document still loading gets it with its state on 'ready'.
  useEffect(() => {
    speedRef.current = speed
    tellSpeed(frameRef.current, speed)
  }, [speed])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    // The prototype says it's ready once its type has loaded; anything sent before that is dropped.
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow || event.data?.filoAppFlow !== 'ready') return
      tellSpeed(frameRef.current, speedRef.current)
      syncFlow(frameRef.current, live.current)
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio >= 0.2) {
        live.current.visible = true
        syncFlow(frameRef.current, live.current)
      } else if (!entry.isIntersecting) {
        live.current = { visible: false, userPaused: false }
        setToggleKey((n) => n + 1)
        tellFlow(frameRef.current, 'restart')
      }
    }, { threshold: [0, 0.2] })
    window.addEventListener('message', onMessage)
    observer.observe(host)
    return () => {
      observer.disconnect()
      window.removeEventListener('message', onMessage)
    }
  }, [])

  const replay = () => {
    live.current.userPaused = false
    setToggleKey((n) => n + 1)
    tellFlow(frameRef.current, 'restart')
    syncFlow(frameRef.current, live.current)
  }
  return <div ref={hostRef} className={variant === 'window' ? 'fss-app' : `fss-app fss-app--${variant}`}>
    <iframe
      ref={frameRef}
      className="fss-app__frame"
      src={src}
      title={title}
      loading="lazy"
      tabIndex={-1}
    />
    {!reduced && <>
      <PlaybackToggle
        key={toggleKey}
        host={hostRef}
        reducedMotion={reduced}
        onUserToggle={(paused) => {
          live.current.userPaused = paused
          syncFlow(frameRef.current, live.current)
        }}
      />
      <RestartButton onRestart={replay} label="Replay prototype" />
    </>}
  </div>
}

/** Step 3 (right of the phone): the shipped box arrives closed, opens on the wrapped sample and welcome card, then unwraps
    to the sample and its Filo tag, on a loop. The photos are cut out on one 1100 × 696 frame (the open
    ones at 1.5×), each registered to the same tray, so only the lid and contents change. The frame is
    wider than the box to fit the unwrapped photo's card and tissue. */
const BOX_FRAME = { w: 1100, h: 696, boxW: 720 }
function SampleBox() {
  return <div className="fss-box" role="img" aria-label="A kraft Filo box arrives closed, opens on a tissue-wrapped sample with a welcome card, then unwraps to the material sample wearing its Filo tag.">
    <img className="fss-box__frame" src="/work/filo/steps/sample-box-closed.webp" width={BOX_FRAME.w} height={BOX_FRAME.h} alt="" loading="lazy" decoding="async" />
    <img className="fss-box__frame fss-box__frame--open" src="/work/filo/steps/sample-box-open.webp" width={BOX_FRAME.w} height={BOX_FRAME.h} alt="" loading="lazy" decoding="async" />
    <img className="fss-box__frame fss-box__frame--unwrapped" src="/work/filo/steps/sample-box-unwrapped.webp" width={BOX_FRAME.w} height={BOX_FRAME.h} alt="" loading="lazy" decoding="async" />
  </div>
}

/** The four steps, in order, each its own section. Each has a one-word stage after its number. */
const STEPS: { stage: string; visual: ReactNode }[] = [
  { stage: 'Create', visual: <AppFlow {...APP_FLOWS[0]} /> },
  { stage: 'Share', visual: <AppFlow {...APP_FLOWS[1]} /> },
  { stage: 'Receive', visual: <div className="fss-receive"><AppFlow {...PHONE_FLOW} variant="phone" /><SampleBox /></div> },
  { stage: 'Tap', visual: <AppFlow {...TAP_FLOW} variant="scene" /> },
]

type Tuple = [number, number, number, number]
const CONFIG = {
  /** Step titles; edit them on the page in dev (each saves to tuning.json). */
  titles: {
    step1: { type: 'text' as const, default: 'Material innovator creates the material record.' },
    step2: { type: 'text' as const, default: 'The designer receives the record before the sample.' },
    step3: { type: 'text' as const, default: 'The physical sample arrives with its Filo tag.' },
    step4: { type: 'text' as const, default: 'Tap the sample to pick up where you left off.' },
  },
  /** The line under each title; editable on the page in dev, like the titles. */
  bodies: {
    step1: { type: 'text' as const, default: 'Specs, reports, certifications and photos become the starting Technical File.' },
    step2: { type: 'text' as const, default: 'A shared Filo link lets them review the material, supplier data and what still needs verification.' },
    step3: { type: 'text' as const, default: 'The same material URL is encoded in the tag and travels with the swatch.' },
    step4: { type: 'text' as const, default: 'At the bench, the designer can instantly identify the exact swatch and reopen its Technical File.' },
  },
  /** Step 3's box loop, right of the phone. x / y move it from that spot. */
  box: {
    /** Size of the box (1 = the box 320px wide; never wider than the column). */
    scale: [1, 0.5, 2, 0.01] as Tuple,
    /** Playback speed of the closed → open → unwrapped loop (1 = one cycle every 9s, 2 = twice as fast). */
    speed: [1, 0.25, 3, 0.05] as Tuple,
    /** Move from the centred spot (px): positive x goes right, positive y goes down. */
    x: [0, -200, 200, 1] as Tuple,
    y: [0, -200, 200, 1] as Tuple,
  },
  /** Step 3's phone prototype (the email and the record in Safari), left of the box. */
  inbox: {
    /** Size of the phone (1 = 300px wide). */
    scale: [1, 0.6, 1.4, 0.01] as Tuple,
    /** Move from its spot (px): positive x goes right, positive y goes down. */
    x: [0, -200, 200, 1] as Tuple,
    y: [0, -200, 200, 1] as Tuple,
    /** Space between the phone and the box (px); the box's frame already adds room around the box. */
    gap: [24, 0, 240, 1] as Tuple,
    /** Playback speed of the phone prototype (1 = as authored, 2 = twice as fast); its loop's every wait and animation scale together. */
    speed: [1, 0.25, 3, 0.05] as Tuple,
  },
}

/** The source section's dials (FILO_CONFIG.source) that each step section shares. */
type SectionLook = { align: 'left' | 'center'; spacing: SectionSpacing; textReveal?: TextReveal }

export function FiloSourceSteps({ section }: { section: SectionLook }) {
  const { values: dials, setValue } = useTuningController('Filo source steps', CONFIG)
  const refs = useRef<(HTMLElement | null)[]>([])
  // The box's CSS loop runs only while its step is on screen. The prototypes watch themselves (AppFlow).
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      for (const { target, isIntersecting } of entries) {
        const step = target as HTMLElement
        if (isIntersecting) step.dataset.playing = ''
        else delete step.dataset.playing
      }
    }, { threshold: 0.2 })
    for (const step of refs.current) if (step) observer.observe(step)
    return () => observer.disconnect()
  }, [])
  const style = {
    '--section-pad-top': `${section.spacing.top}px`,
    '--section-pad-bottom': `${section.spacing.bottom}px`,
    '--section-content-gap': `${section.spacing.contentGap}px`,
    ...(section.textReveal ? {
      '--text-reveal-duration': `${section.textReveal.duration}s`,
      '--text-reveal-stagger': `${section.textReveal.stagger}s`,
    } : {}),
    '--fss-box-cycle': `${9 / dials.box.speed}s`,
    // The frame is wider than the box, so size it to keep the box itself at 320px; box › scale grows it from there.
    '--fss-box-w': `${320 * BOX_FRAME.w / BOX_FRAME.boxW}px`,
    '--fss-box-scale': dials.box.scale,
    '--fss-box-x': `${dials.box.x}px`,
    '--fss-box-y': `${dials.box.y}px`,
    '--fss-inbox-scale': dials.inbox.scale,
    '--fss-inbox-x': `${dials.inbox.x}px`,
    '--fss-inbox-y': `${dials.inbox.y}px`,
    '--fss-inbox-gap': `${dials.inbox.gap}px`,
  } as CSSProperties
  // Each step is its own case section (snap stop, reveal, copy styles). They share data-section="source",
  // so the sidebar's one Source entry jumps to step 1 and stays lit through step 4.
  return <InboxSpeed.Provider value={dials.inbox.speed}>
    {STEPS.map(({ stage, visual }, i) => {
      const key = `step${i + 1}` as keyof typeof CONFIG.titles
      return <section
        key={key}
        ref={el => { refs.current[i] = el }}
        className="case__section fss-step"
        data-section="source"
        data-layout="bottom"
        data-copy-align={section.align}
        data-text-reveal={section.textReveal?.preset}
        style={style}
        aria-labelledby={`case-source-${key}`}
      >
        <div className="case__text case__section-copy">
          <span className="case__eyebrow eyebrow">{String(i + 1).padStart(2, '0')} — {stage}</span>
          <EditableText as="h2" id={`case-source-${key}`} className="case__title" label={`Step ${i + 1} title`} value={dials.titles[key]} onChange={next => setValue(`titles.${key}`, next)} />
          <EditableText as="p" className="case__body" label={`Step ${i + 1} text`} value={dials.bodies[key]} onChange={next => setValue(`bodies.${key}`, next)} />
        </div>
        <div className="fss-visual">{visual}</div>
      </section>
    })}
  </InboxSpeed.Provider>
}
