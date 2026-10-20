/**
 * Measuring painted text and boxes as they will sit once load-in and reveal animations settle, for
 * layout fits that run while those animations are still playing.
 */

/** Painted box of an element's text (its font's line boxes). */
export function textRect(el: Element) {
  const range = document.createRange()
  range.selectNodeContents(el)
  const rect = range.getBoundingClientRect()
  range.detach()
  return rect
}

/** Font metrics of an element's text: line box ascent and descent, and the capital height. */
let metricsCanvas: CanvasRenderingContext2D | null = null
export function fontMetrics(el: Element) {
  metricsCanvas ||= document.createElement('canvas').getContext('2d')
  const ctx = metricsCanvas!
  const s = getComputedStyle(el)
  ctx.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`
  const m = ctx.measureText('I')
  return { ascent: m.fontBoundingBoxAscent, descent: m.fontBoundingBoxDescent, cap: m.actualBoundingBoxAscent }
}

/**
 * Vertical offset load-ins add right now: the `translate` and `transform` of the element and its
 * ancestors while an animation runs on them (useEntrance's data-enter, useReveal). Standing
 * transforms (dials, the signature's offset) are kept.
 */
function entering(el: Element) {
  let dy = 0
  for (let e: Element | null = el; e && e !== document.body; e = e.parentElement) {
    if (!e.getAnimations().length) continue
    const style = getComputedStyle(e)
    if (style.translate !== 'none') dy += parseFloat(style.translate.split(' ')[1] ?? '0') || 0
    if (style.transform !== 'none') dy += new DOMMatrix(style.transform).m42
  }
  return dy
}

/** A box as it will sit once the load-in settles. */
export function settled(el: Element, rect: DOMRect = el.getBoundingClientRect()) {
  const dy = entering(el)
  return { left: rect.left, right: rect.right, top: rect.top - dy, bottom: rect.bottom - dy }
}

/** Where an element's first capitals start, once settled. */
export function capTop(el: Element) {
  const m = fontMetrics(el)
  return settled(el, textRect(el)).top + m.ascent - m.cap
}
