/**
 * "Momo · phone layout": DialKit panel for the Momo case study on phones (≤ 640px) only.
 * Folders follow the page from top to bottom and are named after each section's heading; every dial
 * names the exact image, video or words it moves. Text sizes stay in "Mobile case studies", shared by
 * every case study. Each dial sets one CSS variable on <main> (phoneLayoutDials.ts) that
 * momoMobile.css reads inside its phone media query, so desktop never changes.
 */
import { useEffect, type RefObject } from 'react'
import { usePhoneLayoutDials, type PhoneDialTable } from './phoneLayoutDials'
import { capTop, settled, textRect } from '../lib/settledLayout'
import { MOMO_BRAID_LAYOUT_EVENT } from '../features/momoIntro/MomoIntro'
import './momoMobile.css'

const DIALS: PhoneDialTable = {
  'Whole page': {
    'Gap between sections': ['--mm-section-gap', 112, 40, 240, 2, 'px'],
    'Heading to image gap': ['--mm-media-gap', 32, 0, 120, 1, 'px'],
    'Body text line spacing': ['--mm-body-lh', 1.25, 1, 1.8, 0.01, ''],
  },
  '1 Hero · title and welcome phone': {
    'Partner logos row width %': ['--mm-logos-fill', 100, 50, 100, 1, ''],
    'Welcome phone size': ['--mm-welcome-scale', 1, 0.6, 1.3, 0.01, ''],
    'Extra gap under logos': ['--mm-logos-below', 9, 0, 80, 1, 'px'],
  },
  '2 Problem · Opportunity · Solution': {
    'Line drawings width': ['--mm-story-art-w', 342, 200, 400, 2, 'px'],
    'Gap between the 3 blocks': ['--mm-story-gap', 72, 16, 200, 2, 'px'],
  },
  '3 User persona · portrait': {
    'Portrait photo width': ['--mm-persona-w', 236, 160, 340, 2, 'px'],
    'Sticker white border': ['--mm-sticker-border', 7, 0, 20, 1, 'px'],
    'Bubble quote text size': ['--mm-bubble-quote', 11, 8, 16, 0.5, 'px'],
    'Bubble pill text size': ['--mm-bubble-pill', 8, 6, 12, 0.5, 'px'],
    'Pills text size (max)': ['--mm-pills-text', 11, 8, 14, 0.5, 'px'],
    'Pills to sticker gap': ['--mm-sticker-drop', 88, 32, 200, 2, 'px'],
    'Sticker to next section': ['--mm-sticker-bottom', 56, 0, 120, 1, 'px'],
  },
  '4 Cross-device · watch + phone': {
    'Watch and phone size': ['--mm-devices-scale', 0.86, 0.5, 1.1, 0.01, ''],
    'Heartbeat line length': ['--mm-devices-link', 110, 40, 200, 2, 'px'],
  },
  '5 Core flows · 3 phones': {
    'Phone width': ['--mm-flow-w', 250, 160, 340, 2, 'px'],
    'Gap between phones': ['--mm-flow-gap', 40, 0, 120, 1, 'px'],
    'Title under phone size': ['--mm-flow-label', 13, 9, 18, 0.5, 'px'],
    'Phone to title gap': ['--mm-flow-label-gap', 14, 0, 40, 1, 'px'],
  },
  '6 Guided reflection · 2 videos': {
    'Model picker width': ['--mm-pick-w', 270, 160, 340, 2, 'px'],
    'Chat phone width': ['--mm-chat-w', 250, 160, 340, 2, 'px'],
    'Gap between videos': ['--mm-guided-gap', 40, 0, 120, 1, 'px'],
  },
  '7 User outcomes · paper': {
    'Paper page width': ['--mm-paper-w', 342, 200, 400, 2, 'px'],
  },
}

/** Mounted only on the Momo page, so its panel shows only there. Writes the dials to `target`. */
export function MomoPhoneDials({ target }: { target: RefObject<HTMLElement | null> }) {
  usePhoneLayoutDials('Momo · phone layout', DIALS, target)
  // The partner logos above the welcome phone span no wider than the phone (momoMobile.css), so its
  // laid-out width (before the size dial's scale) is published as --mm-welcome-w. The phone mounts
  // after this page (once the intro hands off) and the hero may re-render, so the whole page is
  // watched for the phone appearing or changing.
  useEffect(() => {
    const el = target.current
    if (!el) return
    let phone: HTMLElement | null = null
    const sizes = new ResizeObserver(() => {
      if (phone?.offsetWidth) el.style.setProperty('--mm-welcome-w', `${phone.offsetWidth}px`)
    })
    const find = () => {
      const next = el.querySelector<HTMLElement>('.case__section--hero .momo-welcome__phone')
      if (next === phone) return
      if (phone) sizes.unobserve(phone)
      phone = next
      if (phone) sizes.observe(phone)
    }
    find()
    const mounts = new MutationObserver(find)
    mounts.observe(el, { childList: true, subtree: true })
    return () => {
      mounts.disconnect()
      sizes.disconnect()
      el.style.removeProperty('--mm-welcome-w')
    }
  }, [target])
  useMomoWaveGapFix(target)
  return null
}

