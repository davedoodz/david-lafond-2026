/**
 * "Momo · phone layout": DialKit panel for the Momo case study on phones (≤ 640px) only.
 * Folders follow the page from top to bottom and are named after each section's heading; every dial
 * names the exact image, video or words it moves. Text sizes stay in "Mobile case studies", shared by
 * every case study. Each dial sets one CSS variable on <main> that momoMobile.css reads inside its
 * phone media query, so desktop never changes.
 */
import { useEffect, type RefObject } from 'react'
import { useTuning } from '../tuning/useTuning'
import './momoMobile.css'

type Tuple = [number, number, number, number]

/** Folder → dial label → [CSS variable, default, min, max, step, unit]. DialKit spaces out capitals
 *  that follow another letter ("MIT" → "M I T"), so labels use capitals only at word starts, and stay
 *  short enough to show beside their value. */
const DIALS: Record<string, Record<string, [string, number, number, number, number, 'px' | '']>> = {
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

const CONFIG = Object.fromEntries(
  Object.entries(DIALS).map(([folder, dials]) => [
    folder,
    Object.fromEntries(Object.entries(dials).map(([label, [, ...range]]) => [label, range.slice(0, 4) as Tuple])),
  ]),
) as Record<string, Record<string, Tuple>>

/** Mounted only on the Momo page, so its panel shows only there. Writes the dials to `target`.
 *  Passive effects throughout: this sits inside <main>, whose ref attaches after children's
 *  layout effects run. */
export function MomoPhoneDials({ target }: { target: RefObject<HTMLElement | null> }) {
  const t = useTuning('Momo · phone layout', CONFIG) as unknown as Record<string, Record<string, number>>
  useEffect(() => {
    const el = target.current
    if (!el) return
    const set: string[] = []
    for (const [folder, dials] of Object.entries(DIALS)) {
      for (const [label, [name, , , , , unit]] of Object.entries(dials)) {
        el.style.setProperty(name, `${t[folder][label]}${unit}`)
        set.push(name)
      }
    }
    return () => set.forEach((name) => el.style.removeProperty(name))
  }, [t, target])
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
  return null
}
