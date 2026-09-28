import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type MouseEvent } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from 'motion/react'
import type { ResolvedValues } from 'dialkit'
import { useTuning } from '../../tuning/useTuning'
import { navigate, type Route } from '../../lib/router'
import { DAVEBOT_CONFIG, DAVEBOT_PANEL } from './davebotConfig'
import { toMotionTransition } from './motionTransition'
import { closeDavebot, getDavebotTrigger, openDavebot, useDavebotOpen } from './davebotStore'
import { DAVEBOT_ENTRY_BY_ID, rankEntries, type AnswerSegment } from './davebotIndex'
import { GhostMark } from './GhostMark'
import './davebot.css'

type Row = {
  action: 'ask' | 'nav'
  id?: string
  label: string
  query?: string
  route?: string
  hint: 'ask' | 'jump' | 'enter'
}

type Part = { text: string; emphasis: boolean }

type Answer = { title?: string; route?: string; parts: Part[] }

type Phase = 'suggestions' | 'query' | 'thinking' | 'answer' | 'offline'

type Tuning = ResolvedValues<typeof DAVEBOT_CONFIG>

const OFFLINE_COPY =
  "Davebot's cloud connection is out for the moment. Questions about David's work, background, and contact details still work."

const RECOVERY_QUESTIONS: Record<'work' | 'about' | 'contact', string> = {
  work: 'What work is here?',
  about: 'Who is David?',
  contact: 'Can I hire David?',
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function toParts(segments: AnswerSegment[]): Part[] {
  const parts: Part[] = []
  for (const segment of segments) {
    const pieces = segment.text.match(/\s+|\S+/g) ?? []
    for (const piece of pieces) parts.push({ text: piece, emphasis: Boolean(segment.emphasis) })
  }
  return parts
}

function buildSuggestionRows(tuning: Tuning): Row[] {
  const slots: Array<{ id: string; visible: boolean; label: string }> = [
    { id: 'work', visible: tuning.visible.suggestion1, label: tuning.text.suggestion1 },
    { id: 'unwind', visible: tuning.visible.suggestion2, label: tuning.text.suggestion2 },
    { id: 'contact', visible: tuning.visible.suggestion3, label: tuning.text.suggestion3 },
  ]
  return slots
    .filter(slot => slot.visible)
    .map(slot => ({ action: 'ask', id: slot.id, query: slot.label, label: slot.label, hint: 'ask' }))
}

function buildQueryRows(value: string): Row[] {
  const trimmed = value.trim()
  const matches = rankEntries(trimmed)
    .slice(0, 4)
    .map(entry => ({ action: 'nav' as const, id: entry.id, route: entry.route, label: `Open ${entry.title}`, hint: 'jump' as const }))
  const truncated = trimmed.length > 54 ? `${trimmed.slice(0, 51)}…` : trimmed
  return [{ action: 'ask', query: trimmed, label: `Ask "${truncated}"`, hint: 'enter' }, ...matches]
}

function buildRecoveryRows(excludeId?: string): Row[] {
  return (['work', 'about', 'contact'] as const)
    .filter(id => id !== excludeId)
    .slice(0, 2)
    .map(id => ({ action: 'ask', id, query: RECOVERY_QUESTIONS[id], label: RECOVERY_QUESTIONS[id], hint: 'ask' }))
}

/**
 * Davebot's palette — ported in spirit from ditto's `public/ask.js` +
 * `ask.css`, rebuilt on React state and Motion springs. Mounted once at the
 * app root; `DavebotPanel` only exists in the tree while open, so every open
 * starts from fresh state and every close is a real unmount.
 */
export function DavebotLayer() {
  const open = useDavebotOpen()

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isCommandK = (event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'k'
      if (!isCommandK) return
      event.preventDefault()
      if (open) closeDavebot()
      else openDavebot()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open])

  return <AnimatePresence>{open && <DavebotPanel />}</AnimatePresence>
}

