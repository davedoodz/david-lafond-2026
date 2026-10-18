/**
 * Text bound to a tuning value. In dev it is directly editable on the page
 * (plaintext, newlines preserved) and every keystroke writes back through the
 * DialKit controller — so layout below reflows live and the copy autosaves to
 * src/data/tuning.json. In production it is plain text.
 *
 * `links` turn the first occurrence of each phrase into an underlined link that opens in a
 * new tab, with an up-right arrow on hover. The copy itself stays plain text, so editing it
 * never touches link markup.
 */
import { createElement, useLayoutEffect, useRef, type FormEvent, type MouseEvent, type ReactNode } from 'react'
import { ARROW_UP_RIGHT_PATH, ArrowUpRightIcon } from './icons'

export type TextLink = { text: string; href: string }

type Props = {
  as?: 'p' | 'h1' | 'h2' | 'h3' | 'div' | 'span'
  value: string
  onChange: (next: string) => void
  className?: string
  id?: string
  label: string
  /** Entrance order (`data-enter`, see src/lib/useEntrance.ts). */
  enter?: number
  /** Visitor-facing copy that may be highlighted/copied. */
  selectable?: boolean
  links?: readonly TextLink[]
}

/** Clearing a contentEditable leaves a stray newline; whitespace-only copy counts as empty, so CSS `:empty` can collapse it. */
const clean = (text: string) => (text.trim() ? text : '')

const LINK_CLASS = 'text-link'
const ARROW_CLASS = 'text-link__arrow'
const usable = (links: readonly TextLink[] | undefined) => (links ?? []).filter((link) => link.text.trim() && link.href.trim())

/** Production: the copy split into plain runs and links (first occurrence of each phrase). */
function linked(text: string, links: readonly TextLink[]): ReactNode[] {
  const out: ReactNode[] = []
  let rest = text
  const pending = [...links]
  while (pending.length) {
    let best = -1
    let at = Infinity
    pending.forEach((link, i) => {
      const found = rest.indexOf(link.text)
      if (found !== -1 && found < at) [best, at] = [i, found]
    })
    if (best === -1) break
    const [link] = pending.splice(best, 1)
    out.push(rest.slice(0, at))
    out.push(
      <a key={out.length} className={LINK_CLASS} href={link.href} target="_blank" rel="noopener noreferrer">
        {link.text}
        <ArrowUpRightIcon className={ARROW_CLASS} />
      </a>,
    )
    rest = rest.slice(at + link.text.length)
  }
  out.push(rest)
  return out
}

/** Dev: the same link, built in the DOM; it is an uneditable island inside the editable text. */
function linkElement(link: TextLink) {
  const a = document.createElement('a')
  a.className = LINK_CLASS
  a.href = link.href
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  a.contentEditable = 'false'
  a.textContent = link.text
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('class', ARROW_CLASS)
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('aria-hidden', 'true')
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('fill', 'currentColor')
  path.setAttribute('d', ARROW_UP_RIGHT_PATH)
  svg.append(path)
  a.append(svg)
  return a
}

/** Dev: makes the element's links match `links` — unwraps stale ones, wraps missing ones. Idempotent. */
function syncLinks(el: HTMLElement, links: readonly TextLink[]) {
  for (const a of el.querySelectorAll<HTMLAnchorElement>(`a.${LINK_CLASS}`)) {
    const keep = links.some((link) => a.getAttribute('href') === link.href && a.textContent === link.text)
    if (!keep) a.replaceWith(a.textContent ?? '')
  }
  el.normalize()
  for (const link of links) {
    const wrapped = [...el.querySelectorAll<HTMLAnchorElement>(`a.${LINK_CLASS}`)].some((a) => a.textContent === link.text)
    if (wrapped) continue
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      if (node.parentElement?.closest(`a.${LINK_CLASS}`)) continue
      const at = node.data.indexOf(link.text)
      if (at === -1) continue
      const match = node.splitText(at)
      match.splitText(link.text.length)
      match.replaceWith(linkElement(link))
      break
    }
  }
}

export function EditableText({ as = 'div', value, onChange, className, id, label, enter, selectable, links }: Props) {
  const ref = useRef<HTMLElement>(null)
  const text = clean(value)
  const active = usable(links)
  const linksKey = JSON.stringify(active)

  // Only push external edits (DialKit panel) into the DOM, never the user's own
  // keystrokes, so the caret never jumps. Layout effect: the text is in place before paint
  // and before parent layout effects (the About story entrance splits it into words).
  useLayoutEffect(() => {
    const el = ref.current
    if (el && clean(el.innerText) !== text) el.innerText = text
    // A cleared field keeps the browser's placeholder <br>; drop it so the element is truly empty.
    else if (el && !text && el.childNodes.length && document.activeElement !== el) el.replaceChildren()
    if (el && import.meta.env.DEV) syncLinks(el, JSON.parse(linksKey) as TextLink[])
  }, [text, linksKey])

  if (!import.meta.env.DEV) {
    return createElement(as, { className, id, 'data-enter': enter, 'data-selectable': selectable || undefined }, active.length ? linked(text, active) : text)
  }

  return createElement(as, {
    ref,
    id,
    'data-enter': enter,
    'data-selectable': selectable || undefined,
    className: `${className ?? ''} is-editable`,
    contentEditable: 'plaintext-only',
    suppressContentEditableWarning: true,
    spellCheck: true,
    'aria-label': `${label} (editable in dev)`,
    onInput: (event: FormEvent<HTMLElement>) => onChange(clean((event.currentTarget as HTMLElement).innerText)),
    // Links inside editable text don't follow on click; open them the way production does.
    onClick: (event: MouseEvent<HTMLElement>) => {
      const link = (event.target as Element).closest<HTMLAnchorElement>(`a.${LINK_CLASS}`)
      if (!link) return
      event.preventDefault()
      window.open(link.href, '_blank', 'noopener,noreferrer')
    },
    // Leaving a cleared field drops the browser's placeholder <br>, so the field collapses.
    onBlur: (event: FormEvent<HTMLElement>) => {
      if (!clean(event.currentTarget.innerText)) event.currentTarget.replaceChildren()
    },
  })
}
