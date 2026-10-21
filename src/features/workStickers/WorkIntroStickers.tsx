/**
 * Live Work-page hero intro: two sentences whose key phrases are interactive "sticker" pills
 * (cities, labs, products, faster) that each cycle through David's chosen alternate phrasings.
 *
 * Frozen from the studio.work-stickers study (scripts/export-work-stickers.mjs) into
 * ./workStickers.live.json, and sharing the study's framework-free motion engine (./engine.js) so
 * pills land, hover, and loop exactly as they do there. No DialKit, editor, or local persistence
 * ships here — just the engine's render/hover/turn/loop bound to this frozen config.
 */
import { Fragment, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createLoopScheduler, createStickerEngine, turn as engineTurn, type Look, type StickerRecord } from './engine.js'
import config from './workStickers.live.json'
import { TOUCH_LANDING } from '../../lib/touchLanding'
import { bindIntroSelection } from './introSelection'
import './WorkIntroStickers.css'

type LiveStickers = typeof config.stickers
type LiveSticker = LiveStickers[keyof LiveStickers]
type Token = { type: 'text'; text: string } | { type: 'sticker'; id: string }

const look = config.look as Look

/** The authored intro as editable text: one string per paragraph, `{id}` marks a pill, newlines break lines. */
export const DEFAULT_INTRO_TEXT = (config.paragraphs as Token[][]).map(paragraph =>
  paragraph.map(token => (token.type === 'text' ? token.text : `{${token.id}}`)).join(''),
)

/** Parses editable intro text back into tokens. Unknown or repeated `{id}`s stay literal text. */
function parseIntro(text: string, used: Set<string>): Token[] {
  return text.split(/(\{\w+\})/).flatMap((part): Token[] => {
    const id = /^\{(\w+)\}$/.exec(part)?.[1]
    if (id && id in config.stickers && !used.has(id)) {
      used.add(id)
      return [{ type: 'sticker', id }]
    }
    return part ? [{ type: 'text', text: part }] : []
  })
}

function buildValues(sticker: LiveSticker): StickerRecord['values'] {
  const values: StickerRecord['values'] = { face: 'Face 1', timing: sticker.timing }
  sticker.faces.forEach((face, i) => { values[`face${i + 1}`] = face })
  return values
}

/** Decoded sticker artwork by URL. The images stay referenced so the browser keeps them decoded. */
const decodedArt = new Map<string, { image: HTMLImageElement; ready: Promise<void> }>()
function faceImage(face: { image?: string } | undefined): Promise<void> {
  const src = face?.image
  if (!src) return Promise.resolve()
  let entry = decodedArt.get(src)
  if (!entry) {
    const image = new Image()
    image.src = src
    entry = { image, ready: image.decode().catch(() => {}) }
    decodedArt.set(src, entry)
  }
  return entry.ready
}

interface Parts {
  button?: HTMLButtonElement
  icon?: HTMLSpanElement
  label?: HTMLSpanElement
}

/** `text` is the intro, one string per paragraph (see DEFAULT_INTRO_TEXT); the parent should remount
 * this component (via `key`) when it changes so the engine rebinds to the new pills.
 * `align="center"` centres every line on the hero column; long lines spill evenly to both sides.
 * Text size comes from the parent (--intro-size-*); pills and stickers are sized in em, so they scale
 * with it. The parent also keeps every line fitting (WorkPage's useHeroFit, with the helpers below). */