// Rest-state glow geometry for the hero braid (src/features/momoIntro/braid.js BAND + the hero
// "energy" dial, src/data/tuning.json under "Momo intro" › hero.energy = 0.28): the half-width the
// scale is fit to (BRAID_W = 2 × 320 × 0.87), and the amplitude/thickness the glow can ever reach at
// rest (no hover, no idle "replay" hint swell). If that energy dial or the braid's BAND constants
// move, these two need to move with them.
const MOMO_BRAID_W = 2 * 320 * 0.87
const MOMO_HERO_ENERGY = 0.28

/**
 * The braid's gap above (nav text bottom → wave ink top) must equal its gap below (wave ink bottom
 * → title cap top). The braid canvas breathes continuously and isn't part of document flow (it's
 * translated by the "y › braid" dial), so the two gaps don't track each other on their own: this
 * computes the glow's rest-state painted extent from its known geometry (not a canvas pixel sample —
 * the band never stops breathing, so any single sample would be a snapshot of one phase, not its
 * settled reach) and pushes the hero's top padding down by the shortfall, once. It only ever adds
 * padding (the top gap never shrinks below its natural size), and settled() corrects for any
 * in-flight entrance so a mid-animation read can't skew the result.
 */
function useMomoWaveGapFix(target: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    let disposed = false
    let lastWidth = window.innerWidth

    const measure = () => {
      if (disposed) return
      const main = target.current
      const hero = main?.querySelector<HTMLElement>('.case__section--hero')
      if (!main || !hero) return
      if (!mq.matches) { hero.style.removeProperty('--mm-wave-gap-fix'); return }
      // Queried from the document, not `main`: the nav is a page-level persistent element, not
      // necessarily a descendant of this case study's root.
      const navLink = document.querySelector<HTMLElement>('.nav__links a')
      const slot = main.querySelector<HTMLElement>('.case__section--hero .case__braid-slot')
      const title = main.querySelector<HTMLElement>('.case__section--hero .case__title--hero')
      if (!navLink || !slot || !title) return
      // Re-measuring from a blank slate: an earlier correction would otherwise be baked into the
      // slot's current position, since the hero's padding (and so the slot under it) has moved.
      hero.style.removeProperty('--mm-wave-gap-fix')
      const slotRect = settled(slot)
      const slotWidth = slotRect.right - slotRect.left, slotHeight = slotRect.bottom - slotRect.top
      if (slotWidth === 0 && slotHeight === 0) return // not laid out yet
      const heroWidthPx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--braid-w')) || 280
      const scale = Math.min(heroWidthPx, window.innerWidth * 0.72) / MOMO_BRAID_W
      // amp/thick follow braid.js's BAND formula at rest (env = MOMO_HERO_ENERGY, no swell/hint):
      // amp = BAND.amp + BAND.ampReact·env, th = BAND.thick + BAND.thickReact·env + 4 (its loudest
      // idle moment). The top edge sits amp+th/2 above center; the bottom edge carries an extra
      // th·0.3 asymmetric wobble, so it reaches amp+th·0.8 below center.
      const amp = 18 + 44 * MOMO_HERO_ENERGY
      const thick = 9 + 20 * MOMO_HERO_ENERGY + 4
      const ay = slotRect.top + slotHeight / 2
      const waveTop = ay - (amp + thick / 2) * scale
      const waveBottom = ay + (amp + thick * 0.8) * scale
      // The nav row's text (WORK / ABOUT / RESUME), not the nav box, whose padding sits lower. The
      // nav rests at the case page's top (.case__light), but during the intro it waits fixed at the
      // viewport top (Nav.tsx, data-over-intro), so measure the text against the nav box and place
      // it at the case top rather than reading where it is right now.
      const nav = navLink.closest<HTMLElement>('.nav')
      const light = main.querySelector<HTMLElement>('.case__light')
      const linkBottom = settled(navLink, textRect(navLink)).bottom
      const navBottom = nav && light ? light.getBoundingClientRect().top + (linkBottom - nav.getBoundingClientRect().top) : linkBottom
      const gapAbove = waveTop - navBottom
      const gapBelow = capTop(title) - waveBottom
      const correction = Math.max(0, gapBelow - gapAbove)
      if (correction < 0.5) return
      hero.style.setProperty('--mm-wave-gap-fix', `${Math.round(correction)}px`)
      // The box just moved (the padding above it changed): tell the canvas to redraw the band at its
      // new position so the painted glow follows the slot it was just computed from.
      window.dispatchEvent(new Event(MOMO_BRAID_LAYOUT_EVENT))
    }

    // One-shot: measured once per trigger, not on a timer. Height-only changes (the iOS toolbar
    // showing/hiding) are ignored — only an actual width or orientation change, or fonts finishing
    // layout, is worth a re-measure.
    const onResize = () => {
      const w = window.innerWidth
      if (w === lastWidth) return
      lastWidth = w
      measure()
    }
    const onOrientation = () => { lastWidth = window.innerWidth; measure() }
    measure()
    document.fonts?.ready.then(() => { if (!disposed) measure() })
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onOrientation)
    mq.addEventListener('change', onResize)
    return () => {
      disposed = true
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onOrientation)
      mq.removeEventListener('change', onResize)
      target.current?.querySelector<HTMLElement>('.case__section--hero')?.style.removeProperty('--mm-wave-gap-fix')
    }
  }, [target])
}
