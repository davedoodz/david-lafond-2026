import { useLayoutEffect, useRef, type CSSProperties, type RefObject } from 'react'
import { ContactCta } from '../components/ContactCta'
import { Nav } from '../components/Nav'
import { SelectedWorks } from '../components/SelectedWorks'
import { DEFAULT_INTRO_TEXT, WorkIntroStickers, introLineSpan } from '../features/workStickers/WorkIntroStickers'
import { TOUCH_LANDING, smallViewportHeight, touchDome } from '../lib/touchLanding'
import { publishNavAlign } from '../lib/navAlign'
import { Signature } from '../features/signature/Signature'
import { useEntrance } from '../lib/useEntrance'
import { useFitColumn } from '../lib/useFitColumn'
import { useTuning } from '../tuning/useTuning'
import './WorkPage.css'

const CONFIG = {
  headlineLead: { type: 'text' as const, default: 'I’m' },
  headlineName: { type: 'text' as const, default: 'David Lafond' },
  headlineTagline: { type: 'text' as const, default: 'a product designer.' },
  /** Sticker intro paragraphs. {cities} {labs} {products} {faster} place the pills; Enter breaks a line. */
  introText1: { type: 'text' as const, default: DEFAULT_INTRO_TEXT[0], placeholder: '{cities} {labs} {products} {faster} = pills' },
  introText2: { type: 'text' as const, default: DEFAULT_INTRO_TEXT[1], placeholder: '{cities} {labs} {products} {faster} = pills' },
  /** Name lives in the headline; this line sits directly above the signature. */
  role: { type: 'text' as const, default: 'Architect & ex-MIT UX researcher\nnow focused on product design' },
  /** Text block: left- or centre-aligned. A left-aligned block is centred on its longest line (useHeroFit). */
  align: {
    text: { type: 'select' as const, options: ['left', 'center'], default: 'left' },
    /** Sticker intro only: left-aligned with the text block, or centred on it. */
    intro: { type: 'select' as const, options: ['left', 'center'], default: 'left' },
  },
  /** Sticker intro text size (px); pills and stickers scale with it. */
  introSize: {
    desktop: [20, 12, 40, 1] as [number, number, number, number],
    mobile: [14, 10, 32, 1] as [number, number, number, number],
  },
  /** Vertical gaps between the hero text elements (px). */
  spacing: {
    /** Line height of the sticker intro lines (× font size). */
    introLineHeight: [1.2, 1, 2.2, 0.01] as [number, number, number, number],
    titleToIntroDesktop: [30, 0, 200, 1] as [number, number, number, number],
    introToIntroDesktop: [24, 0, 200, 1] as [number, number, number, number],
    introToRoleDesktop: [42, 0, 200, 1] as [number, number, number, number],
    roleToSignatureDesktop: [21, -40, 200, 1] as [number, number, number, number],
    titleToIntroMobile: [19, 0, 160, 1] as [number, number, number, number],
    introToIntroMobile: [17, 0, 160, 1] as [number, number, number, number],
    introToRoleMobile: [40, 0, 160, 1] as [number, number, number, number],
    roleToSignatureMobile: [19, -40, 160, 1] as [number, number, number, number],
  },
  peekDesktop: [40, 0, 240, 1] as [number, number, number, number],
  peekMobile: [28, 0, 240, 1] as [number, number, number, number],
}

const phone = () => window.matchMedia('(max-width: 640px)').matches
/** Width of an element's text as laid out. */
function textWidth(el: Element | null) {
  if (!el) return 0
  const range = document.createRange()
  range.selectNodeContents(el)
  let left = Infinity, right = -Infinity
  for (const r of range.getClientRects()) if (r.width) { left = Math.min(left, r.left); right = Math.max(right, r.right) }
  range.detach()
  return right > left ? right - left : 0
}