export function WorkIntroStickers({ text = DEFAULT_INTRO_TEXT, align = 'left' }: { text?: string[]; align?: 'left' | 'center' }) {
  const [paragraphs] = useState(() => {
    const used = new Set<string>()
    return text.filter(paragraph => paragraph.trim()).map(paragraph => parseIntro(paragraph, used))
  })
  const partsRef = useRef<Record<string, Parts>>({})
  const paragraphsRef = useRef<HTMLParagraphElement[]>([])

  useLayoutEffect(() => {
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
    const engine = createStickerEngine({ getLook: () => look, reducedMotion })
    const controller = new AbortController()
    const records: StickerRecord[] = []

    const setFace = (record: StickerRecord, label: string) => {
      record.values.face = label
      engine.render(record)
    }

    for (const [id, sticker] of Object.entries(config.stickers) as [string, LiveSticker][]) {
      const parts = partsRef.current[id]
      if (!parts?.button || !parts.icon || !parts.label) continue
      const record: StickerRecord = {
        id,
        button: parts.button,
        icon: parts.icon,
        label: parts.label,
        values: buildValues(sticker),
        faceCount: sticker.faces.length,
        current: '',
        imageKey: '',
        animations: [],
        revision: 0,
        ariaLabel: (text) => `${text}. Show another phrase`,
      }
      records.push(record)
      engine.render(record)

      const { signal } = controller
      parts.button.addEventListener('click', () => engineTurn(record, setFace), { signal })
      parts.button.addEventListener('pointerenter', () => engine.hover(record, true), { signal })
      parts.button.addEventListener('pointerleave', () => engine.hover(record, false), { signal })
      parts.button.addEventListener('focus', () => engine.hover(record, true), { signal })
      parts.button.addEventListener('blur', () => engine.hover(record, false), { signal })
    }

    // Mobile: each line keeps the width it has with every pill at its longest phrase, so a turn never
    // moves the copy, the column or the nav, while the pill itself hugs the phrase it shows.
    const lockMobileWidths = () => {
      for (const line of paragraphsRef.current.flatMap(p => (p ? Array.from(p.querySelectorAll<HTMLElement>('.ws-line')) : []))) {
        const em = parseFloat(getComputedStyle(line).fontSize)
        line.style.setProperty('--ws-line-width', `${(reservedLineWidth(line) / em).toFixed(4)}em`)
      }
    }
    lockMobileWidths()
    void document.fonts.ready.then(() => { if (!controller.signal.aborted) lockMobileWidths() })
    document.fonts.addEventListener('loadingdone', lockMobileWidths, { signal: controller.signal })

    const loop = createLoopScheduler({
      list: () => records,
      turn: (record) => engineTurn(record, setFace),
      // A pill being hovered or focused keeps its face; the loop moves on to the next one.
      skip: (record) => record.button.matches(':hover, :focus-visible'),
      getTiming: (record) => ({
        duration: record.values.timing.duration,
        hold: record.values.timing.hold,
        letterSpeed: record.values.timing.letterSpeed * look.motion.letterSpeed,
      }),
      loopEnabled: () => look.motion.loop,
      reducedMotion,
      isHidden: () => document.hidden,
    })
    document.addEventListener('visibilitychange', () => loop.schedule(), { signal: controller.signal })
    reducedMotion.addEventListener('change', () => {
      // Force every pill to repaint instantly (no leave/enter animation) under the new preference.
      for (const record of records) { record.current = ''; engine.render(record) }
      loop.schedule()
    }, { signal: controller.signal })
    loop.schedule()

    const paragraphElements = paragraphsRef.current.filter(Boolean)

    // Every face's artwork decodes now, so a turn never lands on an empty sticker, and the intro holds
    // its entrance (data-art-pending, WorkIntroStickers.css) until the faces it opens on are ready.
    // Their downloads start with the HTML (vite.config.ts, stickerPreload). A failed image releases
    // too; the cap only guards a stalled connection from hiding the copy.
    for (const sticker of Object.values(config.stickers) as LiveSticker[]) for (const face of sticker.faces) faceImage(face)
    const opening = records.map(record => faceImage((config.stickers as Record<string, LiveSticker>)[record.id].faces[0]))
    for (const p of paragraphElements) p.setAttribute('data-art-pending', '')
    const release = () => { for (const p of paragraphElements) p.removeAttribute('data-art-pending') }
    const cap = setTimeout(release, 6000)
    void Promise.all(opening).then(() => { clearTimeout(cap); release() })

    const recordsByButton = new Map(records.map(record => [record.button as HTMLElement, record]))
    bindIntroSelection(paragraphElements, pill => recordsByButton.get(pill)?.current ?? pill.textContent ?? '', controller.signal)

    return () => {
      controller.abort()
      clearTimeout(cap)
      loop.stop()
      for (const record of records) {
        record.animations.forEach(a => a.stop())
        record.hoverAnimation?.stop()
      }
    }
  }, [])

  function bindPart<K extends keyof Parts>(id: string, key: K) {
    return (el: NonNullable<Parts[K]> | null) => {
      const parts = (partsRef.current[id] ??= {})
      if (el) parts[key] = el
      else delete parts[key]
    }
  }
  function bindParagraph(index: number) {
    return (el: HTMLParagraphElement | null) => {
      if (el) paragraphsRef.current[index] = el
      else delete paragraphsRef.current[index]
    }
  }

  return (
    <>
      {paragraphs.map((paragraph, p) => (
        // Selectable, with its own highlight band (introSelection.ts, data-hl-local); data-fit-ignore keeps
        // the pills' changing widths from resizing and re-centering the hero column (useFitColumn).
        <p
          key={p}
          className="hero__intro work-intro-stickers__p"
          data-enter="1"
          data-selectable
          data-hl-local
          data-fit-ignore
          data-align={align}
          ref={bindParagraph(p)}
        >
          {toLines(paragraph).map((line, l) => (
            <span key={l} className="ws-line">
              {line.map((token, i) =>
                token.type === 'text' ? (
                  <Fragment key={i}>{token.text}</Fragment>
                ) : (
                  <button
                    key={i}
                    type="button"
                    className="ws-pill"
                    data-pill={token.id}
                    style={{ '--pill': look.appearance.pill, '--icon-scale': look.appearance.stickerScale } as CSSProperties}
                    ref={bindPart(token.id, 'button')}
                  >
                    <span className="ws-pill-art" aria-hidden="true" ref={bindPart(token.id, 'icon')} />
                    <span className="ws-pill-text" aria-hidden="true" ref={bindPart(token.id, 'label')} />
                  </button>
                ),
              )}
            </span>
          ))}
        </p>
      ))}
    </>
  )
}

