/**
 * Text bound to a tuning value. In dev it is directly editable on the page
 * (plaintext, newlines preserved) and every keystroke writes back through the
 * DialKit controller — so layout below reflows live and the copy autosaves to
 * src/data/tuning.json. In production it is plain text.
 */
import { createElement, useLayoutEffect, useRef, type FormEvent } from 'react'

type Props = {
  as?: 'p' | 'h1' | 'h2' | 'h3' | 'div'
  value: string
  onChange: (next: string) => void
  className?: string
  id?: string
  label: string
  /** Entrance order (`data-enter`, see src/lib/useEntrance.ts). */
  enter?: number
}

export function EditableText({ as = 'div', value, onChange, className, id, label, enter }: Props) {
  const ref = useRef<HTMLElement>(null)

  // Only push external edits (DialKit panel) into the DOM, never the user's own
  // keystrokes, so the caret never jumps. Layout effect: the text is in place before paint
  // and before parent layout effects (the About story entrance splits it into words).
  useLayoutEffect(() => {
    const el = ref.current
    if (el && el.innerText !== value) el.innerText = value
  }, [value])

  if (!import.meta.env.DEV) return createElement(as, { className, id, 'data-enter': enter }, value)

  return createElement(as, {
    ref,
    id,
    'data-enter': enter,
    className: `${className ?? ''} is-editable`,
    contentEditable: 'plaintext-only',
    suppressContentEditableWarning: true,
    spellCheck: true,
    'aria-label': `${label} (editable in dev)`,
    onInput: (event: FormEvent<HTMLElement>) => onChange((event.currentTarget as HTMLElement).innerText),
  })
}
