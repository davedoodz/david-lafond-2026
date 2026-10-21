import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { ContactCta } from '../components/ContactCta'
import { ContributionGraph } from '../components/ContributionGraph'
import { SHEET_DOME, SHEET_LABEL_TOP } from '../components/SelectedWorks'
import { EditableText } from '../components/EditableText'
import { Footer } from '../components/Footer'
import { ArrowDownIcon } from '../components/icons'
import { Nav } from '../components/Nav'
import { PhotoStack } from '../features/photoStack/PhotoStack'
import { Playground } from '../features/playground/Playground'
import { SheetLayers, sheetDials, useSheetDepth } from '../features/sheetDepth/sheetDepth'
import { useEntrance } from '../lib/useEntrance'
import { DOME_CURVES, domeClip } from '../lib/domeClip'
import { SAVED_TOUCH_ARC, TOUCH_LANDING, smallViewportHeight, touchArcClip, touchDome } from '../lib/touchLanding'
import { capTop, settled } from '../lib/settledLayout'
import { useFitColumn } from '../lib/useFitColumn'
import { revealDials, useReveal } from '../lib/useReveal'
import { storyEntranceDials, useStoryEntrance } from '../features/storyEntrance/storyEntrance'
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
  /** Heading and story text alignment. */
  align: { type: 'select' as const, options: ['left', 'center'], default: 'left' },
  story: { type: 'text' as const, default: STORY, placeholder: 'Blank lines = paragraph breaks' },
  /** A phrase in the story that links out (new tab): underlined, with an up-right arrow on hover. */
  storyLink: {
    text: { type: 'text' as const, default: 'imposter' },
    url: { type: 'text' as const, default: 'https://youtu.be/7GkVqdgSZtw' },
  },
  playgroundLabel: { type: 'text' as const, default: 'My playground' },
  playgroundLabelColor: { type: 'color' as const, default: '#FFFFFF' },
  /** Vertical file-sheet presets for the dark playground panel. */
  sheet: sheetDials(),
  /**
   * Dark sheet arrives as a dome and flattens as it scrolls up, exactly like the Selected projects
   * sheet on Work: same peek, shape and morph (SelectedWorks.tsx SHEET_DOME, from its saved dials).
   */
  dome: {
    show: true,
  },
  /** How the playground label and cards arrive as they scroll into view. */
  reveal: revealDials(),
  /** How the heading and story arrive on load, tuned separately. soft = the shared Entrance rise. */
  storyEntrance: storyEntranceDials(),
  /** Story text size (px). */
  textSize: {
    desktop: [20, 12, 40, 1] as [number, number, number, number],
    mobile: [14, 10, 32, 1] as [number, number, number, number],
  },
  spacing: {
    /** Story's last line → the sheet's arc tip (px), with the sheet peeking. */
    gapDesktop: [174, 0, 600, 1] as [number, number, number, number],
    gapMobile: [54, 0, 500, 1] as [number, number, number, number],
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
    /** Playground section (label + grid + graph): move up (−) / down (+), px. */
    playY: [0, -300, 300, 1] as [number, number, number, number],
    /** Extra space above / below the playground section (px; negative pulls neighbours closer). */
    playSpaceAbove: [0, -200, 400, 1] as [number, number, number, number],
    playSpaceBelow: [0, -200, 400, 1] as [number, number, number, number],
    /** Desktop: one gap (px) for sheet top → cards, cards → graph, GitHub logo → contact heading
     * and "Let's chat" → footer links, always equal. */
    endGapDesktop: [150, 0, 400, 1] as [number, number, number, number],
    /** Snap stops: page top (photos), story end (sheet tip peeking), playground, footer. */
    snap: { type: 'select' as const, options: ['off', 'proximity', 'mandatory'], default: 'off' },
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
  /** Photo cards: x/y nudge (px) without moving the story below them. */
  cards: {
    xDesktop: [0, -400, 400, 1] as [number, number, number, number],
    yDesktop: [0, -300, 300, 1] as [number, number, number, number],
    xMobile: [0, -200, 200, 1] as [number, number, number, number],
    yMobile: [0, -300, 300, 1] as [number, number, number, number],
  },
  /** Heading + story: x/y nudge (px) without moving the cards or the dark sheet. */
  text: {
    xDesktop: [0, -400, 400, 1] as [number, number, number, number],
    yDesktop: [0, -300, 300, 1] as [number, number, number, number],
    xMobile: [0, -200, 200, 1] as [number, number, number, number],
    yMobile: [0, -300, 300, 1] as [number, number, number, number],
  },
  /**
   * Desktop: white fade + blur fixed to the bottom of the screen, over the story only: it eases in
   * as the story enters from below and out as its last line rises clear, so it never covers the
   * cards or the playground sheet. Phones: blur only, no white, at fixed values (AboutPage.css).
   */
  fade: {
    show: true,
    heightDesktop: [160, 40, 480, 1] as [number, number, number, number],
    /** Blur at the bottom edge (px); it thins out toward the top of the fade. */
    blur: [6, 0, 30, 0.5] as [number, number, number, number],
    color: { type: 'color' as const, default: '#FFFFFF' },
    /** Colour opacity at the bottom edge. */
    strength: [0.9, 0, 1, 0.01] as [number, number, number, number],
    /** Share of the fade that is fully solid at the bottom before it starts thinning (0–0.8). */
    solid: [0.15, 0, 0.8, 0.01] as [number, number, number, number],
  },
}

