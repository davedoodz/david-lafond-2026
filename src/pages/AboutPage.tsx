import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { ContactCta } from '../components/ContactCta'
import { ContributionGraph } from '../components/ContributionGraph'
import { EditableText } from '../components/EditableText'
import { Footer } from '../components/Footer'
import { ArrowDownIcon } from '../components/icons'
import { Nav } from '../components/Nav'
import { PhotoStack } from '../features/photoStack/PhotoStack'
import { Playground } from '../features/playground/Playground'
import { SheetLayers, sheetDials, useSheetDepth } from '../features/sheetDepth/sheetDepth'
import { useEntrance } from '../lib/useEntrance'
import { DOME_CURVES, domeClip } from '../lib/domeClip'
import { useFitColumn } from '../lib/useFitColumn'
import { revealDials, useReveal } from '../lib/useReveal'
import { useTuningController } from '../tuning/useTuning'
import './AboutPage.css'

const STORY = [
  'My path to product design has been a rocky one.',
  'My academic path began as a pre-med, only to realize that following strict protocols wasn’t meant for me.',
  'I believe the best designers are rebellious by nature.',
  'I’ve never truly felt like I belonged anywhere.\n\n\n',
  'My whole life has been a series of pivots.\nI have quite the unconventional background.',
  'I started my studies\n',
  'Here are a few snippets that shed a bit of light into my too-many-too-count interests.',
].join('\n\n')

const CONFIG = {
  heading: { type: 'text' as const, default: 'Aw, flattered you wanna hear my story.' },
  /** Mobile heading: kept on one line or two balanced lines; the type shrinks only as far as that needs. */
  headingLinesMobile: { type: 'select' as const, options: ['one', 'two'], default: 'one' },
  story: { type: 'text' as const, default: STORY, placeholder: 'Blank lines = paragraph breaks' },
  playgroundLabel: { type: 'text' as const, default: 'My playground' },
  /** Vertical file-sheet presets for the dark playground panel. */
  sheet: sheetDials(),
  /**
   * Dark sheet arrives as a dome (like the Selected works sheet) and flattens as
   * it reaches the top. `peek` pulls it up so its tip shows below the story.
   */
  dome: {
    show: true,
    peekDesktop: [40, 0, 240, 1] as [number, number, number, number],
    peekMobile: [28, 0, 240, 1] as [number, number, number, number],
    curve: { type: 'select' as const, options: Object.keys(DOME_CURVES), default: 'smoother' },
    /** Viewport heights of scroll from peeking to flat (max 1: flat once the sheet reaches the top). */
    enterDistance: [1, 0.2, 2.5, 0.01] as [number, number, number, number],
    side: [14, 0, 45, 0.5] as [number, number, number, number],
    arch: [40, 0, 100, 1] as [number, number, number, number],
    /** Top-corner radius (px), held until the sheet is almost at the top, then squared off. */
    radius: [45, 0, 200, 1] as [number, number, number, number],
  },
  /** Same dome shape, used at ≤640px wide (peek stays in Dome). Starts from the tuned desktop values. */
  domeMobile: {
    curve: { type: 'select' as const, options: Object.keys(DOME_CURVES), default: 'expo-out' },
    enterDistance: [1.75, 0.2, 2.5, 0.01] as [number, number, number, number],
    side: [0, 0, 45, 0.5] as [number, number, number, number],
    arch: [70, 0, 100, 1] as [number, number, number, number],
    radius: [0, 0, 200, 1] as [number, number, number, number],
  },
  /** How the playground label and cards arrive as they scroll into view. */
  reveal: revealDials(),
  spacing: {
    gapDesktop: [214, 40, 600, 1] as [number, number, number, number],
    gapMobile: [149, 24, 500, 1] as [number, number, number, number],
    stackToHeadingDesktop: [80, 0, 240, 1] as [number, number, number, number],
    stackToHeadingMobile: [78, 0, 240, 1] as [number, number, number, number],
    /** "My playground" label: distance from the top of the dark sheet (px). */
    labelTopDesktop: [39, 0, 300, 1] as [number, number, number, number],
    labelTopMobile: [25, 0, 200, 1] as [number, number, number, number],
    /** Arrow next to "My playground": vertical nudge (px, negative = up). */
    labelArrowY: [-0.5, -8, 8, 0.25] as [number, number, number, number],
    /**
     * Fit: the label, grid and contribution graph sit centred in one screen-tall panel
     * (the snap view), cards shrinking if needed so every row and the graph fit.
     * Off: labelTop + the Playground grid gap place them.
     */
    playFit: true,
    /** Fit mode: space kept clear above and below the label + grid + graph (px). */
    playFitPadding: [56, 0, 200, 1] as [number, number, number, number],
    /** Fit mode: label to first row of cards (px). */
    playFitGap: [40, 0, 200, 1] as [number, number, number, number],
    /** Snap stops: page top (photos), story end (sheet tip peeking), playground, footer. */
    snap: { type: 'select' as const, options: ['off', 'proximity', 'mandatory'], default: 'mandatory' },
  },
  /** Playground grid inside the panel. Size multiplies the fitted width; x/y nudge it without moving anything else. */
  grid: {
    sizeDesktop: [1, 0.3, 1.5, 0.01] as [number, number, number, number],
    sizeMobile: [1, 0.3, 1.5, 0.01] as [number, number, number, number],
    xDesktop: [0, -400, 400, 1] as [number, number, number, number],
    yDesktop: [0, -300, 300, 1] as [number, number, number, number],
    xMobile: [0, -200, 200, 1] as [number, number, number, number],
    yMobile: [0, -300, 300, 1] as [number, number, number, number],
  },
}