/** Splits a paragraph at its authored line breaks; each line then renders unbroken. */
function toLines(paragraph: Token[]): Token[][] {
  const lines: Token[][] = [[]]
  for (const token of paragraph) {
    if (token.type !== 'text') { lines[lines.length - 1].push(token); continue }
    token.text.split('\n').forEach((part, i) => {
      if (i > 0) lines.push([])
      if (part) lines[lines.length - 1].push({ type: 'text', text: part })
    })
  }
  // Spaces next to a break would hang at a line's edge.
  for (const line of lines) {
    const first = line[0], last = line[line.length - 1]
    if (first?.type === 'text') first.text = first.text.trimStart()
    if (last?.type === 'text') last.text = last.text.trimEnd()
  }
  return lines
}

/* Each line always stays on one line. Lines may run past the column into the free space on its
 * right; the parent shrinks the text when even that is too narrow. "Widest" assumes each pill shows
 * its longest phrase, so the size never jumps as pills turn. */
// Every phrase each pill can show, from the frozen config, with the padding (em) its artwork adds:
// the pill pads by 1.2em + gap + ends before the label and 0.15em + ends after it (CSS --art-pad,
// --text-pad), and the gap and ends change with the face.
const facesById = new Map(Object.entries(config.stickers).map(([id, sticker]) => [id, sticker.faces.map(face => ({ label: face.label.trim(), pad: face.gap + 2 * face.ends }))]))
/** Width (px) of an intro line with each pill showing its longest phrase: what a mobile line reserves. */
function reservedLineWidth(line: HTMLElement): number {
  const style = getComputedStyle(line)
  const probe = document.createElement('span')
  probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;pointer-events:none'
  probe.style.font = style.font
  probe.style.letterSpacing = style.letterSpacing
  probe.style.fontFeatureSettings = style.fontFeatureSettings
  const children = Array.from(line.childNodes)
  line.append(probe)
  let total = 0
  for (const child of children) {
    if (child instanceof HTMLElement && child.matches('.ws-pill')) {
      const em = parseFloat(getComputedStyle(child).fontSize)
      const widths = (facesById.get(child.dataset.pill!) ?? []).map(face => {
        probe.textContent = face.label
        return probe.getBoundingClientRect().width + (1.35 + face.pad) * em
      })
      total += Math.max(0, ...widths)
    } else {
      probe.textContent = child.textContent
      total += probe.getBoundingClientRect().width
    }
  }
  probe.remove()
  return total
}
/** Width of an intro line with each of its pills at its narrowest and at its widest face (phrase
 * plus padding). Phrases are measured in a hidden probe styled like the pill's label (canvas
 * ignores letter-spacing and over-measures). */
function lineSpan(line: HTMLElement): [number, number] {
  if (matchMedia(TOUCH_LANDING).matches) {
    // Mobile lines reserve their widest phrases; the animated letter spans are never fit inputs.
    const total = reservedLineWidth(line)
    return [total, total]
  }
  const width = line.getBoundingClientRect().width
  let min = width, max = width
  for (const pill of line.querySelectorAll<HTMLElement>('.ws-pill[data-pill]')) {
    const label = pill.querySelector<HTMLElement>('.ws-pill-text')
    if (!label) continue
    const style = getComputedStyle(label)
    const em = parseFloat(getComputedStyle(pill).fontSize)
    const pad = (v: string) => (parseFloat(pill.style.getPropertyValue(v)) || 0) * em
    const probe = document.createElement('span')
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;pointer-events:none'
    probe.style.font = style.font
    probe.style.letterSpacing = style.letterSpacing
    probe.style.fontFeatureSettings = style.fontFeatureSettings
    pill.append(probe)
    probe.textContent = label.textContent
    const shown = probe.getBoundingClientRect().width + pad('--gap') + 2 * pad('--ends')
    const widths = (facesById.get(pill.dataset.pill!) ?? []).map(f => { probe.textContent = f.label; return probe.getBoundingClientRect().width + f.pad * em })
    probe.remove()
    min += Math.min(shown, ...widths) - shown
    max += Math.max(shown, ...widths) - shown
  }
  return [min, max]
}
/**
 * How wide the sticker intro inside `scope` can get at its current font size, as its longest line:
 * `[narrowest, widest]` over every combination of phrases the pills can show.
 */
export function introLineSpan(scope: HTMLElement): [number, number] {
  const spans = Array.from(scope.querySelectorAll<HTMLElement>('.work-intro-stickers__p .ws-line'), lineSpan)
  return [Math.max(0, ...spans.map(s => s[0])), Math.max(0, ...spans.map(s => s[1]))]
}
