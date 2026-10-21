import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from 'motion/react'
import type { ResolvedValues } from 'dialkit'
import { useTuning } from '../../tuning/useTuning'
import { navigate, type Route } from '../../lib/router'
import { DAVEBOT_CONFIG, DAVEBOT_PANEL, ghostFill } from './davebotConfig'
import { toMotionTransition } from './motionTransition'
import { closeDavebot, getDavebotTrigger, openDavebot, takeDavebotQuote, useDavebotOpen } from './davebotStore'
import { rankEntries, type AnswerSegment } from './davebotIndex'
import { hasMore, nextQuestions, think, type BrainReply } from './davebotBrain'
import { GhostMark } from './GhostMark'
import { ArrowUpRightIcon } from '../../components/icons'
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

type Answer = { parts: Part[] }

type Phase = 'suggestions' | 'query' | 'thinking' | 'answer'

type Tuning = ResolvedValues<typeof DAVEBOT_CONFIG>

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
    { id: 'momo', visible: tuning.visible.suggestion2, label: tuning.text.suggestion2 },
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

/** After an answer: open the page it's about, dig deeper, or a fresh question to try. */
function buildFollowRows(reply: BrainReply | null): Row[] {
  const rows: Row[] = []
  if (reply?.link) rows.push({ action: 'nav', id: reply.id, route: reply.link.route, label: reply.link.label, hint: 'jump' })
  if (reply && hasMore(reply.id)) rows.push({ action: 'ask', query: 'Tell me more', label: 'Tell me more', hint: 'ask' })
  for (const question of nextQuestions(3 - rows.length, reply?.id)) rows.push({ action: 'ask', query: question, label: question, hint: 'ask' })
  return rows
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

/**
 * x/y/scale that land the big ghost's drawn mark exactly on the nav ghost's drawn mark
 * (`.ghost-mark`, not the padded button box, so the hand-off has no size or position jump).
 * `x`, `y`, `scale` are the wrap's current motion values; they're factored out so the
 * measurement is correct even mid-animation. Scale pivots on the wrap's centre.
 */
function measureFlight(trigger: HTMLElement | null, wrap: HTMLElement | null, x: number, y: number, scale: number) {
  const fromEl = trigger?.querySelector('.ghost-mark') ?? trigger
  const toEl = wrap?.querySelector('.ghost-mark') ?? wrap
  if (!fromEl || !toEl || !wrap || scale <= 0) return null
  const from = fromEl.getBoundingClientRect()
  const to = toEl.getBoundingClientRect()
  const w = wrap.getBoundingClientRect()
  if (!from.width || !to.width) return null
  // Untransformed wrap centre, and the mark's centre offset from it at scale 1.
  const wx = w.left + w.width / 2 - x
  const wy = w.top + w.height / 2 - y
  const ox = (to.left + to.width / 2 - (w.left + w.width / 2)) / scale
  const oy = (to.top + to.height / 2 - (w.top + w.height / 2)) / scale
  const nextScale = (from.width / to.width) * scale
  return {
    x: from.left + from.width / 2 - wx - ox * nextScale,
    y: from.top + from.height / 2 - wy - oy * nextScale,
    scale: nextScale,
  }
}

function DavebotPanel() {
  const tuning = useTuning(DAVEBOT_PANEL, DAVEBOT_CONFIG)
  const reducedMotion = Boolean(useReducedMotion())
  const tuningRef = useRef(tuning)
  tuningRef.current = tuning

  const rootRef = useRef<HTMLDivElement>(null)
  const ghostWrapRef = useRef<HTMLSpanElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

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
  const lastReplyRef = useRef<BrainReply | null>(null)

  const streaming = phase === 'answer' && revealCount < (answer?.parts.length ?? 0)

  // --- open/close ghost flight + panel entrance, imperative because the
  // flight target is a live measurement of the nav trigger, not a fixed value.
  // The ghost is parked on the nav mark before the first paint (a layout effect), so the big
  // ghost never flashes at the centre for a frame before it flies out of the nav. The DOM still
  // holds the mount pose (0, 0, 1) here, even on StrictMode's second run after the first one's
  // set() calls, because motion writes styles on its next frame.
  useLayoutEffect(() => {
    const flight = measureFlight(getDavebotTrigger(), ghostWrapRef.current, 0, 0, 1)
    if (flight) {
      ghostX.set(flight.x)
      ghostY.set(flight.y)
      ghostScale.set(flight.scale)
    }
    const raf = requestAnimationFrame(() => {
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
    return () => cancelAnimationFrame(raf)
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

  const closingRef = useRef(false)
  function requestClose() {
    // The exit spring can run for most of a second; a second Esc/veil click mustn't restart it.
    if (closingRef.current) return
    closingRef.current = true
    // Release the overlay's cursor contrast now, not when the return spring unmounts it.
    rootRef.current?.removeAttribute('data-surface')
    window.dispatchEvent(new Event('cursor:show'))
    answerRunRef.current += 1
    const flight = measureFlight(getDavebotTrigger(), ghostWrapRef.current, ghostX.get(), ghostY.get(), ghostScale.get())
    const dx = flight?.x ?? 0
    const dy = flight?.y ?? 0
    const scale = flight?.scale ?? 1
    // Exit mirrors the entrance: same morph spring for the ghost flight and panel, same fade.
    const morph = reducedMotion ? { duration: 0.001 } : toMotionTransition(tuningRef.current.ghost.morph)
    const fade = reducedMotion ? { duration: 0.001 } : { duration: 0.22 }
    void Promise.all([
      animate(ghostX, dx, morph),
      animate(ghostY, dy, morph),
      animate(ghostScale, scale, morph),
      animate(veilOpacity, 0, fade),
      animate(panelOpacity, 0, fade),
      animate(panelScale, 0.97, morph),
      animate(panelY, -8, morph),
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
    setRows(buildFollowRows(lastReplyRef.current))
    setSelectedIndex(0)
  }, [answer, revealCount])

  // Opened from the selection cue: ask about the highlighted text straight away.
  useEffect(() => {
    const quote = takeDavebotQuote()
    if (quote) void runQuery(quote)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function runQuery(query: string) {
    const value = query.trim()
    if (!value) return
    const run = (answerRunRef.current += 1)
    setInputValue(value)
    setReadOnly(true)
    setPhase('thinking')
    setAnswer(null)
    setRevealCount(0)
    setRows([])
    setLiveMessage('Davebot is thinking')

    // Everything is local and instant; a short, length-scaled pause keeps the "thinking" beat.
    const reply = think(value)
    await wait(Math.min(1100, 380 + value.length * 9 + Math.random() * 260))
    if (run !== answerRunRef.current) return
    lastReplyRef.current = reply
    setPhase('answer')
    setAnswer({ parts: toParts(reply.segments) })
  }

  function runRow(row: Row) {
    if (row.action === 'nav') {
      requestClose()
      if (!row.route) return
      if (row.route.startsWith('mailto:')) {
        window.location.href = row.route
        return
      }
      // Full URLs and site files like the résumé PDF ("/resume/…") open in a new tab; bare names are app routes.
      if (/^(https?:|\/)/.test(row.route)) {
        window.open(row.route, '_blank', 'noopener,noreferrer')
        return
      }
      navigate(row.route as Route)
      return
    }
    void runQuery(row.query ?? inputValue)
  }

  function onInputChange(event: ChangeEvent<HTMLTextAreaElement>) {
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

  // Enter submits like a single-line field; Shift+Enter is left alone (no newline needed, but
  // IME composition must still be able to confirm with Enter).
  function onInputKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    event.currentTarget.form?.requestSubmit()
  }

  // Grow the box to its text so nothing is cut off.
  useLayoutEffect(() => {
    const box = inputRef.current
    if (!box) return
    box.style.height = 'auto'
    box.style.height = `${box.scrollHeight}px`
  }, [inputValue])

  function clearOrClose() {
    if (inputValue.trim() || readOnly) {
      answerRunRef.current += 1
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
      style={{
        ['--davebot-highlight' as string]: tuning.highlight.show ? tuning.highlight.color : 'transparent',
        ['--davebot-veil' as string]: `rgb(0 0 0 / ${tuning.box.backdropOpacity})`,
        // Read by .davebot-stack (davebot.css) to centre the ghost and the palette below it.
        ['--davebot-ghost-size' as string]: `${tuning.ghost.zoomSize}px`,
      }}
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
          <GhostMark size={tuning.ghost.zoomSize} happy={tuning.happy} fill={ghostFill(tuning.ghost)} />
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
            {/* A textarea, not an input: long questions (a highlighted passage) wrap instead of
                scrolling out of sight. Enter still submits; the box grows to fit, up to a cap. */}
            <textarea
              id="davebot-query"
              ref={inputRef}
              className={`davebot-input${engaged ? ' is-engaged' : ''}`}
              rows={1}
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
              onKeyDown={onInputKeyDown}
              onPointerDown={() => setEngaged(true)}
            />
            <button type="button" className="davebot-close" aria-label="Close Davebot" onClick={requestClose}>
              &#10005;
            </button>
          </form>

          <div className="davebot-body">
            {phase === 'thinking' && (
              <div className="davebot-status">
                <span className="davebot-status__thinking">Davebot is thinking</span>
              </div>
            )}

            {phase === 'answer' && answer && (
              <>
                <div className="davebot-answer">
                  <p className={`davebot-answer__copy${streaming ? ' is-streaming' : ''}`}>
                    {answer.parts.slice(0, revealCount).map((part, index) =>
                      part.emphasis ? <strong key={index}>{part.text}</strong> : <span key={index}>{part.text}</span>,
                    )}
                  </p>
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
  const glyph = !isAsk
  // Nav rows carry only the arrow; the ask row keeps its tunable label.
  const showHint = isAsk && tuning.visible.askLabel
  const hintText = isAsk ? tuning.text.askRowLabel : ''

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
          <ArrowUpRightIcon />
        </span>
      )}
      <span className="davebot-row__label">{row.label}</span>
      <span className="davebot-row__hint" aria-hidden="true">
        {showHint ? hintText : ''}
      </span>
    </button>
  )
}

