import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { GhostButton } from '../features/ghost/GhostButton'
import { RESUME_URL } from '../data/contact'
import { ArrowDownIcon, ArrowUpRightIcon, ChevronLeftIcon } from './icons'
import { hasInAppHistory, navigate, type Route } from '../lib/router'
import { isLightUnder } from '../lib/surface'
import { useMedia } from '../lib/viewport'
import { useTuning } from '../tuning/useTuning'
import { restoreNavAlign } from '../lib/navAlign'
import './Nav.css'

// Phones: line the first link up with the Work hero's text, from the last measurement (lib/navAlign).
restoreNavAlign()

type Props = { route: Route }

type Tuple = [number, number, number, number]

/** How the nav behaves on scroll. */
const NAV_CONFIG = {
  /**
   * static: scrolls away. sticky: pins while its page section (hero / light section) is on
   * screen, then leaves with it. fixed: always at the top of the window.
   */
  position: { type: 'select' as const, options: ['static', 'sticky', 'fixed'], default: 'static' },
  /** What sits behind the nav while it is pinned over content. */
  backdrop: { type: 'select' as const, options: ['none', 'blur', 'solid'], default: 'blur' },
  backdropOpacity: [0.7, 0, 1, 0.01] as Tuple,
  blur: [16, 0, 40, 1] as Tuple,
  /** Space under the links while pinned, so the backdrop does not end tight on the text. */
  padBottom: [16, 0, 48, 1] as Tuple,
  /** Space between the letters of the nav words, Back included (px; the page text uses -0.64). */
  letterSpacing: {
    desktop: [-0.64, -2, 4, 0.01] as Tuple,
    mobile: [-0.64, -2, 4, 0.01] as Tuple,
    _collapsed: false,
  },
  /** Which side Davebot (the ghost) sits on; the links take the other side. */
  order: { type: 'select' as const, options: ['links · Davebot', 'Davebot · links'], default: 'links · Davebot' },
  /** Up-right arrow shown beside "Resume" on hover; it never shifts the other links. */
  resumeArrow: {
    /** Size as a multiple of the link text (1 = one em). */
    scale: [1, 0.4, 2, 0.05] as Tuple,
    /** Gap after the word (px). */
    x: [6, -10, 30, 0.5] as Tuple,
    /** Vertical nudge (px); negative lifts it. */
    y: [0, -12, 12, 0.5] as Tuple,
    _collapsed: false,
  },
  /** Phones only: how the links and Davebot stand off busy content under them (Nav.css, data-contrast).
   *  Off by default: phones show no blur or fade at the top or bottom; the links tuck away on scroll instead. */
  mobileContrast: {
    preset: { type: 'select' as const, options: ['Off', 'Edge blur', 'Soft fade', 'Fade scrim', 'Pill', 'Text halo', 'Strong text'], default: 'Off' },
    /**
     * Edge blur: no colour, only a blur strongest at the screen edge that thins out. Drawn at the top
     * under the nav.
     * length: band height (px). strength: share of it held at full blur before thinning (0–1).
     * opacity: how much of the blur shows (0–1). blur: the blur at the edge (px).
     * bottom: the same blur pinned to the bottom of the screen on every page (Nav.css). The dither
     * bands and the footer's text draw above both blurs, so they stay crisp (DitherBand.css, Footer.css).
     */
    edgeBlur: {
      length: [110, 20, 400, 1] as Tuple,
      strength: [0.3, 0, 1, 0.01] as Tuple,
      opacity: [1, 0, 1, 0.01] as Tuple,
      blur: [8, 0, 40, 0.5] as Tuple,
      bottom: true,
      _collapsed: false,
    },
    /** Fade scrim, Pill, Text halo, Strong text: how strong the tint, scrim, halo or text colour is (0–1). */
    strength: [0.9, 0, 1, 0.01] as Tuple,
    /** Soft fade colour. Follow section: dark over dark sections (the Work page top, My Playground), light over
        light ones (Selected works), never flipping over a project or playground card; the links still switch with whatever is under them.
        Light / Dark hold one tone everywhere. */
    fadeTone: { type: 'select' as const, options: ['Follow section', 'Light', 'Dark'], default: 'Follow section' },
    /** Soft fade, the About story's bottom fade turned upside down: blur at the top edge (px), thinning
        downward; its length from the top of the screen (px; the nav itself is 86px); and the share of that
        length that holds the top opacity before ramping to the bottom one (0–0.8). */
    fadeBlur: [6, 0, 30, 0.5] as Tuple,
    fadeLength: [126, 40, 400, 1] as Tuple,
    fadeSolid: [0.35, 0, 0.8, 0.01] as Tuple,
    /** Soft fade opacity at its top and bottom edges, for the white and the black fade (0–1). */
    fadeWhite: { top: [0.9, 0, 1, 0.01] as Tuple, bottom: [0, 0, 1, 0.01] as Tuple, _collapsed: false },
    fadeBlack: { top: [0.9, 0, 1, 0.01] as Tuple, bottom: [0, 0, 1, 0.01] as Tuple, _collapsed: false },
    /** Soft fade: the links and cursor take the fade's tone (readable over it at high strength), or keep
        switching with the content under the fade (e.g. white over the Harvard & MIT card). */
    fadeLinks: { type: 'select' as const, options: ['Match fade', 'Follow content'], default: 'Match fade' },
    /** Soft fade: how long a change of tone takes (ms), scrolling between sections or moving between pages. */
    fadeTime: [600, 0, 2000, 10] as Tuple,
    _collapsed: false,
  },
}

