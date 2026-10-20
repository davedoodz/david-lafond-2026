/**
 * "Mobile case studies": one flat DialKit panel for phones (≤ 640px) on Momo, Filo and Harvard & MIT.
 * Every control sets one CSS variable that caseMobile.css reads only inside its phone media query,
 * so desktop never changes. Each text role is styled once for every section on every case study:
 * all eyebrows match, all section titles match, all bodies match.
 */
import type { CSSProperties } from 'react'
import { useTuning } from '../tuning/useTuning'
import './caseMobile.css'

type Tuple = [number, number, number, number]

const CONFIG = {
  // Text: size (px), line height (× size), letter spacing (em).
  eyebrowSize: [12, 8, 20, 0.5] as Tuple,
  eyebrowLineHeight: [1.2, 0.9, 2, 0.01] as Tuple,
  eyebrowTracking: [0.04, -0.05, 0.2, 0.005] as Tuple,
  heroTitleSize: [19.7, 12, 48, 0.1] as Tuple,
  heroTitleLineHeight: [1.15, 0.9, 2, 0.01] as Tuple,
  titleSize: [18.7, 12, 40, 0.1] as Tuple,
  titleLineHeight: [1.15, 0.9, 2, 0.01] as Tuple,
  titleTracking: [-0.034, -0.1, 0.1, 0.002] as Tuple,
  bodySize: [12.3, 9, 24, 0.1] as Tuple,
  bodyLineHeight: [1.4, 1, 2.2, 0.01] as Tuple,
  metaLabelSize: [10, 7, 18, 0.5] as Tuple,
  metaValueSize: [11, 8, 20, 0.5] as Tuple,
  quoteSize: [15.4, 10, 28, 0.1] as Tuple,
  quoteLineHeight: [1.21, 0.9, 2, 0.01] as Tuple,
  smallSize: [12, 8, 18, 0.5] as Tuple,
  contactTitleSize: [24, 14, 44, 0.5] as Tuple,
  contactBodySize: [14, 9, 24, 0.5] as Tuple,
  // Spacing (px): inside every text block. Side margins follow the Back button (caseMobile.css).
  eyebrowToTitle: [16, 0, 60, 1] as Tuple,
  titleToBody: [20, 0, 60, 1] as Tuple,
  heroTitleToMeta: [36, 0, 120, 1] as Tuple,
  textToMedia: [28, 0, 120, 1] as Tuple,
  // Element sizes.
  mediaHeight: [52, 20, 80, 1] as Tuple, // svh, every section video and figure
  heroArtScale: [1, 0.5, 1.5, 0.01] as Tuple, // Momo welcome phone / Filo hang tag
  storyArtWidth: [360, 160, 400, 2] as Tuple, // px
  personaImageWidth: [296, 160, 380, 2] as Tuple, // px
  bookPadX: [16, 0, 48, 1] as Tuple, // Harvard & MIT book, px
  bookPadTop: [24, 0, 120, 1] as Tuple,
  // Position (px): moves an element without moving anything around it.
  heroTitleX: [0, -120, 120, 1] as Tuple,
  heroTitleY: [0, -120, 120, 1] as Tuple,
  metaX: [0, -120, 120, 1] as Tuple,
  metaY: [0, -120, 120, 1] as Tuple,
  eyebrowX: [0, -120, 120, 1] as Tuple,
  eyebrowY: [0, -120, 120, 1] as Tuple,
  titleX: [0, -120, 120, 1] as Tuple,
  titleY: [0, -120, 120, 1] as Tuple,
  bodyX: [0, -120, 120, 1] as Tuple,
  bodyY: [0, -120, 120, 1] as Tuple,
  mediaX: [0, -120, 120, 1] as Tuple,
  mediaY: [0, -120, 120, 1] as Tuple,
  bookX: [0, -120, 120, 1] as Tuple,
  bookY: [0, -120, 120, 1] as Tuple,
}

/**
 * Splits a short phrase into three lines at word breaks, as even as possible (the longest line, in
 * characters, is as short as it can be): "March – September 2025" → "March –", "September", "2025".
 * Phrases of fewer than three words keep one line per word.
 */
export function threeLines(text: string): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length <= 3) return words
  const join = (from: number, to: number) => words.slice(from, to).join(' ')
  let best: string[] = []
  let bestLongest = Infinity
  for (let a = 1; a < words.length - 1; a++) {
    for (let b = a + 1; b < words.length; b++) {
      const lines = [join(0, a), join(a, b), join(b, words.length)]
      const longest = Math.max(...lines.map((line) => line.length))
      if (longest < bestLongest) [best, bestLongest] = [lines, longest]
    }
  }
  return best
}

/** CSS variables for the case study's `<main>`; caseMobile.css applies them on phones only. */
export function useCaseMobileStyle(): CSSProperties {
  const t = useTuning('Mobile case studies', CONFIG)
  const px = (n: number) => `${n}px`
  return {
    '--m-eyebrow-size': px(t.eyebrowSize),
    '--m-eyebrow-lh': t.eyebrowLineHeight,
    '--m-eyebrow-track': `${t.eyebrowTracking}em`,
    '--m-hero-title-size': px(t.heroTitleSize),
    '--m-hero-title-lh': t.heroTitleLineHeight,
    '--m-title-size': px(t.titleSize),
    '--m-title-lh': t.titleLineHeight,
    '--m-title-track': `${t.titleTracking}em`,
    '--m-body-size': px(t.bodySize),
    '--m-body-lh': t.bodyLineHeight,
    '--m-meta-label-size': px(t.metaLabelSize),
    '--m-meta-value-size': px(t.metaValueSize),
    '--m-quote-size': px(t.quoteSize),
    '--m-quote-lh': t.quoteLineHeight,
    '--m-small-size': px(t.smallSize),
    '--m-contact-title-size': px(t.contactTitleSize),
    '--m-contact-body-size': px(t.contactBodySize),
    '--m-eyebrow-gap': px(t.eyebrowToTitle),
    '--m-title-gap': px(t.titleToBody),
    '--m-hero-meta-gap': px(t.heroTitleToMeta),
    '--m-media-gap': px(t.textToMedia),
    '--m-hero-art-scale': t.heroArtScale,
    '--m-media-h': `${t.mediaHeight}svh`,
    '--m-story-art-w': px(t.storyArtWidth),
    '--m-persona-img-w': px(t.personaImageWidth),
    '--m-book-pad-x': px(t.bookPadX),
    '--m-book-pad-top': px(t.bookPadTop),
    '--m-hero-title-x': px(t.heroTitleX),
    '--m-hero-title-y': px(t.heroTitleY),
    '--m-meta-x': px(t.metaX),
    '--m-meta-y': px(t.metaY),
    '--m-eyebrow-x': px(t.eyebrowX),
    '--m-eyebrow-y': px(t.eyebrowY),
    '--m-title-x': px(t.titleX),
    '--m-title-y': px(t.titleY),
    '--m-body-x': px(t.bodyX),
    '--m-body-y': px(t.bodyY),
    '--m-media-x': px(t.mediaX),
    '--m-media-y': px(t.mediaY),
    '--m-book-x': px(t.bookX),
    '--m-book-y': px(t.bookY),
  } as CSSProperties
}
