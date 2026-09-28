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
import { useEffect, useRef } from 'react'

const FIELD_SELECTOR = 'input, textarea'

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
    if (!parent || !node.data.trim()) continue
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

      // Reuse box elements; round outward so neighbouring runs never leave a hairline seam.
      while (host.childElementCount > rects.length) host.lastElementChild!.remove()
      while (host.childElementCount < rects.length) host.appendChild(document.createElement('div'))
      const { scrollX, scrollY } = window
      rects.forEach((rect, i) => {
        const box = host.children[i] as HTMLDivElement
        const left = Math.floor(rect.left + scrollX)
        const top = Math.floor(rect.top + scrollY)
        box.style.cssText = `left:${left}px;top:${top}px;width:${Math.ceil(rect.right + scrollX) - left}px;height:${Math.ceil(rect.bottom + scrollY) - top}px`
      })
    }
    const schedule = (): void => {
      if (!raf) raf = requestAnimationFrame(draw)
    }

    document.addEventListener('selectionchange', schedule)
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('selectionchange', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [])

  return <div ref={hostRef} className="selection-hl" aria-hidden="true" />
}