/**
 * Hero text fit, at every width. The sticker intro and the role line always share one size
 * (--hero-body-fit scales both), shrunk only when their widest line (pills at their longest phrase)
 * would not fit the screen less the hero's side inset (--column-inset) on both sides, so no line
 * ever wraps.
 * Phones: the title also stays on one line per part ("I'm David Lafond," / "a product designer."),
 * shrinking the same way, and the hero takes its widest line's width.
 * The block is then centred (--hero-center-x) on the middle of its width range, between its
 * narrowest and widest phrase combinations, every line keeping one left edge. It never moves as the
 * pills change phrase, and sits no further off centre one way than the other. On phones the widest
 * line fills the screen, so the side insets pin it.
 * Touch landing (lib/touchLanding): when the hero is too tall for the sheet's peek to show, its
 * vertical padding shrinks (down to 8px) until it fits.
 */
function useHeroFit(heroRef: RefObject<HTMLElement | null>, key: string) {
  useLayoutEffect(() => {
    const hero = heroRef.current
    const landing = hero?.parentElement
    if (!hero || !landing) return
    const touch = window.matchMedia(TOUCH_LANDING)
    let frame = 0
    const fit = () => {
      frame = 0
      for (const v of ['--hero-title-fit', '--hero-body-fit', '--column-fit', 'padding-block']) hero.style.removeProperty(v)
      const avail = document.documentElement.clientWidth - 2 * parseFloat(getComputedStyle(hero).getPropertyValue('--column-inset'))
      const body = Math.max(textWidth(hero.querySelector('.hero__role')), introLineSpan(hero)[1])
      const bodyFit = body > avail ? avail / body : 1
      hero.style.setProperty('--hero-body-fit', bodyFit.toFixed(4))
      if (phone()) {
        const title = textWidth(hero.querySelector('.hero__title'))
        const titleFit = title > avail ? avail / title : 1
        hero.style.setProperty('--hero-title-fit', titleFit.toFixed(4))
        hero.style.setProperty('--column-fit', `${Math.ceil(Math.max(title * titleFit, body * bodyFit))}px`)
      }
      center()
      if (!touch.matches) return
      const svh = smallViewportHeight()
      const items = Array.from(hero.children) as HTMLElement[]
      const first = items[0], last = items[items.length - 1]
      if (!first || !last) return
      const content = last.offsetTop + last.offsetHeight - first.offsetTop
      const above = hero.getBoundingClientRect().top - landing.getBoundingClientRect().top
      const style = getComputedStyle(hero)
      const top = parseFloat(style.paddingTop), bottom = parseFloat(style.paddingBottom)
      const room = svh - touchDome(svh).peek - above - content
      if (room >= top + bottom) return
      const k = Math.max(0, room) / (top + bottom)
      hero.style.setProperty('padding-block', `${Math.max(8, top * k).toFixed(1)}px ${Math.max(8, bottom * k).toFixed(1)}px`)
    }
    const center = () => {
      // A centre-aligned hero is already centred line by line.
      if (hero.dataset.align === 'center') return hero.style.removeProperty('--hero-center-x')
      // Painted line widths at the fitted size: the title and role are fixed, the intro ranges with its pills.
      const fixed = Math.max(...['.hero__title', '.hero__role'].map((s) => textWidth(hero.querySelector(s))))
      const [narrow, wide] = introLineSpan(hero).map((w) => Math.max(fixed, w))
      const style = getComputedStyle(hero)
      const vw = document.documentElement.clientWidth
      const inset = parseFloat(style.getPropertyValue('--column-inset')) || 0
      // Layout position (the hero is centred by its margins), not the rect, which includes the shift.
      const left = (vw - hero.offsetWidth) / 2 + parseFloat(style.paddingLeft)
      // Centre the middle width; keep the widest line inside the right inset, and never pass the left one.
      const target = Math.min(vw / 2 - (narrow + wide) / 4, vw - inset - wide)
      const start = Math.max(inset, target)
      hero.style.setProperty('--hero-center-x', `${(start - left).toFixed(1)}px`)
      // Every page's phone nav follows this start (lib/navAlign): the same lengths at full type size.
      const bodyFit = parseFloat(hero.style.getPropertyValue('--hero-body-fit')) || 1
      const titleFit = parseFloat(hero.style.getPropertyValue('--hero-title-fit')) || 1
      const fixedFull = Math.max(textWidth(hero.querySelector('.hero__title')) / titleFit, textWidth(hero.querySelector('.hero__role')) / bodyFit)
      const [narrowFull, wideFull] = introLineSpan(hero).map((w) => Math.max(fixedFull, w / bodyFit))
      publishNavAlign((narrowFull + wideFull) / 4, wideFull)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(fit) }
    fit()
    addEventListener('resize', schedule)
    touch.addEventListener('change', schedule)
    void document.fonts.ready.then(schedule)
    // The column re-centres once useFitColumn measures; the intro's room depends on where it starts.
    let width = hero.offsetWidth
    const resize = new ResizeObserver(() => {
      if (hero.offsetWidth === width) return
      width = hero.offsetWidth
      schedule()
    })
    resize.observe(hero)
    return () => {
      cancelAnimationFrame(frame)
      removeEventListener('resize', schedule)
      touch.removeEventListener('change', schedule)
      resize.disconnect()
    }
  }, [heroRef, key])
}

