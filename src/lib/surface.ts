/**
 * Whether the page behind a point is light: the topmost opaque background in the paint stack
 * under it, skipping `skip` (the element asking) and full-page overlays. The stack (not each
 * hit's ancestors) catches sibling backdrop layers. `pass` lets hits inside matching elements
 * through, to read the section behind them (e.g. the page behind a project card). Null when
 * nothing opaque is found, so callers keep their last answer.
 */
export function isLightUnder(skip: Element, x: number, y: number, pass?: string): boolean | null {
  for (const hit of document.elementsFromPoint(x, y)) {
    // Momo zoom, Davebot and the dev-only DialKit panel (and its popovers) sit over the page only briefly.
    if (skip.contains(hit) || hit.closest('.momo-zoom, .davebot-layer, [class*="dialkit-"]') || (pass && hit.closest(pass))) continue
    // The opaque <body> always sits above <html>, so a hit that reaches <html> is a View
    // Transition, where every hit lands on the root and its dark fill says nothing about the page.
    if (hit === document.documentElement) return null
    const match = getComputedStyle(hit).backgroundColor.match(/[\d.]+/g)
    if (!match || (match.length > 3 && Number(match[3]) < 0.5)) continue
    const [r, g, b] = match.map(Number)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 140
  }
  return null
}
