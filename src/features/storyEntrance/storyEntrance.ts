/**
 * Load-in for the About heading and story, tuned separately: the heading gets expressive
 * word/letter presets, the body calmer line-by-line ones. While a run plays, the text is split
 * into spans (letters, words); when it ends, the original text nodes go back, so editing,
 * selection and layout are untouched afterwards. `soft` uses the shared CSS "Entrance" rise
 * instead (no splitting); `none` shows the text at once.
 */
import { useLayoutEffect, useRef, type RefObject } from 'react'
import './storyEntrance.css'

type Tuple = [number, number, number, number]
type Unit = 'letters' | 'words' | 'lines'

/**
 *   bounce   words spring up, overshoot and settle in two bounces
 *   pop      words pop up from small with an overshoot
 *   tumble   words rise tilted and straighten, like tiles dropping in
 *   jelly    words squash and stretch as they land
 *   wave     letters bounce up one after another, a ripple across the line
 *   slot     letters roll up from behind their baseline, like a split-flap board
 *   swing    words flip up on their bottom edge, like cards being stood up
 *   balloon  words inflate from small at the baseline and wobble into size
 *   stretch  letters shoot up stretched tall, then snap back to shape
 */
export const HEADING_PRESETS = ['bounce', 'pop', 'tumble', 'jelly', 'wave', 'slot', 'swing', 'balloon', 'stretch', 'soft', 'none'] as const
/**
 *   lines    each line slides up from behind its own baseline
 *   rise     each line fades and drifts up
 *   blur     each line drifts up out of a soft blur
 *   words    words fade up in quick reading order
 */
export const BODY_PRESETS = ['lines', 'rise', 'blur', 'words', 'soft', 'none'] as const
type Preset = (typeof HEADING_PRESETS)[number] | (typeof BODY_PRESETS)[number]

const UNIT: Record<Preset, Unit> = {
  bounce: 'words', pop: 'words', tumble: 'words', jelly: 'words', swing: 'words', balloon: 'words',
  wave: 'letters', slot: 'letters', stretch: 'letters',
  lines: 'lines', rise: 'lines', blur: 'lines', words: 'words',
  soft: 'words', none: 'words',
}
const MASKED = new Set<Preset>(['slot', 'lines'])

const group = (preset: string, delayMs: number, durationMs: number, staggerMs: number, distance: number, playfulness: number, presets: readonly string[]) => ({
  preset: { type: 'select' as const, options: [...presets], default: preset },
  delayMs: [delayMs, 0, 2000, 10] as Tuple,
  durationMs: [durationMs, 150, 2500, 10] as Tuple,
  /** Gap between units: letters, words, or lines, depending on the preset. */
  staggerMs: [staggerMs, 0, 300, 1] as Tuple,
  /** How far below its place each unit starts (px; masked presets start one line down). */
  distance: [distance, 0, 160, 1] as Tuple,
  /** Overshoot, tilt and squash strength (0 = none). */
  playfulness: [playfulness, 0, 2, 0.05] as Tuple,
})

export const storyEntranceDials = () => ({
  heading: group('wave', 120, 900, 22, 40, 1, HEADING_PRESETS),
  /** Starts after its delay regardless of the heading; staggers per line. */
  body: group('lines', 380, 650, 55, 16, 0.3, BODY_PRESETS),
  replay: { type: 'action' as const, label: 'Replay' },
})

export type EntranceSettings = { preset: string; delayMs: number; durationMs: number; staggerMs: number; distance: number; playfulness: number }

const BACK_OUT = (p: number) => `cubic-bezier(0.34, ${(1 + 0.56 * p).toFixed(2)}, 0.64, 1)`
const EXPO_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)'
const RISE = 'cubic-bezier(0.2, 0.7, 0.4, 1)'
const SWAY = 'ease-in-out'

