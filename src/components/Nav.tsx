import { useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { GhostButton } from '../features/ghost/GhostButton'
import { RESUME_URL } from '../data/contact'
import { ArrowUpRightIcon, ChevronLeftIcon } from './icons'
import { hasInAppHistory, navigate, type Route } from '../lib/router'
import { isLightUnder } from '../lib/surface'
import { useTuning } from '../tuning/useTuning'
import './Nav.css'

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

/** "< Back" link. Project pages place it top-left, above the section list (Momo, Filo) or alone (Harvard & MIT). */
export function BackLink({ className = '' }: { className?: string }) {
  return (
    <a className={`nav__back ${className}`.trim()} href="/" onClick={goBack}>
      <ChevronLeftIcon className="nav__back-icon" />
      Back
    </a>
  )
}

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

  // Pinned over other sections, the links follow the page under them (light text on dark,
  // dark on light), sampled behind the links on scroll.
  const [under, setUnder] = useState<'light' | 'dark'>()
  useLayoutEffect(() => {
    const nav = navRef.current
    if (!nav || !pin) return setUnder(undefined)
    let frame = 0
    const sample = () => {
      frame = 0
      const links = nav.querySelector('.nav__links')?.getBoundingClientRect()
      if (!links) return
      const light = isLightUnder(nav, links.left + links.width / 2, links.top + links.height / 2)
      if (light !== null) setUnder(light ? 'light' : 'dark')
    }
    const queue = () => (frame ||= requestAnimationFrame(sample))
    sample()
    window.addEventListener('scroll', queue, { passive: true })
    window.addEventListener('resize', queue)
    // Sections also move without scrolling (reveals, snapping), so re-check a few times a second.
    const timer = window.setInterval(queue, 300)
    return () => {
      window.clearInterval(timer)
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', queue)
      window.removeEventListener('resize', queue)
    }
  }, [pin, route])

  const style = {
    '--resume-arrow-scale': t.resumeArrow.scale,
    '--resume-arrow-x': `${t.resumeArrow.x}px`,
    '--resume-arrow-y': `${t.resumeArrow.y}px`,
    ...(pin && {
      '--nav-h': `${height}px`,
      '--nav-backdrop-opacity': t.backdrop === 'none' ? 0 : t.backdropOpacity,
      '--nav-blur': t.backdrop === 'blur' ? `${t.blur}px` : '0px',
      '--nav-pad-bottom': `${t.padBottom}px`,
    }),
  } as CSSProperties

  return (
    <>
      {pin === 'fixed' && <div className="nav__spacer" aria-hidden="true" style={{ height }} />}
      <header ref={navRef} className="nav" data-pin={pin} data-under={under} data-ghost-side={t.order === 'Davebot · links' ? undefined : 'end'} style={style}>
        <div className="nav__start">
          <GhostButton className="nav__ghost" />
        </div>
        <nav className="nav__links" aria-label="Primary">
          <a href="/" aria-current={route === 'work' ? 'page' : isProject ? 'true' : undefined} onClick={internalLink('work')}>
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
