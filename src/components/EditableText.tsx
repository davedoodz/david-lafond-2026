/**
 * Text bound to a tuning value. In dev it is directly editable on the page
 * (plaintext, newlines preserved) and every keystroke writes back through the
 * DialKit controller — so layout below reflows live and the copy autosaves to
 * src/data/tuning.json. In production it is plain text.
 */
import { createElement, useLayoutEffect, useRef, type FormEvent } from 'react'

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
}

/** Clearing a contentEditable leaves a stray newline; whitespace-only copy counts as empty, so CSS `:empty` can collapse it. */
const clean = (text: string) => (text.trim() ? text : '')

export function EditableText({ as = 'div', value, onChange, className, id, label, enter, selectable }: Props) {
  const ref = useRef<HTMLElement>(null)
  const text = clean(value)

  // Only push external edits (DialKit panel) into the DOM, never the user's own
  // keystrokes, so the caret never jumps. Layout effect: the text is in place before paint
  // and before parent layout effects (the About story entrance splits it into words).
  useLayoutEffect(() => {
    const el = ref.current
    if (el && clean(el.innerText) !== text) el.innerText = text
    // A cleared field keeps the browser's placeholder <br>; drop it so the element is truly empty.
    else if (el && !text && el.childNodes.length && document.activeElement !== el) el.replaceChildren()
  }, [text])

  if (!import.meta.env.DEV) return createElement(as, { className, id, 'data-enter': enter, 'data-selectable': selectable || undefined }, text)

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
    // Leaving a cleared field drops the browser's placeholder <br>, so the field collapses.
    onBlur: (event: FormEvent<HTMLElement>) => {
      if (!clean(event.currentTarget.innerText)) event.currentTarget.replaceChildren()
    },
  })
}