const STORY_TARGETS = { heading: '.about__heading', body: '.about__text' }

export function AboutPage() {
  const [revealRun, setRevealRun] = useState(0)
  const [storyRun, setStoryRun] = useState(0)
  const { values: t, setValue } = useTuningController('About', CONFIG, {
    onAction: (action) => {
      if (action === 'reveal.replay') setRevealRun((n) => n + 1)
      if (action === 'storyEntrance.replay') setStoryRun((n) => n + 1)
    },
  })

  const mainRef = useRef<HTMLElement>(null)
  const lightRef = useRef<HTMLDivElement>(null)
  const darkRef = useRef<HTMLDivElement>(null)
  useSheetDepth(darkRef, lightRef, { values: t.sheet, radius: [45, 20] })
  useFitColumn(mainRef)
  const entrance = useEntrance()
  const storyRef = useRef<HTMLElement>(null)
  useStoryEntrance(storyRef, STORY_TARGETS, t.storyEntrance, storyRun)
  // soft keeps the shared CSS rise; the other presets split the text and animate the pieces.
  const headingSoft = t.storyEntrance.heading.preset === 'soft'
  const bodySoft = t.storyEntrance.body.preset === 'soft'
  const playRef = useRef<HTMLElement>(null)
  const playTitleRef = useRef<HTMLHeadingElement>(null)
  // The label is placed from the sheet edge (below), so it sits outside the cards' reveal.
  useReveal(playRef, '.pg-card', t.reveal, revealRun)

  // "My playground" sits as far below the dark sheet's top edge as "Selected projects" does on Home.
  // Touch screens: like Home's label, it is centred between the arc's tip and the screen's bottom
  // edge at the story's end (half the Work page's peek). It stays in flow (the cards never move);
  // only its own offset is set.
  useLayoutEffect(() => {
    const dark = darkRef.current
    const title = playTitleRef.current
    if (!dark || !title) return
    const mobile = window.matchMedia('(max-width: 640px)')
    const touch = window.matchMedia(TOUCH_LANDING)
    const place = () => {
      const play = playRef.current
      title.style.top = '0px'
      dark.style.removeProperty('--play-touch-push')
      const edge = dark.getBoundingClientRect().top
      const peek = touch.matches ? touchDome(smallViewportHeight()).peek : 0
      // Touch screens: like Home's first thumbnail, the first row of cards starts at the fold, so
      // only the arc and the label show in the peek.
      const grid = play?.querySelector('.pg-grid')
      const push = grid ? peek - (grid.getBoundingClientRect().top - edge) : 0
      if (push > 0) dark.style.setProperty('--play-touch-push', `${push.toFixed(1)}px`)
      const box = title.getBoundingClientRect()
      const natural = box.top - dark.getBoundingClientRect().top
      const want = touch.matches
        ? peek / 2 - box.height / 2
        : mobile.matches ? SHEET_LABEL_TOP.mobile : SHEET_LABEL_TOP.desktop
      title.style.top = `${want - natural}px`
    }
    place()
    const observer = new ResizeObserver(place)
    observer.observe(dark)
    mobile.addEventListener('change', place)
    touch.addEventListener('change', place)
    return () => {
      observer.disconnect()
      mobile.removeEventListener('change', place)
      touch.removeEventListener('change', place)
    }
  }, [])

  const domeShow = t.dome.show
  useEffect(() => {
    const sheet = darkRef.current
    if (!sheet) return
    if (!domeShow) {
      sheet.style.removeProperty('--dome-clip')
      sheet.parentElement?.style.removeProperty('--dome-peek')
      return
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    let svh = smallViewportHeight()
    const set = (el: HTMLElement | null | undefined, v: string, value: string) => {
      if (!el || el.style.getPropertyValue(v) === value) return
      if (value) el.style.setProperty(v, value)
      else el.style.removeProperty(v)
    }
    // The Selected projects sheet's dome (SelectedWorks.tsx), drawn and moved the same way: same
    // peek, same shape, and the same progress over the same scroll distance from the peek.
    const update = () => {
      frame = 0
      const vh = window.innerHeight
      const vw = document.documentElement.clientWidth
      const mobile = window.matchMedia('(max-width: 640px)').matches
      const touch = window.matchMedia(TOUCH_LANDING).matches
      const morph = mobile || touch ? SHEET_DOME.morphMobile : SHEET_DOME.morph
      const curve = DOME_CURVES[morph.curve] ?? DOME_CURVES.smooth
      const peek = touch ? touchDome(svh).peek : mobile ? SHEET_DOME.peekMobile : SHEET_DOME.peekDesktop
      // The sheet overlaps the story by the peek (its top margin) and the story's bottom padding
      // grows by as much (AboutPage.css), so the gap above the arc tip stays the spacing dial.
      set(sheet.parentElement, '--dome-peek', `${peek.toFixed(2)}px`)
      // 1 at the peek (the sheet's top at vh − peek), easing to 0 over enterDistance rises (the
      // distance from the peek to the screen top), exactly like the Selected projects sheet.
      const rest = vh - peek
      const top = reduced ? 0 : 1 - curve(Math.min(1, Math.max(0, (rest - sheet.getBoundingClientRect().top) / (morph.enterDistance * Math.max(1, rest)))))
      if (touch) {
        sheet.style.setProperty('--dome-clip', touchArcClip(SAVED_TOUCH_ARC, sheet, svh, top, 0))
        return
      }
      const shape = { radius: morph.startRadius, arch: morph.startArch }
      sheet.style.setProperty('--dome-clip', domeClip(((morph.startSide * vw) / 100) * top, shape, top, shape, 0, vh))
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    const resize = () => {
      svh = smallViewportHeight()
      schedule()
    }
    // The touch arc's clip is drawn in px over the sheet's box, so redraw when the sheet resizes.
    const sized = new ResizeObserver(schedule)
    sized.observe(sheet)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(frame)
      sized.disconnect()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', resize)
    }
  }, [domeShow])

  // Bottom fade: opacity tracks how much of the story is still below the fade band. It is written
  // to a variable for the two layers, not to the band itself: opacity on the band would make it a
  // backdrop root and the blur would see nothing behind it.
  const fadeRef = useRef<HTMLDivElement>(null)
  const fadeShow = t.fade.show
  useEffect(() => {
    const fade = fadeRef.current
    const story = storyRef.current
    if (!fadeShow || !fade || !story) return
    let frame = 0
    const phone = window.matchMedia('(max-width: 640px)')
    const update = () => {
      frame = 0
      const viewport = window.visualViewport
      const edge = (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight)
      const h = phone.matches ? 116 : fade.offsetHeight
      const { top, bottom } = story.getBoundingClientRect()
      const clamp = (v: number) => Math.min(1, Math.max(0, v))
      // Keep the same story-only fade while the mobile document layer extends under browser UI.
      const p = h > 0 ? Math.min(clamp((edge - top) / h), clamp((bottom - (edge - h)) / h)) : 0
      if (phone.matches) {
        // Park the invisible layer at the page top so it cannot extend the footer's scroll range.
        const pageTop = p > 0 ? window.scrollY + edge - h : 0
        fade.style.setProperty('--fade-page-top', `${pageTop.toFixed(2)}px`)
      } else fade.style.removeProperty('--fade-page-top')
      fade.style.setProperty('--fade-p', p.toFixed(3))
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    const resize = new ResizeObserver(schedule)
    resize.observe(fade)
    resize.observe(story)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    window.visualViewport?.addEventListener('resize', schedule)
    window.visualViewport?.addEventListener('scroll', schedule)
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      window.visualViewport?.removeEventListener('resize', schedule)
      window.visualViewport?.removeEventListener('scroll', schedule)
    }
  }, [fadeShow])

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

  // Phones: three equal gaps at the end of the page, (1) last row of cards → graph months,
  // (2) GitHub logo → contact heading and (3) "Let's chat" → footer links. Their sum stays what the
  // layout and dials give; it is split in three. The graph moves by --cg-match (a translate) and the
  // contact text by --cta-match, moved from its bottom padding to its top padding (AboutPage.css), so
  // the page keeps its height. Applied shifts are subtracted from each measurement (no reset), so a
  // re-measure writes nothing unless something really moved.
  // Re-measured on resize, on any dial change (style writes), and when reveal animations settle.
  useLayoutEffect(() => {
    const dark = darkRef.current
    if (!dark) return
    const phone = window.matchMedia('(max-width: 640px)')
    let applied = { graph: 0, cta: 0 }
    let frame = 0
    let set = false
    const clear = () => {
      if (!set) return
      set = false
      applied = { graph: 0, cta: 0 }
      dark.querySelector<HTMLElement>('.cg')?.style.removeProperty('--cg-match')
      dark.querySelector<HTMLElement>('.cta')?.style.removeProperty('--cta-match')
    }
    const measure = () => {
      frame = 0
      const cta = dark.querySelector<HTMLElement>('.cta')
      // The grid's box, not the cards: the cards carry scroll-linked transforms (they fly off).
      const grid = dark.querySelector<HTMLElement>('.pg-grid')
      const graph = dark.querySelector<HTMLElement>('.cg')
      const months = dark.querySelector<HTMLElement>('.cg__labels')
      const logo = dark.querySelector<HTMLElement>('.cg__logo')
      const title = dark.querySelector<HTMLElement>('.cta__title')
      const pill = cta?.lastElementChild
      const links = Array.from(dark.querySelectorAll('.footer__inner :is(a, button)'), (el) => el.getBoundingClientRect().top)
      if (!phone.matches || !cta || !grid || !graph || !months || !logo || !title || !pill || !links.length) return clear()
      const top = (el: Element) => el.getBoundingClientRect().top
      const bottom = (el: Element) => el.getBoundingClientRect().bottom
      // Gaps as they would be with no shifts applied.
      const n1 = top(months) - bottom(grid) - applied.graph
      const n2 = top(title) - bottom(logo) - applied.cta + applied.graph
      const n3 = Math.min(...links) - bottom(pill) + applied.cta
      const style = getComputedStyle(cta)
      const padTop = parseFloat(style.paddingTop) - applied.cta
      const padBottom = parseFloat(style.paddingBottom) + applied.cta
      const gap = (n1 + n2 + n3) / 3
      // The text moves within the contact section's own padding (top and bottom both stay ≥ 0).
      const ctaShift = Math.max(-padTop, Math.min(padBottom, Math.round((n3 - gap) * 2) / 2))
      const next = { graph: Math.round((gap - n1) * 2) / 2, cta: ctaShift }
      if (Math.abs(next.graph - applied.graph) < 0.5 && Math.abs(next.cta - applied.cta) < 0.5) return
      applied = next
      set = true
      graph.style.setProperty('--cg-match', `${next.graph}px`)
      cta.style.setProperty('--cta-match', `${next.cta}px`)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    measure()
    const resize = new ResizeObserver(schedule)
    resize.observe(dark)
    const dials = new MutationObserver(schedule)
    dials.observe(dark, { attributes: true, attributeFilter: ['style'], subtree: true, childList: true })
    dark.addEventListener('transitionend', schedule)
    dark.addEventListener('animationend', schedule)
    phone.addEventListener('change', schedule)
    window.addEventListener('scroll', schedule, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      dials.disconnect()
      dark.removeEventListener('transitionend', schedule)
      dark.removeEventListener('animationend', schedule)
      phone.removeEventListener('change', schedule)
      window.removeEventListener('scroll', schedule)
      clear()
    }
  }, [])

  // Desktop: four equal gaps, set by spacing.endGapDesktop: (A) the dark sheet's top → first row
  // of cards, (B) last row → graph months, (C) GitHub logo → contact heading, (D) "Let's chat" →
  // footer links. Each is an added margin (AboutPage.css: --gap-a…d), so the page grows or shrinks
  // with the dial. Text edges are capital tops; boxes are measured as they sit once reveals settle.
  // Applied margins are subtracted from each measurement (no reset), so a re-measure writes nothing
  // unless something really moved.
  const endGap = t.spacing.endGapDesktop
  useLayoutEffect(() => {
    const dark = darkRef.current
    if (!dark) return
    const desktop = window.matchMedia('(min-width: 641px)')
    const keys = ['a', 'b', 'c', 'd'] as const
    let applied = { a: 0, b: 0, c: 0, d: 0 }
    let frame = 0
    const clear = () => {
      applied = { a: 0, b: 0, c: 0, d: 0 }
      for (const k of keys) dark.style.removeProperty(`--gap-${k}`)
    }
    const measure = () => {
      frame = 0
      const grid = dark.querySelector<HTMLElement>('.pg-grid')
      const month = dark.querySelector('.cg__labels span, .cg__months span')
      const logo = dark.querySelector('.cg__logo')
      const title = dark.querySelector('.cta__line, .cta__title')
      const pill = dark.querySelector('.cta')?.lastElementChild
      const link = dark.querySelector('.footer__inner a')
      if (!desktop.matches || !grid || !month || !logo || !title || !pill || !link) return clear()
      const box = settled(grid)
      // Each gap without its own margin and without the margins above it, which move both its edges.
      const natural = {
        a: box.top - settled(dark).top - applied.a,
        b: capTop(month) - box.bottom - applied.b,
        c: capTop(title) - settled(logo).bottom - applied.c,
        d: capTop(link) - settled(pill).bottom - applied.d,
      }
      const next = { a: 0, b: 0, c: 0, d: 0 }
      for (const k of keys) next[k] = Math.round((endGap - natural[k]) * 2) / 2
      if (keys.every((k) => Math.abs(next[k] - applied[k]) < 0.5)) return
      applied = next
      for (const k of keys) dark.style.setProperty(`--gap-${k}`, `${next[k]}px`)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    measure()
    const resize = new ResizeObserver(schedule)
    resize.observe(dark)
    dark.addEventListener('transitionend', schedule)
    dark.addEventListener('animationend', schedule)
    desktop.addEventListener('change', schedule)
    void document.fonts.ready.then(schedule)
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      dark.removeEventListener('transitionend', schedule)
      dark.removeEventListener('animationend', schedule)
      desktop.removeEventListener('change', schedule)
      clear()
    }
  }, [endGap])

  useEffect(() => {
    document.body.dataset.page = 'about'
    return () => {
      delete document.body.dataset.page
    }
  }, [])

  const style = {
    '--story-size-d': `${t.textSize.desktop}px`,
    '--story-size-m': `${t.textSize.mobile}px`,
    '--story-gap-d': `${t.spacing.gapDesktop}px`,
    '--story-gap-m': `${t.spacing.gapMobile}px`,
    '--stack-gap-d': `${t.spacing.stackToHeadingDesktop}px`,
    '--stack-gap-m': `${t.spacing.stackToHeadingMobile}px`,
    '--play-top-d': `${t.spacing.labelTopDesktop}px`,
    '--play-top-m': `${t.spacing.labelTopMobile}px`,
    '--play-arrow-y': `${t.spacing.labelArrowY}px`,
    '--play-fit-pad': `${t.spacing.playFitPadding}px`,
    '--play-y': `${t.spacing.playY}px`,
    '--play-above': `${t.spacing.playSpaceAbove}px`,
    '--play-below': `${t.spacing.playSpaceBelow}px`,
    '--play-fit-gap': `${t.spacing.playFitGap}px`,
    '--grid-size-d': t.grid.sizeDesktop,
    '--grid-size-m': t.grid.sizeMobile,
    '--grid-x-d': `${t.grid.xDesktop}px`,
    '--grid-y-d': `${t.grid.yDesktop}px`,
    '--grid-x-m': `${t.grid.xMobile}px`,
    '--grid-y-m': `${t.grid.yMobile}px`,
    '--cards-x-d': `${t.cards.xDesktop}px`,
    '--cards-y-d': `${t.cards.yDesktop}px`,
    '--cards-x-m': `${t.cards.xMobile}px`,
    '--cards-y-m': `${t.cards.yMobile}px`,
    '--text-x-d': `${t.text.xDesktop}px`,
    '--text-y-d': `${t.text.yDesktop}px`,
    '--text-x-m': `${t.text.xMobile}px`,
    '--text-y-m': `${t.text.yMobile}px`,
    '--fade-h-d': `${t.fade.heightDesktop}px`,
    '--fade-blur': `${t.fade.blur}px`,
    '--fade-color': t.fade.color,
    '--fade-strength': t.fade.strength,
    '--fade-solid': `${t.fade.solid * 100}%`,
  } as CSSProperties

  return (
    <main ref={mainRef} className="about" style={style} data-heading-m={headingLines}>
      <div ref={lightRef} className="about__light" data-surface="light">
        {/* Snap stops 1 and 2: page top, and the story's end with the sheet tip peeking. */}
        <div className="about__top-stop" aria-hidden="true" />
        <Nav route="about" />
        <PhotoStack className="about__stack" />
        <section ref={storyRef} className={`about__story column ${entrance.className}`} style={entrance.style} data-align={t.align} aria-labelledby="about-title">
          <EditableText
            as="h1"
            id="about-title"
            className="about__heading"
            label="Heading"
            enter={headingSoft ? 0 : undefined}
            value={t.heading}
            onChange={(next) => setValue('heading', next)}
            selectable
          />
          <EditableText
            className="about__text"
            label="Story"
            enter={bodySoft ? 1 : undefined}
            value={t.story}
            onChange={(next) => setValue('story', next)}
            selectable
            links={[{ text: t.storyLink.text, href: t.storyLink.url }]}
          />
        </section>
        {fadeShow && createPortal(<div ref={fadeRef} className="about__fade" style={style} aria-hidden="true" />, document.body)}
        <div className="about__peek-stop" aria-hidden="true" />
      </div>
      <div ref={darkRef} className="about__dark" data-surface="dark" data-dome={t.dome.show || undefined} data-arc-edge>
        <SheetLayers preset={t.sheet.preset} />
        <section ref={playRef} className="about__play" data-fit={t.spacing.playFit || undefined} aria-labelledby="play-title">
          {/* Words hidden, space kept: the cards' spacing is measured from this label. */}
          <h2 ref={playTitleRef} id="play-title" className="eyebrow column" style={{ color: t.playgroundLabelColor, visibility: 'hidden' }}>
            <EditableText as="span" label="Playground label" value={t.playgroundLabel} onChange={(next) => setValue('playgroundLabel', next)} /> <ArrowDownIcon />
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