function internalLink(route: Route) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    event.preventDefault()
    navigate(route)
  }
}

const PROJECT_ROUTES: Route[] = ['momo', 'filo', 'harvard-mit']

/** Back to the work list: history when we came from it (restores the scroll), else the Work page. */
function goBack(event: MouseEvent<HTMLAnchorElement>) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
  event.preventDefault()
  if (hasInAppHistory()) window.history.back()
  else navigate('work')
}

/** Arrow offsets are relative to the fixed icon slot, so the label never moves. */
const BACK_ARROW = {
  style: { type: 'select' as const, options: ['arrow', 'chevron'], default: 'arrow' },
  scale: [1, 0.4, 3, 0.05] as Tuple,
  x: [0, -40, 40, 0.5] as Tuple,
  y: [0, -40, 40, 0.5] as Tuple,
}

/** "< Back" link. Project pages place it top-left, above the section list (Momo, Filo) or alone (Harvard & MIT). */
export function BackLink({ className = '' }: { className?: string }) {
  const arrow = useTuning('Back arrow', BACK_ARROW)
  return (
    <a className={`nav__back ${className}`.trim()} href="/" onClick={goBack}>
      <span className="nav__back-icon" style={{ display: 'inline-flex', flexShrink: 0 }}>
        <span style={{ display: 'inline-flex', width: '100%', height: '100%', transform: `translate(${arrow.x}px, ${arrow.y}px) scale(${arrow.scale}) rotate(${arrow.style === 'arrow' ? 90 : 0}deg)` }}>
          {arrow.style === 'arrow' ? <ArrowDownIcon /> : <ChevronLeftIcon />}
        </span>
      </span>
      Back
    </a>
  )
}

/** Where Davebot's eyes take the page's black: the Work page's top, the About page from My Playground
 *  on, and every contact block and footer, except on the Harvard & MIT portfolio, where they stay white. */
const INK_EYES = '.landing, .about__dark, .cta, .footer'