export function AboutPage() {
  const [revealRun, setRevealRun] = useState(0)
  const { values: t, setValue } = useTuningController('About', CONFIG, {
    onAction: (action) => {
      if (action === 'reveal.replay') setRevealRun((n) => n + 1)
    },
  })

  const mainRef = useRef<HTMLElement>(null)
  const lightRef = useRef<HTMLDivElement>(null)
  const darkRef = useRef<HTMLDivElement>(null)
  useSheetDepth(darkRef, lightRef, { values: t.sheet, radius: [45, 20] })
  useFitColumn(mainRef)
  const entrance = useEntrance()
  const playRef = useRef<HTMLElement>(null)
  useReveal(playRef, '#play-title, .pg-card', t.reveal, revealRun)

  const dome = t.dome
  const domeMobile = t.domeMobile
  const domeKey = JSON.stringify([dome, domeMobile])
  useEffect(() => {
    const sheet = darkRef.current
    if (!sheet) return
    if (!dome.show) {
      sheet.style.removeProperty('--dome-clip')
      return
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    const update = () => {
      frame = 0
      const vh = window.innerHeight
      const vw = document.documentElement.clientWidth
      const mobile = window.matchMedia('(max-width: 640px)').matches
      const shape = mobile ? domeMobile : dome
      const curve = DOME_CURVES[shape.curve] ?? DOME_CURVES.smooth
      // 0 while only the peek shows (same full dome as the Work page's resting tip),
      // 1 once it has travelled enterDistance. Capped so it is always flat by the
      // time the sheet top reaches the top of the screen (the snap stop).
      const peek = mobile ? dome.peekMobile : dome.peekDesktop
      const rest = vh - peek
      if (mobile) {
        // Mobile: the Selected works morph — one progress value drives side, arch
        // and corners together through the shared domeClip, so the shape never
        // steps mid-scroll. Travel is capped at the rest distance so it is fully
        // flat when the sheet snaps to the top (no page showing at the corners).
        const travel = Math.min(shape.enterDistance * vh, rest)
        // +1px: a sub-pixel snap position still counts as fully flat.
        const e = reduced ? 1 : curve(Math.min(1, Math.max(0, (rest + 1 - sheet.getBoundingClientRect().top) / travel)))
        const side = (shape.side * (1 - e) * vw) / 100
        sheet.style.setProperty('--dome-clip', domeClip(side, { radius: shape.radius, arch: shape.arch }, 1 - e, { radius: 0, arch: 0 }, 0, vh))
        return
      }
      const travel = Math.min(shape.enterDistance * vh, rest)
      const e = reduced ? 1 : curve(Math.min(1, Math.max(0, (rest - sheet.getBoundingClientRect().top) / travel)))
      // Top corners stay rounded for the whole approach and only square off in the
      // last stretch, right as the sheet reaches the top (1 − p⁴ of the full travel).
      const p = reduced ? 1 : Math.min(1, Math.max(0, (rest - sheet.getBoundingClientRect().top) / rest))
      const r = shape.radius * (1 - p ** 4)
      const archPx = (shape.arch / 100) * vh * (1 - e)
      // While the arch is taller than the corners it spans the full width (50%);
      // as it sinks below the corner size the curve narrows into two corners.
      const k = r > 0 ? Math.min(1, Math.max(0, (archPx - r) / r)) : archPx > 0 ? 1 : 0
      const x = (r + (vw / 2 - r) * k).toFixed(2)
      const y = Math.max(r, archPx).toFixed(2)
      const side = ((shape.side * (1 - e) * vw) / 100).toFixed(2)
      sheet.style.setProperty('--dome-clip', `inset(0 ${side}px round ${x}px ${x}px 0 0 / ${y}px ${y}px 0 0)`)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
    // `domeKey` captures every dome dial.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domeKey])

  // Snap lives on <html>; layout effect so it is gone in the same commit that swaps pages.
  const snap = t.spacing.snap
  useLayoutEffect(() => {
    if (snap === 'off') return
    const root = document.documentElement
    root.dataset.aboutSnap = snap
    return () => {
      delete root.dataset.aboutSnap
    }
  }, [snap])

  // Mobile heading fit: the largest size (up to the display size) that keeps it on the chosen line count.
  const headingLines = t.headingLinesMobile === 'two' ? 2 : 1
  useLayoutEffect(() => {
    const heading = mainRef.current?.querySelector<HTMLElement>('.about__heading')
    const column = heading?.parentElement
    if (!heading || !column) return
    const mobile = window.matchMedia('(max-width: 640px)')
    const fit = () => {
      heading.style.removeProperty('--heading-fit-m')
      if (!mobile.matches) return
      const probe = heading.cloneNode(true) as HTMLElement
      probe.removeAttribute('id')
      probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;width:max-content;max-width:none'
      column.appendChild(probe)
      const full = probe.scrollWidth
      const base = parseFloat(getComputedStyle(probe).fontSize)
      probe.remove()
      // Two lines: half the text plus slack, since lines only break between words.
      const need = headingLines === 1 ? full : (full / 2) * 1.15
      heading.style.setProperty('--heading-fit-m', `${Math.min(base, (base * column.clientWidth) / need).toFixed(2)}px`)
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(column)
    mobile.addEventListener('change', fit)
    return () => {
      observer.disconnect()
      mobile.removeEventListener('change', fit)
      heading.style.removeProperty('--heading-fit-m')
    }
  }, [headingLines, t.heading])

  // The fitted grid leaves room for the contribution graph below it (its height changes with its dials).
  useLayoutEffect(() => {
    const play = playRef.current
    if (!play) return
    const measure = () => {
      const graph = play.querySelector<HTMLElement>('.cg')
      play.style.setProperty('--cg-h', `${graph?.offsetHeight ?? 0}px`)
    }
    measure()
    const observer = new ResizeObserver(measure)
    const graph = play.querySelector<HTMLElement>('.cg')
    if (graph) observer.observe(graph)
    // The graph mounts/unmounts with its `show` dial.
    const mutations = new MutationObserver(() => {
      observer.disconnect()
      const next = play.querySelector<HTMLElement>('.cg')
      if (next) observer.observe(next)
      measure()
    })
    mutations.observe(play, { childList: true })
    return () => {
      observer.disconnect()
      mutations.disconnect()
    }
  }, [])

  useEffect(() => {
    document.body.dataset.page = 'about'
    return () => {
      delete document.body.dataset.page
    }
  }, [])

  const style = {
    '--story-gap-d': `${t.spacing.gapDesktop}px`,
    '--story-gap-m': `${t.spacing.gapMobile}px`,
    '--stack-gap-d': `${t.spacing.stackToHeadingDesktop}px`,
    '--stack-gap-m': `${t.spacing.stackToHeadingMobile}px`,
    '--play-top-d': `${t.spacing.labelTopDesktop}px`,
    '--play-top-m': `${t.spacing.labelTopMobile}px`,
    '--play-arrow-y': `${t.spacing.labelArrowY}px`,
    '--play-fit-pad': `${t.spacing.playFitPadding}px`,
    '--play-fit-gap': `${t.spacing.playFitGap}px`,
    '--grid-size-d': t.grid.sizeDesktop,
    '--grid-size-m': t.grid.sizeMobile,
    '--grid-x-d': `${t.grid.xDesktop}px`,
    '--grid-y-d': `${t.grid.yDesktop}px`,
    '--grid-x-m': `${t.grid.xMobile}px`,
    '--grid-y-m': `${t.grid.yMobile}px`,
    '--dome-peek-d': `${t.dome.peekDesktop}px`,
    '--dome-peek-m': `${t.dome.peekMobile}px`,
  } as CSSProperties

  return (
    <main ref={mainRef} className="about" style={style} data-heading-m={headingLines}>
      <div ref={lightRef} className="about__light" data-surface="light">
        {/* Snap stops 1 and 2: page top, and the story's end with the sheet tip peeking. */}
        <div className="about__top-stop" aria-hidden="true" />
        <Nav route="about" />
        <PhotoStack className="about__stack" />
        <section className={`about__story column ${entrance.className}`} style={entrance.style} aria-labelledby="about-title">
          <EditableText
            as="h1"
            id="about-title"
            className="about__heading"
            label="Heading"
            enter={0}
            value={t.heading}
            onChange={(next) => setValue('heading', next)}
          />
          <EditableText
            className="about__text"
            label="Story"
            enter={1}
            value={t.story}
            onChange={(next) => setValue('story', next)}
          />
        </section>
        <div className="about__peek-stop" aria-hidden="true" />
      </div>
      <div ref={darkRef} className="about__dark" data-surface="dark" data-dome={t.dome.show || undefined}>
        <SheetLayers preset={t.sheet.preset} />
        <section ref={playRef} className="about__play" data-fit={t.spacing.playFit || undefined} aria-labelledby="play-title">
          <h2 id="play-title" className="eyebrow column">
            {t.playgroundLabel} <ArrowDownIcon />
          </h2>
          <Playground />
          <ContributionGraph />
        </section>
        <ContactCta />
        <Footer />
      </div>
    </main>
  )
}
