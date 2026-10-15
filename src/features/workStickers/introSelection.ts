/**
 * Text selection for the sticker intro: one continuous highlight band per line.
 *
 * The site's <SelectionHighlight> draws a block per text run, so a line mixing words and
 * pills came out stepped (pill and text boxes differ in height) and inverted the sticker
 * artwork (its layer sits above everything). Paragraphs marked `data-hl-local` are skipped
 * there and drawn here instead:
 *
 * - one block per `.ws-line`, the full line box tall, from the first to the last selected
 *   word or pill on that line, so lines in a paragraph meet exactly with no seams;
 * - the blocks live in a `difference`-blended layer inside the paragraph, under the
 *   stickers (`.sticker-art` stacks above it), so the artwork keeps its real colors while
 *   text and pills invert like the rest of the site's selection;
 * - a pill touched by the selection is lit whole, and copying puts its whole phrase on
 *   the clipboard, so what is copied always matches what is lit.
 */

const PAD_X = 3

export function bindIntroSelection(
  paragraphs: HTMLElement[],
  labelOf: (pill: HTMLElement) => string,
  signal: AbortSignal,
): void {
  const layers = new Map<HTMLElement, HTMLElement>()
  for (const p of paragraphs) {
    const layer = document.createElement('span')
    layer.className = 'ws-hl'
    layer.setAttribute('aria-hidden', 'true')
    p.append(layer)
    layers.set(p, layer)
  }
  signal.addEventListener('abort', () => layers.forEach(layer => layer.remove()))

  const currentRange = (): Range | null => {
    const selection = document.getSelection()
    if (!selection || selection.isCollapsed || !selection.rangeCount) return null
    const range = selection.getRangeAt(0)
    return paragraphs.some(p => range.intersectsNode(p)) ? range : null
  }

  let frame = 0
  const draw = () => {
    frame = 0
    const range = currentRange()
    for (const [p, layer] of layers) {
      const blocks: string[] = []
      if (range && range.intersectsNode(p)) {
        const origin = p.getBoundingClientRect()
        for (const line of p.querySelectorAll<HTMLElement>('.ws-line')) {
          const span = lineSpan(line, range)
          if (!span) continue
          const box = line.getBoundingClientRect()
          const left = Math.floor(span.left - origin.left - PAD_X)
          const right = Math.ceil(span.right - origin.left + PAD_X)
          blocks.push(`<span style="left:${left}px;top:${box.top - origin.top}px;width:${right - left}px;height:${box.height}px"></span>`)
        }
      }
      layer.innerHTML = blocks.join('')
    }
  }
  const schedule = () => { frame ||= requestAnimationFrame(draw) }

  document.addEventListener('selectionchange', schedule, { signal })
  addEventListener('resize', schedule, { signal })
  // Pills change width as they turn (and transition while they do); keep the band on them.
  const resize = new ResizeObserver(schedule)
  for (const p of paragraphs) p.querySelectorAll('.ws-pill').forEach(pill => resize.observe(pill))
  signal.addEventListener('abort', () => { resize.disconnect(); cancelAnimationFrame(frame) })

  // Double/triple clicks on a pill would select its word or the whole line; a pill click only turns it.
  for (const p of paragraphs) {
    p.addEventListener('mousedown', event => {
      if (event.detail > 1 && (event.target as Element).closest('.ws-pill')) event.preventDefault()
    }, { signal })
  }

  document.addEventListener('copy', event => {
    const range = currentRange()
    // A selection that runs past the intro keeps the browser's own copy.
    const inside = (node: Node) => paragraphs.some(p => p.contains(node))
    if (!range || !event.clipboardData || !inside(range.startContainer) || !inside(range.endContainer)) return
    const text = paragraphs
      .map(p => [...p.querySelectorAll<HTMLElement>('.ws-line')].map(line => lineText(line, range, labelOf)).filter(Boolean).join('\n'))
      .filter(Boolean)
      .join('\n\n')
    event.clipboardData.setData('text/plain', text)
    event.preventDefault()
  }, { signal })
}

/** Horizontal extent of the selection on one line: selected text runs plus every pill it touches. */
function lineSpan(line: HTMLElement, range: Range): { left: number; right: number } | null {
  if (!range.intersectsNode(line)) return null
  let left = Infinity
  let right = -Infinity
  const part = document.createRange()
  for (const node of line.childNodes) {
    if (!range.intersectsNode(node)) continue
    if (node instanceof HTMLElement && node.classList.contains('ws-pill')) {
      const box = node.getBoundingClientRect()
      left = Math.min(left, box.left)
      right = Math.max(right, box.right)
      continue
    }
    if (node.nodeType !== Node.TEXT_NODE) continue
    part.selectNodeContents(node)
    if (node === range.startContainer) part.setStart(node, range.startOffset)
    if (node === range.endContainer) part.setEnd(node, range.endOffset)
    for (const rect of part.getClientRects()) {
      if (rect.width < 1) continue
      left = Math.min(left, rect.left)
      right = Math.max(right, rect.right)
    }
  }
  return left < right ? { left, right } : null
}

/** One line's selected text, with each touched pill as its whole current phrase. */
function lineText(line: HTMLElement, range: Range, labelOf: (pill: HTMLElement) => string): string {
  let text = ''
  for (const node of line.childNodes) {
    if (!range.intersectsNode(node)) continue
    if (node instanceof HTMLElement && node.classList.contains('ws-pill')) { text += labelOf(node); continue }
    if (node.nodeType !== Node.TEXT_NODE) continue
    const data = (node as Text).data
    const start = node === range.startContainer ? range.startOffset : 0
    const end = node === range.endContainer ? range.endOffset : data.length
    text += data.slice(start, end)
  }
  return text.replace(/\s+/g, ' ').trim()
}