export function WorkPage() {
  const t = useTuning('Hero', CONFIG)
  const mainRef = useRef<HTMLElement>(null)
  const heroRef = useRef<HTMLElement>(null)
  const entrance = useEntrance()
  useHeroFit(heroRef, JSON.stringify([t.headlineLead, t.headlineName, t.headlineTagline, t.introText1, t.introText2, t.role, t.introSize, t.align]))
  useFitColumn(mainRef)
  return (
    <main ref={mainRef} className="work">
      <div
        className="landing"
        style={{ '--peek-d': `${t.peekDesktop}px`, '--peek-m': `${t.peekMobile}px` } as CSSProperties}
      >
        <Nav route="work" />
        <section
          ref={heroRef}
          className={`hero column ${entrance.className}`}
          data-align={t.align.text}
          style={
            {
              ...entrance.style,
              // Sticker intro and role share one text size (WorkPage.css).
              '--intro-size-d': `${t.introSize.desktop}px`,
              '--intro-size-m': `${t.introSize.mobile}px`,
              '--intro-leading': String(t.spacing.introLineHeight),
              '--gap-title-intro-d': `${t.spacing.titleToIntroDesktop}px`,
              '--gap-intro-intro-d': `${t.spacing.introToIntroDesktop}px`,
              '--gap-intro-role-d': `${t.spacing.introToRoleDesktop}px`,
              '--gap-role-sig-d': `${t.spacing.roleToSignatureDesktop}px`,
              '--gap-title-intro-m': `${t.spacing.titleToIntroMobile}px`,
              '--gap-intro-intro-m': `${t.spacing.introToIntroMobile}px`,
              '--gap-intro-role-m': `${t.spacing.introToRoleMobile}px`,
              '--gap-role-sig-m': `${t.spacing.roleToSignatureMobile}px`,
            } as CSSProperties
          }
          aria-labelledby="hero-title"
        >
          <h1 id="hero-title" className="hero__title" data-enter="0" data-selectable>
            {t.headlineLead} <em>{t.headlineName}</em>,
            <br />
            <span className="hero__tagline">{t.headlineTagline}</span>
          </h1>
          <WorkIntroStickers
            key={`${t.introText1}\u0000${t.introText2}`}
            text={[t.introText1, t.introText2]}
            align={t.align.intro === 'center' ? 'center' : 'left'}
          />
          <p className="hero__role" data-enter="2" data-selectable>{t.role}</p>
          <Signature className="hero__signature" />
        </section>
      </div>
      <SelectedWorks />
      <ContactCta />
    </main>
  )
}
