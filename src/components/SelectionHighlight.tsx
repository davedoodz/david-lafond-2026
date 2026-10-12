/**
 * Draws the text-selection fill (see `.selection-hl` in global.css).
 *
 * Boxes come from each selected text run's client rects, which span the font's
 * full ascent–descent, so descenders are always inside the fill. All boxes live
 * in one `difference`-blended layer: overlaps between lines merge instead of
 * covering each other, and white text (dark surfaces) lands black on a light
 * block while black text (light surfaces) lands white on a dark one.
 *
 * Boxes are placed in document coordinates, so scrolling needs no redraw.
 */
import { useEffect, useLayoutEffect, useRef } from 'react'
import { useRoute } from '../lib/router'
import { useTuning } from '../tuning/useTuning'

const FIELD_SELECTOR = 'input, textarea'

type Tuple = [number, number, number, number]

/** DialKit "Selection": the shape of each highlight block. */
const SELECTION_CONFIG = {
  /** Block height as a multiple of the text's line box (font ascent to descent). */
  height: [1, 0.3, 1.6, 0.01] as Tuple,
  /** Extra px above and below each block. 3 closes the seam between wrapped lines at height 1. */
  padY: [3, 0, 16, 0.5] as Tuple,
  /** Extra px left and right of each block. */
  padX: [3, 0, 16, 0.5] as Tuple,
  /** Moves every block down (+) or up (−), in px. */
  offsetY: [0, -20, 20, 0.5] as Tuple,
}

function collectRects(range: Range, out: DOMRect[]): void {
  const root = range.commonAncestorContainer
  const textNodes: Text[] = []
  if (root.nodeType === Node.TEXT_NODE) {
    textNodes.push(root as Text)
  } else {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (range.intersectsNode(node)) textNodes.push(node as Text)
    }
  }

  const part = document.createRange()
  for (const node of textNodes) {
    const parent = node.parentElement
    // Whitespace-only nodes still count: the space between words in separate
    // inline elements (I’m <em>David</em>) would otherwise leave a gap.
    // Collapsed whitespace has no client rects, so it adds nothing.
    if (!parent || !node.data) continue
    if (getComputedStyle(parent).userSelect === 'none') continue
    part.selectNodeContents(node)
    if (node === range.startContainer) part.setStart(node, range.startOffset)
    if (node === range.endContainer) part.setEnd(node, range.endOffset)
    if (part.collapsed) continue
    for (const rect of part.getClientRects()) {
      if (rect.width >= 1 && rect.height >= 1) out.push(rect)
    }
  }
}

export function SelectionHighlight() {
  const hostRef = useRef<HTMLDivElement>(null)
  const route = useRoute()
  const tuning = useTuning('Selection', SELECTION_CONFIG)
  const tuningRef = useRef(tuning)
  tuningRef.current = tuning
  const redrawRef = useRef<(() => void) | null>(null)

  // The overlay is mounted above every route, so stale selection rectangles would
  // otherwise survive into the incoming page (and its View Transition snapshot).
  // A layout effect runs inside flushSync's route commit, before that snapshot.
  useLayoutEffect(() => {
    document.getSelection()?.removeAllRanges()
    hostRef.current?.replaceChildren()
  }, [route])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let raf = 0

    const draw = (): void => {
      raf = 0
      const rects: DOMRect[] = []
      const selection = document.getSelection()
      const inField = document.activeElement?.matches(FIELD_SELECTOR) ?? false
      if (selection && !selection.isCollapsed && !inField) {
        for (let i = 0; i < selection.rangeCount; i += 1) collectRects(selection.getRangeAt(i), rects)
      }

      // Each block is centred on its line box and scaled by the height dial. The
      // padding overlaps the font's line-box rounding: client rects can leave a
      // 2–3px seam between wrapped lines even after outward integer rounding.
      const { height, padX, padY, offsetY } = tuningRef.current
      while (host.childElementCount > rects.length) host.lastElementChild!.remove()
      while (host.childElementCount < rects.length) host.appendChild(document.createElement('div'))
      const { scrollX, scrollY } = window
      rects.forEach((rect, i) => {
        const box = host.children[i] as HTMLDivElement
        const half = (rect.height * height) / 2 + padY
        const centre = rect.top + rect.height / 2 + scrollY + offsetY
        const left = Math.floor(rect.left + scrollX - padX)
        const top = Math.floor(centre - half)
        const right = Math.ceil(rect.right + scrollX + padX)
        const bottom = Math.ceil(centre + half)
        box.style.cssText = `left:${left}px;top:${top}px;width:${right - left}px;height:${bottom - top}px`
      })
    }
    const schedule = (): void => {
      if (!raf) raf = requestAnimationFrame(draw)
    }
    redrawRef.current = schedule

    document.addEventListener('selectionchange', schedule)
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(raf)
      redrawRef.current = null
      document.removeEventListener('selectionchange', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [])

  // A dial change reshapes the current selection live.
  useEffect(() => {
    redrawRef.current?.()
  }, [tuning.height, tuning.padX, tuning.padY, tuning.offsetY])

  return <div ref={hostRef} className="selection-hl" aria-hidden="true" />
}