function DavebotPanel() {
  const tuning = useTuning(DAVEBOT_PANEL, DAVEBOT_CONFIG)
  const reducedMotion = Boolean(useReducedMotion())
  const tuningRef = useRef(tuning)
  tuningRef.current = tuning

  const rootRef = useRef<HTMLDivElement>(null)
  const ghostWrapRef = useRef<HTMLSpanElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const ghostX = useMotionValue(0)
  const ghostY = useMotionValue(0)
  const ghostScale = useMotionValue(1)
  const veilOpacity = useMotionValue(0)
  const panelOpacity = useMotionValue(0)
  const panelScale = useMotionValue(0.97)
  const panelY = useMotionValue(-8)

  const [phase, setPhase] = useState<Phase>('suggestions')
  const [inputValue, setInputValue] = useState('')
  const [readOnly, setReadOnly] = useState(false)
  // Clicking the field clears the placeholder so only the caret shows.
  const [engaged, setEngaged] = useState(false)
  const [rows, setRows] = useState<Row[]>(() => buildSuggestionRows(tuning))
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [revealCount, setRevealCount] = useState(0)
  const [liveMessage, setLiveMessage] = useState('')

  const answerRunRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const conversationRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const currentEntryIdRef = useRef<string | undefined>(undefined)

  const streaming = (phase === 'answer' || phase === 'offline') && revealCount < (answer?.parts.length ?? 0)

  // --- open/close ghost flight + panel entrance, imperative because the
  // flight target is a live measurement of the nav trigger, not a fixed value.
  useEffect(() => {
    const trigger = getDavebotTrigger()
    let raf1 = 0
    let raf2 = 0
    raf1 = requestAnimationFrame(() => {
      const from = trigger?.getBoundingClientRect()
      const to = ghostWrapRef.current?.getBoundingClientRect()
      if (from && to && from.width && to.width) {
        ghostX.set(from.left + from.width / 2 - (to.left + to.width / 2))
        ghostY.set(from.top + from.height / 2 - (to.top + to.height / 2))
        ghostScale.set(from.width / to.width)
      }
      raf2 = requestAnimationFrame(() => {
        const morph = reducedMotion ? { duration: 0.001 } : toMotionTransition(tuningRef.current.ghost.morph)
        const fade = reducedMotion ? { duration: 0.001 } : { duration: 0.22 }
        animate(ghostX, 0, morph)
        animate(ghostY, 0, morph)
        animate(ghostScale, 1, morph)
        animate(veilOpacity, 1, fade)
        animate(panelOpacity, 1, fade)
        animate(panelScale, 1, morph)
        animate(panelY, 0, morph)
      })
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- scroll lock, inert background, initial focus, focus restore
  useEffect(() => {
    const trigger = getDavebotTrigger()
    document.body.style.setProperty(
      '--davebot-scrollbar',
      `${Math.max(0, window.innerWidth - document.documentElement.clientWidth)}px`,
    )
    document.body.classList.add('davebot-open')
    const inerted: HTMLElement[] = []
    // Inert every sibling under the same mount parent, not document.body's
    // children — the whole app lives under one root node, so inert-ing
    // body.children would inert that single node and this modal with it.
    const container = rootRef.current?.parentElement
    for (const node of Array.from(container?.children ?? [])) {
      if (!(node instanceof HTMLElement) || node === rootRef.current || node.inert) continue
      node.inert = true
      inerted.push(node)
    }
    const focusTimer = window.setTimeout(() => {
      const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches
      if (finePointer) inputRef.current?.focus({ preventScroll: true })
      else panelRef.current?.focus({ preventScroll: true })
    }, 120)
    return () => {
      window.clearTimeout(focusTimer)
      for (const node of inerted) node.inert = false
      document.body.classList.remove('davebot-open')
      document.body.style.removeProperty('--davebot-scrollbar')
      trigger?.focus({ preventScroll: true })
    }
  }, [])

  function requestClose() {
    answerRunRef.current += 1
    abortRef.current?.abort()
    const trigger = getDavebotTrigger()
    const from = trigger?.getBoundingClientRect()
    const to = ghostWrapRef.current?.getBoundingClientRect()
    let dx = 0
    let dy = 0
    let scale = 1
    if (from && to && from.width && to.width) {
      dx = from.left + from.width / 2 - (to.left + to.width / 2)
      dy = from.top + from.height / 2 - (to.top + to.height / 2)
      scale = from.width / to.width
    }
    const closeTransition = reducedMotion ? { duration: 0.001 } : { duration: 0.16, ease: [0.4, 0, 1, 1] as const }
    void Promise.all([
      animate(ghostX, dx, closeTransition),
      animate(ghostY, dy, closeTransition),
      animate(ghostScale, scale, closeTransition),
      animate(veilOpacity, 0, closeTransition),
      animate(panelOpacity, 0, closeTransition),
      animate(panelY, 4, closeTransition),
    ]).then(closeDavebot)
  }

  // --- word-by-word reveal for the active answer
  useEffect(() => {
    if (!answer) return
    const run = answerRunRef.current
    if (reducedMotion) {
      setRevealCount(answer.parts.length)
      return
    }
    let cancelled = false
    void (async () => {
      for (let i = 1; i <= answer.parts.length; i += 1) {
        if (cancelled || run !== answerRunRef.current) return
        setRevealCount(i)
        const part = answer.parts[i - 1]
        if (!/^\s+$/.test(part.text)) await wait(26 + Math.random() * 44)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [answer, reducedMotion])

  useEffect(() => {
    if (!answer || revealCount < answer.parts.length) return
    setReadOnly(false)
    setLiveMessage(answer.parts.map(part => part.text).join(''))
    setRows(buildRecoveryRows(currentEntryIdRef.current))
    setSelectedIndex(0)
  }, [answer, revealCount])

  async function runQuery(query: string, excludeId?: string) {
    const value = query.trim()
    if (!value) return
    const run = (answerRunRef.current += 1)
    abortRef.current?.abort()
    abortRef.current = null
    setInputValue(value)
    setReadOnly(true)
    setPhase('thinking')
    setAnswer(null)
    setRevealCount(0)
    setRows([])
    setLiveMessage('Davebot is thinking')

    const localEntry = rankEntries(value)[0]
    if (localEntry) {
      conversationRef.current.push(
        { role: 'user', content: value },
        { role: 'assistant', content: localEntry.answer.map(segment => segment.text).join('') },
      )
      if (run !== answerRunRef.current) return
      currentEntryIdRef.current = localEntry.id
      setPhase('answer')
      setAnswer({ title: localEntry.title, route: localEntry.route, parts: toParts(localEntry.answer) })
      return
    }

    try {
      const controller = new AbortController()
      abortRef.current = controller
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: value, history: conversationRef.current.slice(-6) }),
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(`Davebot API returned ${response.status}`)
      const payload = (await response.json()) as { answer?: string; source?: { id?: string } }
      if (!payload.answer) throw new Error('Davebot API returned no answer')
      if (run !== answerRunRef.current) return
      conversationRef.current.push({ role: 'user', content: value }, { role: 'assistant', content: payload.answer })
      const source = payload.source?.id ? DAVEBOT_ENTRY_BY_ID[payload.source.id] : undefined
      currentEntryIdRef.current = source?.id ?? excludeId
      setPhase('answer')
      setAnswer({ title: source?.title, route: source?.route, parts: toParts([{ text: payload.answer.trim() }]) })
    } catch {
      if (run !== answerRunRef.current) return
      currentEntryIdRef.current = excludeId
      setPhase('offline')
      setAnswer({ parts: toParts([{ text: OFFLINE_COPY }]) })
      setLiveMessage('Davebot is temporarily offline. Questions about the portfolio still work.')
    } finally {
      if (run === answerRunRef.current) abortRef.current = null
    }
  }

  function runRow(row: Row) {
    if (row.action === 'nav') {
      requestClose()
      if (!row.route) return
      if (row.route.startsWith('mailto:')) {
        window.location.href = row.route
        return
      }
      if (/^https?:/.test(row.route)) {
        window.open(row.route, '_blank', 'noopener,noreferrer')
        return
      }
      navigate(row.route as Route)
      return
    }
    void runQuery(row.query ?? inputValue, row.id)
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (readOnly) return
    const value = event.target.value
    setInputValue(value)
    setSelectedIndex(0)
    if (!value.trim()) {
      setPhase('suggestions')
      setRows(buildSuggestionRows(tuning))
    } else {
      setPhase('query')
      setRows(buildQueryRows(value))
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (readOnly) return
    const row = rows[selectedIndex]
    if (row) runRow(row)
    else void runQuery(inputValue)
  }

  function clearOrClose() {
    if (inputValue.trim() || readOnly) {
      answerRunRef.current += 1
      abortRef.current?.abort()
      setInputValue('')
      setReadOnly(false)
      setPhase('suggestions')
      setAnswer(null)
      setRevealCount(0)
      setRows(buildSuggestionRows(tuningRef.current))
      setSelectedIndex(0)
      inputRef.current?.focus({ preventScroll: true })
    } else {
      requestClose()
    }
  }

  function trapTab(event: KeyboardEvent) {
    const panel = panelRef.current
    if (!panel) return
    const focusable = [
      ...panel.querySelectorAll<HTMLElement>('input:not([disabled]),button:not([disabled]):not([tabindex="-1"]),a[href]'),
    ].filter(element => element.getClientRects().length)
    if (!focusable.length) {
      event.preventDefault()
      panel.focus({ preventScroll: true })
      return
    }
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        clearOrClose()
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        event.stopPropagation()
        setSelectedIndex(index => (rows.length ? (index + 1) % rows.length : 0))
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        event.stopPropagation()
        setSelectedIndex(index => (rows.length ? (index - 1 + rows.length) % rows.length : 0))
      } else if (event.key === 'Tab') {
        trapTab(event)
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, inputValue, readOnly])

  function onSourceClick(event: MouseEvent<HTMLAnchorElement>, route: string) {
    if (/^https?:/.test(route)) return
    event.preventDefault()
    requestClose()
    if (!route.startsWith('mailto:')) navigate(route as Route)
    else window.location.href = route
  }

  const groupLabel = phase === 'suggestions' ? (tuning.visible.suggestedLabel ? tuning.text.suggestedLabel : '') : 'Ask or jump'
  const footerLeft = tuning.visible.footerLeftText ? tuning.text.footerLeft : ''
  const footerHints = [
    tuning.visible.footerHintMove ? tuning.text.footerHintMove : '',
    tuning.visible.footerHintSelect ? tuning.text.footerHintSelect : '',
    tuning.visible.footerHintClose ? tuning.text.footerHintClose : '',
  ].filter(Boolean)
  const showFooter = tuning.visible.footer && Boolean(footerLeft || footerHints.length)

  return (
    <div
      ref={rootRef}
      className="davebot-layer"
      data-surface="dark"
      data-no-ink
      style={{ ['--davebot-highlight' as string]: tuning.highlight.show ? tuning.highlight.color : 'transparent' }}
    >
      <motion.div className="davebot-veil" style={{ opacity: veilOpacity }} onClick={requestClose} />
      <div className="davebot-stack">
        <motion.span
          ref={ghostWrapRef}
          className="davebot-ghost"
          style={{
            ['--davebot-ghost-size' as string]: `${tuning.ghost.zoomSize}px`,
            translate: `${tuning.ghost.offsetX}px ${tuning.ghost.offsetY}px`,
            x: ghostX,
            y: ghostY,
            scale: ghostScale,
          }}
        >
          <GhostMark size={tuning.ghost.zoomSize} />
        </motion.span>
        <motion.section
          ref={panelRef}
          className="davebot-panel"
          data-style={tuning.box.style}
          style={{ width: `min(${tuning.ghost.paletteWidth}px, 100%)`, opacity: panelOpacity, scale: panelScale, y: panelY }}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Ask Davebot"
        >
          <form className="davebot-form" onSubmit={onSubmit}>
            <label className="visually-hidden" htmlFor="davebot-query">
              Ask Davebot
            </label>
            <input
              id="davebot-query"
              ref={inputRef}
              className={`davebot-input${engaged ? ' is-engaged' : ''}`}
              type="search"
              role="combobox"
              aria-expanded="true"
              aria-autocomplete="list"
              aria-controls="davebot-options"
              aria-activedescendant={rows[selectedIndex] ? `davebot-option-${selectedIndex}` : undefined}
              placeholder={tuning.text.placeholder}
              autoComplete="off"
              spellCheck={false}
              readOnly={readOnly}
              value={inputValue}
              onChange={onInputChange}
              onPointerDown={() => setEngaged(true)}
            />
            <button type="button" className="davebot-close" aria-label="Close Davebot" onClick={requestClose}>
              &#10005;
            </button>
          </form>

          <div className="davebot-body">
            {phase === 'thinking' && (
              <div className="davebot-status">
                <span className="davebot-status__line" aria-hidden="true" />
                <span>Davebot is thinking</span>
              </div>
            )}

            {(phase === 'answer' || phase === 'offline') && answer && (
              <>
                <div className="davebot-answer">
                  <p className={`davebot-answer__copy${streaming ? ' is-streaming' : ''}`}>
                    {answer.parts.slice(0, revealCount).map((part, index) =>
                      part.emphasis ? <strong key={index}>{part.text}</strong> : <span key={index}>{part.text}</span>,
                    )}
                  </p>
                  {!streaming && phase === 'answer' && answer.route && answer.title && (
                    <div className="davebot-answer__actions">
                      <a
                        className="davebot-source"
                        href={answer.route}
                        target={/^https?:/.test(answer.route) ? '_blank' : undefined}
                        rel={/^https?:/.test(answer.route) ? 'noopener noreferrer' : undefined}
                        onClick={event => onSourceClick(event, answer.route as string)}
                      >
                        <span className="davebot-source__arrow" aria-hidden="true">
                          &#8599;
                        </span>
                        <span>Source · {answer.title}</span>
                      </a>
                    </div>
                  )}
                </div>
                {!streaming && (
                  <div className="davebot-recovery">
                    <span className="davebot-group">Ask next</span>
                    <div className="davebot-options" id="davebot-options" role="listbox">
                      {rows.map((row, index) => (
                        <DavebotRow key={`${row.action}-${row.id ?? row.query ?? index}`} row={row} index={index} selected={index === selectedIndex} tuning={tuning} onPick={runRow} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {(phase === 'suggestions' || phase === 'query') && (
              <>
                {groupLabel && <span className="davebot-group">{groupLabel}</span>}
                <div className="davebot-options" id="davebot-options" role="listbox">
                  {rows.map((row, index) => (
                    <DavebotRow key={`${row.action}-${row.id ?? row.query ?? index}`} row={row} index={index} selected={index === selectedIndex} tuning={tuning} onPick={runRow} />
                  ))}
                </div>
              </>
            )}
          </div>

          {showFooter && (
            <div className="davebot-footer" aria-hidden="true">
              {footerLeft && <span>{footerLeft}</span>}
              <span className="davebot-footer__keys">
                {footerHints.map(hint => (
                  <span key={hint}>{hint}</span>
                ))}
              </span>
            </div>
          )}
        </motion.section>
      </div>
      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </p>
    </div>
  )
}

function DavebotRow({
  row,
  index,
  selected,
  tuning,
  onPick,
}: {
  row: Row
  index: number
  selected: boolean
  tuning: Tuning
  onPick: (row: Row) => void
}) {
  const isAsk = row.action === 'ask'
  const glyph = isAsk ? '' : '\u2197'
  const showHint = isAsk ? tuning.visible.askLabel : true
  const hintText = isAsk ? tuning.text.askRowLabel : row.hint

  return (
    <button
      id={`davebot-option-${index}`}
      role="option"
      type="button"
      tabIndex={-1}
      aria-selected={selected}
      className={`davebot-row${glyph ? '' : ' davebot-row--bare'}`}
      onClick={() => onPick(row)}
    >
      {glyph && (
        <span className="davebot-row__icon" aria-hidden="true">
          {glyph}
        </span>
      )}
      <span className="davebot-row__label">{row.label}</span>
      <span className="davebot-row__hint" aria-hidden="true">
        {showHint ? hintText : ''}
      </span>
    </button>
  )
}

