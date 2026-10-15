/**
 * Live Work-page hero intro: two sentences whose key phrases are interactive "sticker" pills
 * (cities, labs, products, faster) that each cycle through David's chosen alternate phrasings.
 *
 * Frozen from the studio.work-stickers study (scripts/export-work-stickers.mjs) into
 * ./workStickers.live.json, and sharing the study's framework-free motion engine (./engine.js) so
 * pills land, hover, and loop exactly as they do there. No DialKit, editor, or local persistence
 * ships here — just the engine's render/hover/turn/loop bound to this frozen config.
 */
import { Fragment, useLayoutEffect, useRef, type CSSProperties } from 'react'
import { createLoopScheduler, createStickerEngine, turn as engineTurn, type Look, type StickerRecord } from './engine.js'
import config from './workStickers.live.json'
import './WorkIntroStickers.css'

type LiveStickers = typeof config.stickers
type LiveSticker = LiveStickers[keyof LiveStickers]
type Token = { type: 'text'; text: string } | { type: 'sticker'; id: string }

const look = config.look as Look
const paragraphs = config.paragraphs as Token[][]

function buildValues(sticker: LiveSticker): StickerRecord['values'] {
  const values: StickerRecord['values'] = { face: 'Face 1', timing: sticker.timing }
  sticker.faces.forEach((face, i) => { values[`face${i + 1}`] = face })
  return values
}

interface Parts {
  button?: HTMLButtonElement
  icon?: HTMLSpanElement
  label?: HTMLSpanElement
}

export function WorkIntroStickers() {
  const partsRef = useRef<Record<string, Parts>>({})

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

    return () => {
      controller.abort()
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

  return (
    <>
      {paragraphs.map((paragraph, p) => (
        <p key={p} className="hero__intro work-intro-stickers__p" data-enter="1" data-selectable>
          {paragraph.map((token, i) =>
            token.type === 'text' ? (
              <Fragment key={i}>{token.text}</Fragment>
            ) : (
              <button
                key={i}
                type="button"
                className="ws-pill"
                style={{ '--pill': look.appearance.pill, '--icon-scale': look.appearance.stickerScale } as CSSProperties}
                ref={bindPart(token.id, 'button')}
              >
                <span className="ws-pill-art" aria-hidden="true" ref={bindPart(token.id, 'icon')} />
                <span className="ws-pill-text" aria-hidden="true" ref={bindPart(token.id, 'label')} />
              </button>
            ),
          )}
        </p>
      ))}
    </>
  )
}
