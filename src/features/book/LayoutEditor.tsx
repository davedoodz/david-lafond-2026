import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { PAGE_ASPECT, SPREADS, pageLabel, pageSurface, pageUrl } from './bookPages'
import { constrainBlock, diagramGuides, layerColor, type DiagramSettings } from './layoutDiagram'
import type { Ink, LayoutBlock, PageLayout } from './pageLayouts'
import './layoutEditor.css'

type Props = {
  spread: number
  pages: Record<number, PageLayout>
  settings: DiagramSettings
  status: string
  onSpread: (spread: number) => void
  onSave: (page: number, layout: PageLayout) => void
  onSettings: (key: string, value: boolean | number) => void
  onRetry: () => void
  onClose: () => void
}
type Selection = { page: number; id: string }
type Gesture = { pointer: number; page: number; block: LayoutBlock; layout: PageLayout; x: number; y: number; width: number; height: number; resize: boolean }

export function LayoutEditor({ spread, pages, settings, status, onSpread, onSave, onSettings, onRetry, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const gesture = useRef<Gesture | null>(null)
  const draftRef = useRef<{ page: number; layout: PageLayout } | null>(null)
  const [draft, setDraft] = useState<typeof draftRef.current>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [activePage, setActivePage] = useState(SPREADS[spread][0])
  const [compare, setCompare] = useState(false)
  const visible = SPREADS[spread]
  const pageNumber = visible.includes(activePage) ? activePage : visible[0]
  const page = draft?.page === pageNumber ? draft.layout : pages[pageNumber]
  const selected = selection?.page === pageNumber ? page.blocks.find((b) => b.id === selection.id) : undefined

  useEffect(() => {
    const element = dialog.current!
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    element.showModal()
    return () => { element.close(); document.documentElement.style.overflow = overflow; previous?.focus({ preventScroll: true }) }
  }, [])

  const finishGesture = (save: boolean) => {
    if (!gesture.current) return
    const latest = draftRef.current
    gesture.current = null
    draftRef.current = null
    setDraft(null)
    if (save && latest) onSave(latest.page, latest.layout)
  }
  const startGesture = (event: ReactPointerEvent<SVGRectElement>, number: number, block: LayoutBlock, resize: boolean) => {
    if (event.button !== 0 || compare || gesture.current) return
    event.preventDefault(); event.stopPropagation()
    const svg = event.currentTarget.ownerSVGElement!
    svg.focus()
    const bounds = svg.getBoundingClientRect()
    setActivePage(number); setSelection({ page: number, id: block.id })
    gesture.current = { pointer: event.pointerId, page: number, block, layout: pages[number], x: event.clientX, y: event.clientY, width: bounds.width, height: bounds.height, resize }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const moveGesture = (event: ReactPointerEvent<SVGSVGElement>) => {
    const g = gesture.current
    if (!g || g.pointer !== event.pointerId) return
    const dx = (event.clientX - g.x) / g.width * 100
    const dy = (event.clientY - g.y) / g.height * 100
    const raw = g.resize ? { ...g.block, w: g.block.w + dx, h: g.block.h + dy } : { ...g.block, x: g.block.x + dx, y: g.block.y + dy }
    const block = constrainBlock(raw, g.layout, event.altKey ? { ...settings, snap: false } : settings, g.resize)
    const next = { page: g.page, layout: { ...g.layout, blocks: g.layout.blocks.map((b) => b.id === block.id ? block : b) } }
    draftRef.current = next
    setDraft(next)
  }
  const changeBlock = (patch: Partial<LayoutBlock>, resize = false) => {
    if (!selected) return
    const updated = constrainBlock({ ...selected, ...patch }, page, { ...settings, snap: false }, resize)
    onSave(pageNumber, { ...page, blocks: page.blocks.map((b) => b.id === selected.id ? updated : b) })
  }
  const navigate = (next: number) => {
    finishGesture(true)
    setSelection(null)
    setActivePage(SPREADS[next][0])
    onSpread(next)
  }

  return createPortal(
    <dialog ref={dialog} className="layout-editor" aria-label="Portfolio layout editor" data-surface="dark"
      onCancel={(event) => { event.preventDefault(); if (gesture.current) finishGesture(false); else onClose() }}
      onKeyDown={(event) => {
        event.stopPropagation()
        if ((event.target as HTMLElement).closest('input, select, button')) return
        if (!selected || compare) return
        const delta = event.shiftKey ? 1 : 0.1
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
          event.preventDefault()
          changeBlock({ x: selected.x + (event.key === 'ArrowRight' ? delta : event.key === 'ArrowLeft' ? -delta : 0), y: selected.y + (event.key === 'ArrowDown' ? delta : event.key === 'ArrowUp' ? -delta : 0) })
        }
      }}>
      <header className="layout-editor__header">
        <div><strong>Layout study</strong><span>Black & white · MIT / Harvard</span></div>
        <nav aria-label="Diagram spread navigation">
          <button type="button" aria-label="Previous diagram spread" disabled={spread === 0} onClick={() => navigate(spread - 1)}>←</button>
          <select aria-label="Diagram spread" value={spread} onChange={(e) => navigate(Number(e.target.value))}>
            {SPREADS.map((p, i) => <option key={i} value={i}>{i === 0 ? 'Front cover' : i === SPREADS.length - 1 ? 'Back cover' : `Pages ${pageLabel(p)}`}</option>)}
          </select>
          <button type="button" aria-label="Next diagram spread" disabled={spread === SPREADS.length - 1} onClick={() => navigate(spread + 1)}>→</button>
        </nav>
        <button type="button" onClick={onClose}>Done</button>
      </header>
      <div className="layout-editor__body">
        <div className="layout-editor__workspace">
          <div className="layout-editor__spread" style={{ aspectRatio: PAGE_ASPECT * visible.length, maxWidth: `calc((100dvh - 190px) * ${PAGE_ASPECT * visible.length})` }}>
            {visible.map((number) => {
              const layout = draft?.page === number ? draft.layout : pages[number]
              const guides = diagramGuides(layout, settings)
              const chosen = selection?.page === number ? layout.blocks.find((b) => b.id === selection.id) : undefined
              return <div className="layout-editor__page" key={number} data-page={number}
                data-surface={compare ? pageSurface(number) : layout.background === 'black' ? 'dark' : 'light'}>
                {compare ? <img src={pageUrl(number, 'medium')} alt={`Original page ${number}`} /> :
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" tabIndex={0} role="group" aria-label={`Edit page ${number}`}
                    onPointerMove={moveGesture} onPointerUp={() => finishGesture(true)} onPointerCancel={() => finishGesture(false)}
                    onLostPointerCapture={() => finishGesture(true)}>
                    <rect width="100" height="100" fill={layout.background} onPointerDown={() => { setActivePage(number); setSelection(null) }} />
                    {layout.blocks.map((block) => <rect key={block.id} data-block={block.id} data-surface={block.color === 'black' ? 'dark' : 'light'} x={block.x} y={block.y} width={block.w} height={block.h} fill={block.color}
                      className="layout-editor__block" onPointerDown={(e) => startGesture(e, number, block, false)}>
                      <title>{block.label}</title>
                    </rect>)}
                    <g pointerEvents="none">
                      {([['grid', settings.grid, guides.grid], ['guide', settings.guides, guides.edges]] as const).map(([kind, layer, lines]) => <g key={kind} opacity={layer.opacity}>
                        {([['white', layer.width + 1, 0.6], [layerColor(layer, layout), layer.width, 1]] as const).map(([color, width, opacity]) => <g key={`${kind}-${opacity}`} stroke={color} strokeWidth={width} opacity={opacity}>
                          {lines.x.map((x) => <line key={`x${x}`} x1={x} x2={x} y1={0} y2={100} vectorEffect="non-scaling-stroke" />)}
                          {lines.y.map((y) => <line key={`y${y}`} x1={0} x2={100} y1={y} y2={y} vectorEffect="non-scaling-stroke" />)}
                        </g>)}
                      </g>)}
                      {chosen && <>
                        <rect x={chosen.x} y={chosen.y} width={chosen.w} height={chosen.h} fill="none" stroke="white" strokeWidth="3" vectorEffect="non-scaling-stroke" />
                        <rect x={chosen.x} y={chosen.y} width={chosen.w} height={chosen.h} fill="none" stroke="black" strokeWidth="1" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
                      </>}
                    </g>
                    {chosen && <rect className="layout-editor__resize" aria-label={`Resize ${chosen.label}`} x={chosen.x + chosen.w - 1.4} y={chosen.y + chosen.h - 1} width={2.8} height={2} fill="white" stroke="black" strokeWidth="1" vectorEffect="non-scaling-stroke" onPointerDown={(e) => startGesture(e, number, chosen, true)} />}
                  </svg>}
              </div>
            })}
          </div>
          <p className="layout-editor__hint">Drag a block. Drag its lower-right handle to resize. Arrow keys nudge; Shift moves farther. Alt temporarily releases snapping.</p>
        </div>
        <aside className="layout-editor__inspector" aria-label="Layout controls">
          <label className="layout-editor__check"><input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} />Compare original</label>
          <label>Page<select aria-label="Edit page" value={pageNumber} onChange={(e) => { setActivePage(Number(e.target.value)); setSelection(null) }}>{visible.map((n) => <option key={n} value={n}>Page {n}</option>)}</select></label>
          <label>Page background<select aria-label="Page background" value={page.background} onChange={(e) => onSave(pageNumber, { ...page, background: e.target.value as Ink })}><option value="white">White</option><option value="black">Black</option></select></label>
          <label>Block<select aria-label="Selected block" value={selected?.id ?? ''} onChange={(e) => setSelection({ page: pageNumber, id: e.target.value })}><option value="">Select a block</option>{page.blocks.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}</select></label>
          <fieldset disabled={!selected || compare}><legend>Selected block</legend>
            <div className="layout-editor__geometry">{(['x', 'y', 'w', 'h'] as const).map((key) => <label key={key}>{({ x: 'X', y: 'Y', w: 'Width', h: 'Height' })[key]} %<input type="number" aria-label={`Block ${key}`} step="0.1" min={key === 'w' || key === 'h' ? 0.5 : 0} max={100} value={selected?.[key] ?? 0} onChange={(e) => { if (Number.isFinite(e.target.valueAsNumber)) changeBlock({ [key]: e.target.valueAsNumber }, key === 'w' || key === 'h') }} /></label>)}</div>
            <div className="layout-editor__colors">{(['black', 'white'] as const).map((color) => <button type="button" key={color} aria-pressed={selected?.color === color} onClick={() => changeBlock({ color })}><i style={{ background: color }} />{color}</button>)}</div>
            <button type="button" className="layout-editor__delete" onClick={() => { onSave(pageNumber, { ...page, blocks: page.blocks.filter((b) => b.id !== selected?.id) }); setSelection(null) }}>Delete block</button>
          </fieldset>
          <button type="button" onClick={() => {
            const block: LayoutBlock = { id: crypto.randomUUID(), label: `New block ${page.blocks.length + 1}`, x: 10, y: 10, w: 20, h: 10, color: page.background === 'white' ? 'black' : 'white' }
            onSave(pageNumber, { ...page, blocks: [...page.blocks, block] }); setSelection({ page: pageNumber, id: block.id }); setCompare(false)
          }}>+ Add block</button>
          <fieldset><legend>Alignment grid</legend>
            <label className="layout-editor__check"><input type="checkbox" checked={settings.grid.show} onChange={(e) => onSettings('grid.show', e.target.checked)} />Rows & columns</label>
            <label className="layout-editor__check"><input type="checkbox" checked={settings.guides.show} onChange={(e) => onSettings('guides.show', e.target.checked)} />Follow block edges</label>
            <label className="layout-editor__check"><input type="checkbox" checked={settings.snap} onChange={(e) => onSettings('snap', e.target.checked)} />Snap to grid & blocks</label>
            <div className="layout-editor__geometry">{(['columns', 'rows'] as const).map((key) => <label key={key}>{key}<input type="number" aria-label={`Grid ${key}`} min={2} max={48} value={settings.grid[key]} onChange={(e) => { if (Number.isFinite(e.target.valueAsNumber)) onSettings(`grid.${key}`, Math.max(2, Math.min(48, Math.round(e.target.valueAsNumber)))) }} /></label>)}</div>
            <label>Grid line width · {settings.grid.width}px<input aria-label="Grid line width" type="range" min={0.25} max={8} step={0.25} value={settings.grid.width} onChange={(e) => onSettings('grid.width', Number(e.target.value))} /></label>
          </fieldset>
          <p className="layout-editor__status" role="status">{status}</p>
          {status.includes('retry') && <button type="button" onClick={onRetry}>Retry project save</button>}
        </aside>
      </div>
    </dialog>, document.body,
  )
}