function keyframes(preset: Preset, d: number, p: number): { frames: Keyframe[]; easing: string } {
  switch (preset) {
    case 'pop':
      return { frames: [{ opacity: 0, transform: `translateY(${d}px) scale(${1 - 0.3 * p})` }, { opacity: 1, transform: 'none' }], easing: BACK_OUT(p) }
    case 'bounce':
    case 'wave':
      return {
        frames: [
          { opacity: 0, transform: `translateY(${d}px)`, easing: RISE },
          { opacity: 1, transform: `translateY(${-0.32 * d * p}px)`, offset: 0.42, easing: SWAY },
          { transform: `translateY(${0.1 * d * p}px)`, offset: 0.68, easing: SWAY },
          { transform: `translateY(${-0.03 * d * p}px)`, offset: 0.86, easing: SWAY },
          { opacity: 1, transform: 'none' },
        ],
        easing: 'linear',
      }
    case 'tumble':
      return { frames: [{ opacity: 0, transform: `translateY(${d}px) rotate(${14 * p}deg)` }, { opacity: 1, transform: 'none' }], easing: BACK_OUT(p) }
    case 'jelly':
      return {
        frames: [
          { opacity: 0, transform: `translateY(${d}px) scale(${1 - 0.2 * p}, ${1 + 0.3 * p})`, easing: RISE },
          { opacity: 1, transform: `translateY(${-0.12 * d * p}px) scale(${1 + 0.12 * p}, ${1 - 0.12 * p})`, offset: 0.5, easing: SWAY },
          { transform: `scale(${1 - 0.04 * p}, ${1 + 0.05 * p})`, offset: 0.78, easing: SWAY },
          { opacity: 1, transform: 'none' },
        ],
        easing: 'linear',
      }
    case 'swing':
      return {
        frames: [{ opacity: 0, transform: `perspective(500px) translateY(${0.5 * d}px) rotateX(${-Math.min(90, 70 * p + 20)}deg)` }, { opacity: 1, transform: 'perspective(500px)' }],
        easing: BACK_OUT(p),
      }
    case 'balloon':
      return {
        frames: [
          { opacity: 0, transform: `translateY(${0.5 * d}px) scale(0.2)`, easing: RISE },
          { opacity: 1, transform: `scale(${1 + 0.18 * p})`, offset: 0.45, easing: SWAY },
          { transform: `scale(${1 - 0.07 * p})`, offset: 0.7, easing: SWAY },
          { transform: `scale(${1 + 0.02 * p})`, offset: 0.87, easing: SWAY },
          { opacity: 1, transform: 'none' },
        ],
        easing: 'linear',
      }
    case 'stretch':
      return {
        frames: [
          { opacity: 0, transform: `translateY(${d}px) scale(${1 - 0.3 * p}, ${1 + 0.9 * p})`, easing: RISE },
          { opacity: 1, transform: `scale(${1 + 0.15 * p}, ${1 - 0.2 * p})`, offset: 0.55, easing: SWAY },
          { opacity: 1, transform: 'none' },
        ],
        easing: 'linear',
      }
    case 'slot':
      return { frames: [{ transform: 'translateY(110%)' }, { transform: 'none' }], easing: BACK_OUT(p) }
    case 'lines':
      return { frames: [{ transform: 'translateY(110%)' }, { transform: 'none' }], easing: p > 0 ? BACK_OUT(p) : EXPO_OUT }
    case 'blur':
      return { frames: [{ opacity: 0, transform: `translateY(${d}px)`, filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], easing: EXPO_OUT }
    default: // rise, words
      return { frames: [{ opacity: 0, transform: `translateY(${d}px)` }, { opacity: 1, transform: 'none' }], easing: p > 0 ? BACK_OUT(p) : EXPO_OUT }
  }
}

/** A span pair: the outer box (mask), the inner one moves. */
function box(text: string | null, className: string, masked: boolean) {
  const outer = document.createElement('span')
  outer.className = className
  if (masked) outer.dataset.mask = ''
  const inner = document.createElement('span')
  inner.className = 'se-i'
  if (text !== null) inner.textContent = text
  outer.append(inner)
  return outer
}

/**
 * Swaps an element's text nodes for spans. Returns the animated pieces (in reading order),
 * the word each belongs to (for line grouping), and a restore function.
 */
function split(el: HTMLElement, unit: Unit, masked: boolean) {
  const original = [...el.childNodes]
  const height = el.getBoundingClientRect().height
  const pieces: HTMLElement[] = []
  const wordOf: HTMLElement[] = []
  const next: Node[] = []
  for (const node of original) {
    if (node.nodeType !== Node.TEXT_NODE) {
      // An inline element (a text link) rises as one word; <br>s stay put. `original` keeps it,
      // so `restore` moves it back out of its box.
      if (node instanceof HTMLElement && node.tagName !== 'BR') {
        const piece = box(null, 'se-w', masked)
        piece.firstChild!.appendChild(node)
        pieces.push(piece)
        wordOf.push(piece)
        next.push(piece)
      } else next.push(node)
      continue
    }
    for (const token of (node.textContent ?? '').split(/(\s+)/)) {
      if (!token) continue
      if (/^\s+$/.test(token)) {
        next.push(document.createTextNode(token))
        continue
      }
      if (unit === 'letters') {
        const word = document.createElement('span')
        word.className = 'se-word'
        for (const char of token) {
          const letter = box(char, 'se-w', masked)
          word.append(letter)
          pieces.push(letter)
          wordOf.push(word)
        }
        next.push(word)
      } else {
        const word = box(token, 'se-w', masked)
        pieces.push(word)
        wordOf.push(word)
        next.push(word)
      }
    }
  }
  el.replaceChildren(...next)
  // Split letters lose kerning and run a hair wider; if that pushed a word onto a new line,
  // hold the original wrapping so the text doesn't jump when it is put back.
  const whiteSpace = el.style.whiteSpace
  if (el.getBoundingClientRect().height > height + 1) el.style.whiteSpace = 'nowrap'
  // Only put the text back if nothing else rewrote the element meanwhile (a live edit).
  const restore = () => {
    el.style.whiteSpace = whiteSpace
    if (pieces[0]?.isConnected && el.contains(pieces[0])) el.replaceChildren(...original)
  }
  return { pieces, wordOf, restore }
}

/** Starts one element's run; returns cancel/restore and a finished promise. */
function play(el: HTMLElement, s: EntranceSettings) {
  const preset = s.preset as Preset
  const unit = UNIT[preset] ?? 'words'
  const { pieces, wordOf, restore } = split(el, unit, MASKED.has(preset))
  const { frames, easing } = keyframes(preset, s.distance, s.playfulness)

  // Order index per piece: its own position; line presets use the rendered row, and body
  // `words` paces by row too (words sweep along each line), so long copy never drags.
  const order: number[] = []
  if (unit === 'lines' || preset === 'words') {
    let row = -1
    let col = 0
    let top = Number.NaN
    for (const word of wordOf) {
      const y = word.getBoundingClientRect().top
      if (!(Math.abs(y - top) < 4)) {
        row++
        col = 0
        top = y
      }
      order.push(unit === 'lines' ? row : row + 0.12 * col++)
    }
  } else pieces.forEach((_, i) => order.push(i))

  const animations = pieces.map((piece, i) =>
    piece.firstElementChild!.animate(frames, {
      duration: s.durationMs,
      delay: s.delayMs + order[i] * s.staggerMs,
      easing,
      fill: 'backwards',
    }),
  )
  const finished = Promise.all(animations.map((a) => a.finished)).then(restore, () => {})
  const cancel = () => {
    animations.forEach((a) => a.cancel())
    restore()
  }
  return { finished, cancel }
}

/**
 * Runs `heading` on the element matching `headingSelector` and `body` on `bodySelector`
 * (inside `root`). Replays when either preset changes or `run` increments; other dials apply
 * to the next run.
 */
export function useStoryEntrance(
  root: RefObject<HTMLElement | null>,
  targets: { heading: string; body: string },
  settings: { heading: EntranceSettings; body: EntranceSettings },
  run: number,
) {
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  useLayoutEffect(() => {
    const host = root.current
    if (!host || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const runs: { finished: Promise<void>; cancel: () => void }[] = []
    for (const key of ['heading', 'body'] as const) {
      const s = settingsRef.current[key]
      const el = host.querySelector<HTMLElement>(targets[key])
      if (el && s.preset !== 'soft' && s.preset !== 'none') runs.push(play(el, s))
    }
    let done = false
    void Promise.all(runs.map((r) => r.finished)).then(() => (done = true))
    return () => {
      if (!done) runs.forEach((r) => r.cancel())
    }
  }, [root, targets.heading, targets.body, settings.heading.preset, settings.body.preset, run])
}
