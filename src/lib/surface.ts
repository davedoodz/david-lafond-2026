/**
 * Whether the page behind a point is light: the topmost opaque background in the paint stack
 * under it, skipping `skip` (the element asking) and full-page overlays. The stack (not each
 * hit's ancestors) catches sibling backdrop layers. Null when nothing opaque is found.
 */
export function isLightUnder(skip: Element, x: number, y: number): boolean | null {
  for (const hit of document.elementsFromPoint(x, y)) {
    // Momo zoom and Davebot sit over the page only briefly.
    if (skip.contains(hit) || hit.closest('.momo-zoom, .davebot-layer')) continue
    const match = getComputedStyle(hit).backgroundColor.match(/[\d.]+/g)
    if (!match || (match.length > 3 && Number(match[3]) < 0.5)) continue
    const [r, g, b] = match.map(Number)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 140
  }
  return null
}