export function Nav({ route }: Props) {
  const isProject = PROJECT_ROUTES.includes(route)
  const t = useTuning('Nav', NAV_CONFIG)
  const pin = t.position === 'static' ? undefined : t.position
  const navRef = useRef<HTMLElement>(null)

  // Fixed modes leave the flow: a spacer of the nav's height keeps the page from jumping up.
  const [height, setHeight] = useState(0)
  useLayoutEffect(() => {
    const nav = navRef.current
    if (!nav || !pin) return
    const observer = new ResizeObserver(() => setHeight(nav.offsetHeight))
    observer.observe(nav)
    return () => observer.disconnect()
  }, [pin])

  // Follow the actual background, including pages that pin the nav through their own CSS.
  // Expose the same sampled surface to both link styling and the custom cursor. `section` is the
  // page behind any project or playground card, for the Soft fade's colour (mobileContrast › fadeTone).
  const [under, setUnder] = useState<'light' | 'dark'>()
  const [section, setSection] = useState<'light' | 'dark'>()
  // Davebot's eyes go the page's black (ghost.css) while he is over the Work page's top, the About
  // playground through its end, or a contact/footer block; elsewhere they stay paper.
  const [inkEyes, setInkEyes] = useState(false)

  // The fade's tone animates only once the nav has its first tone; on mount (each page has its own nav)
  // it takes the page's tone at once, so a page transition's new snapshot shows it from the first frame.
  const [fadeLive, setFadeLive] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setFadeLive(true))
    return () => cancelAnimationFrame(frame)
  }, [])
  useLayoutEffect(() => {
    const nav = navRef.current
    if (!nav) return
    let frame = 0
    // Hit tests see nothing during a page transition, when each page mounts its own nav. A new nav then
    // starts from the surface its page declares, so the transition's new snapshot already shows the
    // destination's tone and cross-fades into it.
    const declared = () => {
      const surface = nav.parentElement?.closest<HTMLElement>('[data-surface]')?.dataset.surface
      return surface === 'light' || surface === 'dark' ? surface : undefined
    }
    const sample = () => {
      frame = 0
      const links = nav.querySelector('.nav__links')?.getBoundingClientRect()
      if (!links) return
      const [x, y] = [links.left + links.width / 2, links.top + links.height / 2]
      const light = isLightUnder(nav, x, y)
      if (light !== null) setUnder(light ? 'light' : 'dark')
      else setUnder((current) => current ?? declared())
      const sectionLight = isLightUnder(nav, x, y, '.works__card, .pg-card')
      if (sectionLight !== null) setSection(sectionLight ? 'light' : 'dark')
      else setSection((current) => current ?? declared())
      // The page under Davebot himself (the nav's own boxes skipped); a View Transition hit test sees
      // only <html>, so that keeps the last answer.
      const ghost = nav.querySelector('.nav__ghost')?.getBoundingClientRect()
      const hit = ghost && document.elementsFromPoint(ghost.left + ghost.width / 2, ghost.top + ghost.height / 2).find((el) => !nav.contains(el))
      if (hit && hit !== document.documentElement) setInkEyes(route !== 'harvard-mit' && !!hit.closest(INK_EYES))
      // Edge blur: a sheet's curved edge inside a blur band is blurred toward the screen edge but sharp
      // at its tip, which reads as a flat crop. Such a band clears while an arc is in it (Nav.css): the
      // page's top band, and each sheet's own bottom band, which otherwise rests on the sheet's
      // bottom (its arc) once that is above the screen bottom. An arc spans up to 0.3 × the width.
      const band = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--edge-blur-length')) || 0
      const sag = 0.3 * window.innerWidth
      const vh = window.innerHeight
      let topArc = false
      for (const el of document.querySelectorAll<HTMLElement>('[data-arc-edge]')) {
        const { top, bottom } = el.getBoundingClientRect()
        if ((top > 0 && top < band) || (bottom > 0 && bottom < band + sag)) topArc = true
        const sheet = el.closest<HTMLElement>('.works, .about__dark') ?? el
        sheet.toggleAttribute('data-band-off', band > 0 && (bottom < vh - 0.5 || (top < vh && top > vh - band - sag)))
      }
      document.documentElement.toggleAttribute('data-edge-clear', band > 0 && topArc)
    }
    const queue = () => (frame ||= requestAnimationFrame(sample))
    sample()
    window.addEventListener('scroll', queue, { passive: true })
    window.addEventListener('resize', queue)
    // Sections also move without scrolling (reveals, snapping), so re-check a few times a second.
    const timer = window.setInterval(queue, 300)
    // A View Transition makes elementsFromPoint report only <html>. Resample
    // as soon as that overlay is removed instead of waiting for the 300 ms
    // fallback interval; this keeps the live nav colour aligned with its
    // outgoing snapshot.
    const transitionObserver = new MutationObserver(queue)
    transitionObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-vt'],
    })
    return () => {
      window.clearInterval(timer)
      transitionObserver.disconnect()
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', queue)
      window.removeEventListener('resize', queue)
    }
  }, [pin, route])

  // Phones with Soft fade and fadeLinks › Match fade: the links and cursor take the fade's tone.
  const phone = useMedia('(max-width: 640px)')
  const { preset, fadeTone, fadeLinks } = t.mobileContrast
  const fadeSurface = fadeTone === 'Light' ? 'light' : fadeTone === 'Dark' ? 'dark' : section
  const surface = phone && preset === 'Soft fade' && fadeLinks === 'Match fade' ? fadeSurface : under

  // Phones: the links tuck away while you scroll down and come back as soon as you scroll up (or
  // reach the top); Davebot stays. Direction is judged over a few pixels of travel so jitter and
  // iOS overscroll at either end don't flicker them (Nav.css, data-tucked). Only your own scrolling
  // (a touch, wheel or key in the last 1.5s, which covers a flick's momentum) tucks them: the Momo
  // intro's glide or a jump to a section leaves them shown.
  useEffect(() => {
    const nav = navRef.current
    if (!nav || !phone) return
    const max = () => document.documentElement.scrollHeight - window.innerHeight
    let last = Math.min(Math.max(window.scrollY, 0), max())
    let travel = 0
    let input = -Infinity
    const onInput = () => {
      input = performance.now()
    }
    const onScroll = () => {
      const y = Math.min(Math.max(window.scrollY, 0), max())
      const dy = y - last
      last = y
      if (y < 40) {
        travel = 0
        nav.removeAttribute('data-tucked')
        return
      }
      if (!dy) return
      travel = Math.sign(dy) === Math.sign(travel) ? travel + dy : dy
      if (travel > 12 && performance.now() - input < 1500) nav.setAttribute('data-tucked', '')
      else if (travel < -12) nav.removeAttribute('data-tucked')
    }
    const inputs = ['touchstart', 'touchmove', 'wheel', 'keydown'] as const
    for (const type of inputs) window.addEventListener(type, onInput, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      for (const type of inputs) window.removeEventListener(type, onInput)
      window.removeEventListener('scroll', onScroll)
      nav.removeAttribute('data-tucked')
    }
  }, [phone])

  const style = {
    '--nav-tracking-d': `${t.letterSpacing.desktop}px`,
    '--nav-tracking-m': `${t.letterSpacing.mobile}px`,
    '--resume-arrow-scale': t.resumeArrow.scale,
    '--resume-arrow-x': `${t.resumeArrow.x}px`,
    '--resume-arrow-y': `${t.resumeArrow.y}px`,
    '--nav-contrast': t.mobileContrast.strength,
    '--nav-fade-color': fadeSurface === 'dark' ? 'var(--ink-900)' : 'var(--paper)',
    '--nav-fade-top': (fadeSurface === 'dark' ? t.mobileContrast.fadeBlack : t.mobileContrast.fadeWhite).top,
    '--nav-fade-bottom': (fadeSurface === 'dark' ? t.mobileContrast.fadeBlack : t.mobileContrast.fadeWhite).bottom,
    '--nav-fade-blur': `${t.mobileContrast.fadeBlur}px`,
    '--nav-fade-length': `${t.mobileContrast.fadeLength}px`,
    '--nav-fade-time': `${t.mobileContrast.fadeTime}ms`,
    '--nav-fade-solid': `${t.mobileContrast.fadeSolid * 100}%`,
    ...(pin && {
      '--nav-h': `${height}px`,
      '--nav-backdrop-opacity': t.backdrop === 'none' ? 0 : t.backdropOpacity,
      '--nav-blur': t.backdrop === 'blur' ? `${t.blur}px` : '0px',
      '--nav-pad-bottom': `${t.padBottom}px`,
    }),
  } as CSSProperties

  // Edge blur: published on <html> so the About story's bottom band and the optional screen-bottom
  // blur draw the same blur (AboutPage.css, Nav.css), and the footer clears it (Footer.css).
  const edge = t.mobileContrast.edgeBlur
  useEffect(() => {
    const root = document.documentElement
    if (preset !== 'Edge blur') return
    root.dataset.edgeBlur = ''
    if (edge.bottom) root.dataset.edgeBlurBottom = ''
    root.style.setProperty('--edge-blur-length', `${edge.length}px`)
    root.style.setProperty('--edge-blur-solid', `${edge.strength * 100}%`)
    root.style.setProperty('--edge-blur-opacity', String(edge.opacity))
    root.style.setProperty('--edge-blur', `${edge.blur}px`)
    return () => {
      delete root.dataset.edgeBlur
      delete root.dataset.edgeBlurBottom
      for (const p of ['--edge-blur-length', '--edge-blur-solid', '--edge-blur-opacity', '--edge-blur']) root.style.removeProperty(p)
    }
  }, [preset, edge.length, edge.strength, edge.opacity, edge.blur, edge.bottom])

  return (
    <>
      {pin === 'fixed' && <div className="nav__spacer" aria-hidden="true" style={{ height }} />}
      <header ref={navRef} className="nav" data-pin={pin} data-under={surface} data-surface={surface} data-ghost-eyes={inkEyes ? 'ink' : undefined} data-ghost-side={t.order === 'Davebot · links' ? undefined : 'end'} data-contrast={preset === 'Off' ? undefined : preset} data-fade-live={fadeLive || undefined} style={style}>
        <div className="nav__start">
          <GhostButton className="nav__ghost" />
        </div>
        <nav className="nav__links" aria-label="Primary">
          {/* Phones, project pages: "← Back" takes Work's place (Nav.css). */}
          {isProject && <BackLink className="nav__links-back" />}
          <a className="nav__work" href="/" aria-current={route === 'work' ? 'page' : isProject ? 'true' : undefined} onClick={internalLink('work')}>
            Work
          </a>
          <a href="/about" aria-current={route === 'about' ? 'page' : undefined} onClick={internalLink('about')}>
            About
          </a>
          <a className="nav__resume" href={RESUME_URL} target="_blank" rel="noopener">
            Resume
            <ArrowUpRightIcon className="nav__resume-arrow" />
          </a>
        </nav>
      </header>
    </>
  )
}
