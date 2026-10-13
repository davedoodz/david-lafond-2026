import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { DialRoot, useDialKitController, type DialConfig } from 'dialkit'
import { ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, Copy, Download, Image, MousePointer2, Move, Pause, Play, RotateCcw, SlidersHorizontal, Upload, X } from 'lucide-react'
import { ASSETS, ASSET_ROOT, DEFAULT_SETTINGS, PRESETS, parseProject, timeline, type Block, type Flow, type Project, type Scene, type Settings } from './model'
import { STUDIO_FLOWS } from './data'
import { HEIGHT, WIDTH, loadAssets, renderFrame, screenPoint, type Hit, type RenderAssets } from './render'
import 'dialkit/styles.css'
import './studio.css'

const STORAGE = 'filo-prototype-studio:v1:'
type ExportStatus = { progress: number; message: string; url?: string }
const INITIAL_ID = new URLSearchParams(location.search).get('flow') ?? 'flow-01'

function readProject(flow: Flow): { project: Project; error?: string } {
  try {
    const raw = localStorage.getItem(STORAGE + flow.id)
    if (raw) {
      const project = parseProject(JSON.parse(raw))
      if (project.flow.id !== flow.id) throw new Error('Flow identity does not match.')
      return { project }
    }
  } catch { return { project: { version: 1, flow: structuredClone(flow), settings: structuredClone(DEFAULT_SETTINGS) }, error: 'The saved project could not be loaded. Defaults are shown; the saved copy has not been replaced.' } }
  return { project: { version: 1, flow: structuredClone(flow), settings: structuredClone(DEFAULT_SETTINGS) } }
}
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob), a = document.createElement('a')
  a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
function dialConfig(settings: Settings): DialConfig {
  return {
    motion: {
      style: { type: 'select', options: ['push', 'dissolve', 'sheet', 'lift'], default: settings.motion.style },
      speed: [settings.motion.speed, 0.25, 3, 0.05], transition: [settings.motion.transition, 0.15, 1.5, 0.05],
      hold: [settings.motion.hold, 0.4, 2, 0.05], loopPause: [settings.motion.loopPause, 0, 3, 0.1],
      softness: [settings.motion.softness, 2, 6, 0.1], taps: settings.motion.taps, tapSize: [settings.motion.tapSize, 10, 40, 1],
    },
    device: { scale: [settings.device.scale, 0.65, 1.08, 0.01], x: [settings.device.x, -110, 110, 1], y: [settings.device.y, -70, 70, 1], rotation: [settings.device.rotation, -8, 8, 0.1] },
    screen: { textScale: [settings.screen.textScale, 0.85, 1.1, 0.01], radius: [settings.screen.radius, 0, 30, 1], accent: settings.screen.accent, background: settings.screen.background },
  }
}

export function Studio() {
  const [selected, setSelected] = useState(STUDIO_FLOWS.find(f => f.id === INITIAL_ID)?.id ?? 'flow-01')
  const [assets, setAssets] = useState<RenderAssets>()
  const [error, setError] = useState('')
  const [generation, setGeneration] = useState(0)
  useEffect(() => { loadAssets().then(setAssets).catch(e => setError(`Could not load the phone artwork: ${String(e)}`)) }, [])
  const flow = STUDIO_FLOWS.find(f => f.id === selected)!
  return <main className="fs-app">
    <header className="fs-topbar">
      <a className="fs-brand" href="/studio/filo-prototypes.html" aria-label="Filo prototype studio">Filo<span>Prototype studio</span></a>
      <span className="fs-studio-status"><i />Independent workspace <span> / </span> Not in the case study</span>
    </header>
    <nav className="fs-flows" aria-label="Prototype flows">
      <div className="fs-sidebar-label">STORYBOARD LIBRARY <span>16</span></div>
      {STUDIO_FLOWS.map((item, i) => <button key={item.id} className={selected === item.id ? 'is-active' : ''} aria-current={selected === item.id ? 'page' : undefined} onClick={() => {
        setSelected(item.id); history.replaceState(null, '', `?flow=${item.id}`)
      }}><span className="fs-flow-number">{i === 15 ? '∞' : String(i + 1).padStart(2, '0')}</span><span>{item.title}<small>{item.phase} · {item.scenes.length} scenes</small></span></button>)}
      <p className="fs-sidebar-note">Filo prepares.<br />You make the call.</p>
    </nav>
    {error ? <div className="fs-error" role="alert">{error}</div> : assets ? <FlowEditor key={`${selected}-${generation}`} flow={flow} assets={assets} onReset={() => setGeneration(v => v + 1)} /> : <div className="fs-loading" role="status">Preparing material artwork and iPhone frame…</div>}
  </main>
}

function FlowEditor({ flow, assets, onReset }: { flow: Flow; assets: RenderAssets; onReset: () => void }) {
  const [initial] = useState(() => readProject(flow))
  const [draft, setDraft] = useState(initial.project.flow)
  const [config] = useState(() => dialConfig(initial.project.settings))
  const dial = useDialKitController('Animation & device', config, { id: `filo-studio:${flow.id}`, defaultCollapsed: false })
  const settings = dial.values as unknown as Settings
  const project = useMemo<Project>(() => ({ version: 1, flow: draft, settings }), [draft, settings])
  const projectRef = useRef(project); projectRef.current = project
  const [playing, setPlaying] = useState(() => !matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [step, setStep] = useState(0)
  const [tab, setTab] = useState<'motion' | 'design' | 'reference'>('motion')
  const [mode, setMode] = useState<'select' | 'move' | 'tap'>('select')
  const [selection, setSelection] = useState('title')
  const [stageColor, setStageColor] = useState<'light' | 'dark' | 'check'>('light')
  const [focus, setFocus] = useState(false)
  const [notice, setNotice] = useState(initial.error ?? '')
  const [saveState, setSaveState] = useState(initial.error ? 'Saved copy needs attention' : 'Saved on this browser')
  const [exportStatus, setExportStatus] = useState<ExportStatus>()
  const [exportError, setExportError] = useState('')
  const [copied, setCopied] = useState(false)
  const [exportWidth, setExportWidth] = useState(540)
  const canvas = useRef<HTMLCanvasElement>(null)
  const track = useRef<HTMLInputElement>(null)
  const clock = useRef<HTMLOutputElement>(null)
  const time = useRef(0)
  const hits = useRef<Hit[]>([])
  const abortExport = useRef<AbortController | null>(null)
  const importInput = useRef<HTMLInputElement>(null)
  const drag = useRef<{ pointer: number; x: number; y: number; originalX: number; originalY: number; target: string } | null>(null)
  const scene = draft.scenes[step] ?? draft.scenes[0]
  const block = scene.blocks.find(b => b.id === selection)
  const timing = timeline(project)
  const saveAllowed = useRef(!initial.error)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!saveAllowed.current) return
      try { localStorage.setItem(STORAGE + flow.id, JSON.stringify(project)); setSaveState('Saved on this browser') }
      catch { setSaveState('Not saved — export JSON to keep changes'); setNotice('Browser storage is unavailable or full. Download the project JSON to preserve your edits.') }
    }, 200)
    return () => clearTimeout(timer)
  }, [project, flow.id])
  useEffect(() => () => {
    abortExport.current?.abort()
    // Flush the latest edit if the user switches flows during the debounce window.
    if (saveAllowed.current) { try { localStorage.setItem(STORAGE + flow.id, JSON.stringify(projectRef.current)) } catch { /* The live save reports storage failures. */ } }
  }, [flow.id])
  useEffect(() => {
    let raf = 0, previous = performance.now(), lastStep = step, lastDrawn = -1
    const tick = (now: number) => {
      if (playing && !document.hidden) time.current += Math.min(0.1, (now - previous) / 1000)
      previous = now
      if (canvas.current && time.current !== lastDrawn) {
        lastDrawn = time.current
        const result = renderFrame(canvas.current, project, assets, time.current, !playing && tab === 'design' && mode === 'select' ? selection : undefined)
        hits.current = result.hits
        if (lastStep !== result.index) { lastStep = result.index; setStep(result.index); setSelection('title') }
        const elapsed = time.current % result.duration
        if (track.current) track.current.value = String(elapsed)
        if (clock.current) clock.current.textContent = `${elapsed.toFixed(1)} / ${result.duration.toFixed(1)}s`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [project, assets, playing, tab, mode, selection, step])

  function seek(index: number) {
    time.current = timeline(project).clips[index].start + 0.001
    setStep(index); setPlaying(false); setSelection('title')
  }
  function updateScene(patch: Partial<Scene>) {
    saveAllowed.current = true
    setDraft(current => ({ ...current, scenes: current.scenes.map((s, i) => i === step ? { ...s, ...patch } : s) }))
  }
  function updateBlock(patch: Partial<Block>) {
    updateScene({ blocks: scene.blocks.map(b => b.id === selection ? { ...b, ...patch } : b) })
  }
  function point(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const scale = Math.min(rect.width / WIDTH, rect.height / HEIGHT)
    return {
      x: (event.clientX - rect.left - (rect.width - WIDTH * scale) / 2) / scale,
      y: (event.clientY - rect.top - (rect.height - HEIGHT * scale) / 2) / scale,
    }
  }
  function pointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (tab !== 'design') return
    setPlaying(false)
    // Edit a fully settled screen rather than a transient blend of two scenes.
    time.current = timing.clips[step].start + 0.001
    const p = point(event), local = screenPoint(project, p.x, p.y)
    if (mode === 'tap') { updateScene({ tapX: Math.max(0, Math.min(393, local.x)), tapY: Math.max(0, Math.min(852, local.y)) }); return }
    if (mode === 'move') {
      drag.current = { pointer: event.pointerId, x: p.x, y: p.y, originalX: settings.device.x, originalY: settings.device.y, target: 'device' }
    } else {
      const hit = [...hits.current].reverse().find(h => local.x >= h.x && local.x <= h.x + h.width && local.y >= h.y && local.y <= h.y + h.height)
      if (!hit) return
      setSelection(hit.id)
      const b = scene.blocks.find(b => b.id === hit.id)
      if (b) drag.current = { pointer: event.pointerId, x: local.x, y: local.y, originalX: b.x ?? 0, originalY: b.y ?? 0, target: hit.id }
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  function pointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const start = drag.current
    if (!start || event.pointerId !== start.pointer) return
    const p = point(event)
    saveAllowed.current = true
    if (start.target === 'device') {
      dial.setValue('device.x', Math.round(Math.max(-110, Math.min(110, start.originalX + p.x - start.x))))
      dial.setValue('device.y', Math.round(Math.max(-70, Math.min(70, start.originalY + p.y - start.y))))
    } else {
      const local = screenPoint(project, p.x, p.y)
      updateScene({ blocks: scene.blocks.map(b => b.id === start.target ? { ...b, x: Math.round(Math.max(-300, Math.min(300, start.originalX + local.x - start.x))), y: Math.round(Math.max(-500, Math.min(500, start.originalY + local.y - start.y))) } : b) })
    }
  }
  async function exportVideo() {
    if (abortExport.current) return
    const controller = new AbortController(); abortExport.current = controller
    setExportError(''); setExportStatus({ progress: 0, message: 'Starting private headless render…' }); setPlaying(false)
    try {
      const response = await fetch('/__filo/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project: parseProject(project), width: exportWidth }), signal: controller.signal })
      if (!response.ok) throw new Error(await response.text())
      const reader = response.body!.getReader(), decoder = new TextDecoder()
      let pending = ''
      while (true) {
        const { value, done } = await reader.read()
        pending += decoder.decode(value, { stream: !done })
        const lines = pending.split('\n'); pending = lines.pop() ?? ''
        for (const line of lines) {
          if (!line) continue
          const status = JSON.parse(line) as ExportStatus & { error?: string }
          if (status.error) throw new Error(status.error)
          setExportStatus(status)
        }
        if (done) break
      }
    } catch (error) {
      setExportStatus(undefined)
      setExportError(controller.signal.aborted ? 'Render cancelled. Your edits are saved.' : `Export failed: ${error instanceof Error ? error.message : String(error)}`)
    } finally { abortExport.current = null }
  }
  const prompt = `Filo / ${draft.title}: a noninteractive, silent iPhone loop on a transparent stage. Use the ${settings.motion.style} transition (${settings.motion.transition.toFixed(2)}s), ${settings.motion.hold.toFixed(2)}× reading time and ${settings.motion.speed.toFixed(2)}× playback. Keep supplier claims, observations and unknowns distinct. Sequence: ${draft.scenes.map(s => s.label).join(' → ')}. Do not integrate into the case study before visual approval.`

  return <section className={`fs-editor ${focus ? 'is-focus' : ''}`}>
    <div className="fs-workspace">
      <header className="fs-workspace-heading"><div><span className="fs-overline">{flow.id === 'lifecycle' ? 'OVERVIEW' : `FLOW ${flow.id.slice(-2)}`} / {flow.phase.toUpperCase()}</span><h1>{draft.title}</h1></div><span className="fs-save-state"><Check size={12} />{saveState}</span></header>
      <div className={`fs-stage fs-stage--${stageColor}`}>
        <div className="fs-stage-tools"><span className="fs-stage-tag">TRANSPARENT FILM</span><div className="fs-surface-controls" aria-label="Preview surface (not exported)">{(['light', 'dark', 'check'] as const).map(color => <button key={color} className={`surface-${color}`} title={`${color} preview surface — not exported`} aria-label={`${color} preview surface`} aria-pressed={stageColor === color} onClick={() => setStageColor(color)} />)}</div><button className="fs-quiet" onClick={() => setFocus(v => !v)}>{focus ? 'Show workspace' : 'Clean preview'}</button></div>
        <canvas ref={canvas} width={WIDTH} height={HEIGHT} aria-label={`${draft.title}. Scene ${step + 1}: ${scene.label}. Automatic prototype film, not a working app.`} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }} data-mode={tab === 'design' ? mode : 'preview'} />
        <div className="fs-stage-caption"><span>{String(step + 1).padStart(2, '0')} / {String(draft.scenes.length).padStart(2, '0')}</span><span>{scene.label}</span><span>{playing ? 'Looping' : 'Paused'}</span></div>
      </div>
      <div className="fs-transport"><button aria-label={playing ? 'Pause loop' : 'Play loop'} className="fs-play" onClick={() => setPlaying(v => !v)}>{playing ? <Pause size={16} /> : <Play size={16} />}</button><button aria-label="Restart loop" onClick={() => { time.current = 0; setPlaying(true) }}><RotateCcw size={15} /></button><input ref={track} aria-label="Scrub animation" type="range" min="0" max={Math.max(0, timing.duration - 0.001)} step="0.01" defaultValue="0" onChange={e => { time.current = Number(e.target.value); setPlaying(false) }} /><output ref={clock} /></div>
      <div className="fs-timeline" aria-label="Scene timeline">{draft.scenes.map((s, i) => <button key={s.id} className={step === i ? 'is-active' : ''} onClick={() => seek(i)} aria-pressed={step === i}><span>{String(i + 1).padStart(2, '0')}<small>{(s.hold * settings.motion.hold / settings.motion.speed).toFixed(1)}s</small></span><b>{s.label}</b><i style={{ width: step > i ? '100%' : step === i ? '50%' : 0 }} /></button>)}</div>
      {notice && <div className="fs-notice" role="status">{notice}<button aria-label="Dismiss notice" onClick={() => setNotice('')}><X size={14} /></button></div>}
      <div className="fs-bottom-actions"><button onClick={() => downloadBlob(new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }), `filo-${flow.id}.json`)}><Download size={14} />Save project</button><button onClick={() => importInput.current?.click()}><Upload size={14} />Load project</button><button onClick={() => {
        const offscreen = document.createElement('canvas'); offscreen.width = WIDTH; offscreen.height = HEIGHT
        renderFrame(offscreen, project, assets, time.current)
        offscreen.toBlob(blob => { if (blob) downloadBlob(blob, `filo-${flow.id}-frame.png`) })
      }}><Image size={14} />PNG frame</button><button onClick={() => {
        if (!confirm('Reset this flow’s edits and motion to its original storyboard?')) return
        saveAllowed.current = false; localStorage.removeItem(STORAGE + flow.id); dial.setValues(structuredClone(DEFAULT_SETTINGS)); onReset()
      }}><RotateCcw size={14} />Reset flow</button></div>
      <input ref={importInput} hidden type="file" accept="application/json,.json" onChange={async e => {
        const file = e.target.files?.[0]; if (!file) return
        try {
          if (file.size > 1_000_000) throw new Error('Choose a project below 1 MB.')
          const imported = parseProject(JSON.parse(await file.text()))
          if (imported.flow.id !== flow.id) throw new Error(`Select ${imported.flow.title} in the library before loading this file.`)
          saveAllowed.current = true; setDraft(imported.flow); dial.setValues(imported.settings); time.current = 0; setStep(0); setPlaying(false); setNotice('Project loaded. All imported edits are saved on this browser.')
        } catch (error) { setNotice(`Could not load project: ${error instanceof Error ? error.message : String(error)}`) }
        e.target.value = ''
      }} />
    </div>
    <aside className="fs-inspector">
      <div className="fs-tabs" role="tablist" aria-label="Studio editors">{(['motion', 'design', 'reference'] as const).map(item => <button role="tab" aria-selected={tab === item} key={item} onClick={() => { setTab(item); if (item === 'design') seek(step) }}>{item === 'motion' ? 'Animate' : item === 'design' ? 'Visual edit' : 'Reference'}</button>)}</div>
      <div className="fs-tab-content" hidden={tab !== 'motion'}>
        <div className="fs-panel-head"><SlidersHorizontal size={15} /><h2>Motion direction</h2></div>
        <div className="fs-presets">{PRESETS.map(p => <button key={p.name} title={p.description} className={settings.motion.style === p.motion.style && settings.motion.hold === p.motion.hold ? 'is-active' : ''} onClick={() => { saveAllowed.current = true; dial.setValues({ motion: p.motion }); time.current = 0; setPlaying(true) }}>{p.name}</button>)}</div>
        <p className="fs-help">Timing, phone placement and screen style are live DialKit controls. Each flow keeps its own settings.</p>
        <DialRoot mode="inline" theme="light" productionEnabled />
      </div>
      <div className="fs-tab-content" hidden={tab !== 'design'}>
        <div className="fs-panel-head"><MousePointer2 size={15} /><h2>Direct visual editing</h2></div>
        <div className="fs-tools"><button className={mode === 'select' ? 'is-active' : ''} onClick={() => setMode('select')}><MousePointer2 size={14} />Select</button><button className={mode === 'move' ? 'is-active' : ''} onClick={() => setMode('move')}><Move size={14} />Phone</button><button className={mode === 'tap' ? 'is-active' : ''} onClick={() => setMode('tap')}>Tap point</button></div>
        <p className="fs-help">{mode === 'select' ? 'Click a screen element to edit it. Drag a content block to reposition it.' : mode === 'move' ? 'Drag the phone on the stage. Scale and rotation are in DialKit.' : 'Click inside the phone to place this scene’s animated tap.'}</p>
        <label className="fs-field">Scene<select value={step} onChange={e => seek(Number(e.target.value))}>{draft.scenes.map((s, i) => <option key={s.id} value={i}>{i + 1}. {s.label}</option>)}</select></label>
        <div className="fs-field-row"><label className="fs-field">Hold (seconds)<input type="number" min="0.5" max="12" step="0.1" value={scene.hold} onChange={e => { const n = Number(e.target.value); if (n >= 0.5 && n <= 12) updateScene({ hold: n }) }} /></label><div className="fs-reorder"><button aria-label="Move scene earlier" disabled={step === 0} onClick={() => {
          const next = [...draft.scenes]; [next[step - 1], next[step]] = [next[step], next[step - 1]]; setDraft({ ...draft, scenes: next }); time.current = timeline({ ...project, flow: { ...draft, scenes: next } }).clips[step - 1].start + 0.001; setStep(step - 1)
        }}><ArrowUp size={15} /></button><button aria-label="Move scene later" disabled={step === draft.scenes.length - 1} onClick={() => {
          const next = [...draft.scenes]; [next[step + 1], next[step]] = [next[step], next[step + 1]]; setDraft({ ...draft, scenes: next }); time.current = timeline({ ...project, flow: { ...draft, scenes: next } }).clips[step + 1].start + 0.001; setStep(step + 1)
        }}><ArrowDown size={15} /></button></div></div>
        <label className="fs-field">Element<select value={selection} onChange={e => setSelection(e.target.value)}><option value="title">Screen title</option><option value="description">Description</option>{scene.blocks.map((b, i) => <option value={b.id} key={b.id}>{i + 1}. {b.title || (b.kind === 'image' ? 'Image' : b.kind)}</option>)}<option value="cta">Primary action</option></select></label>
        {!block && <label className="fs-field">{selection === 'cta' ? 'Action label' : selection === 'description' ? 'Description' : 'Title'}<textarea rows={3} value={scene[selection === 'cta' ? 'cta' : selection === 'description' ? 'description' : 'title']} maxLength={250} onChange={e => updateScene({ [selection]: e.target.value })} /></label>}
        {block && <>
          {block.kind === 'image' ? <><label className="fs-field">Material artwork<select value={block.asset} onChange={e => updateBlock({ asset: e.target.value as Block['asset'] })}>{ASSETS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><div className="fs-asset-grid">{ASSETS.map(([id, label]) => <button key={id} aria-label={label} title={label} className={block.asset === id ? 'is-active' : ''} onClick={() => updateBlock({ asset: id })}><img src={`${ASSET_ROOT}${id}.webp`} alt="" loading="lazy" /></button>)}</div></> : <>
            <label className="fs-field">Heading<input value={block.title ?? ''} maxLength={140} onChange={e => updateBlock({ title: e.target.value })} /></label>
            {block.body !== undefined && <label className="fs-field">Body<textarea rows={4} value={block.body} maxLength={500} onChange={e => updateBlock({ body: e.target.value })} /></label>}
            {block.items && <div className="fs-row-editor"><span>Rows</span>{block.items.map((row, rowIndex) => <div className="fs-field-row" key={rowIndex}>
              <label className="fs-field">Label {rowIndex + 1}<input value={row[0]} maxLength={160} onChange={e => updateBlock({ items: block.items!.map((item, i) => i === rowIndex ? [e.target.value, item[1]] : item) })} /></label>
              <label className="fs-field">Value {rowIndex + 1}<input value={row[1]} maxLength={160} onChange={e => updateBlock({ items: block.items!.map((item, i) => i === rowIndex ? [item[0], e.target.value] : item) })} /></label>
            </div>)}</div>}
            {block.kind === 'notice' && <label className="fs-field">Evidence tone<select value={block.tone ?? 'neutral'} onChange={e => updateBlock({ tone: e.target.value as Block['tone'] })}><option value="neutral">Neutral</option><option value="success">Positive evidence</option><option value="warning">Unresolved / warning</option></select></label>}
          </>}
          <div className="fs-field-row">{(['x', 'y', 'scale', 'height'] as const).map(key => <label className="fs-field" key={key}>{key}<input type="number" min={key === 'height' ? 48 : key === 'scale' ? 0.5 : key === 'x' ? -300 : -500} max={key === 'height' ? 350 : key === 'scale' ? 1.5 : key === 'x' ? 300 : 500} step={key === 'scale' ? 0.05 : 1} value={block[key] ?? (key === 'scale' ? 1 : 0)} onChange={e => { if (e.target.validity.valid) updateBlock({ [key]: Number(e.target.value) }) }} /></label>)}</div>
          <button className="fs-secondary" onClick={() => updateBlock({ x: 0, y: 0, scale: 1 })}>Reset block position</button>
        </>}
        <div className="fs-step-nav"><button disabled={step === 0} onClick={() => seek(step - 1)}><ChevronLeft size={14} />Previous</button><button disabled={step === draft.scenes.length - 1} onClick={() => seek(step + 1)}>Next<ChevronRight size={14} /></button></div>
      </div>
      <div className="fs-tab-content" hidden={tab !== 'reference'}>
        <div className="fs-panel-head"><Image size={15} /><h2>Your storyboard</h2></div>
        <a className="fs-reference" href={`${ASSET_ROOT}reference-${String(flow.reference).padStart(2, '0')}.webp`} target="_blank" rel="noreferrer"><img src={`${ASSET_ROOT}reference-${String(flow.reference).padStart(2, '0')}.webp`} alt={`Supplied storyboard for ${flow.title}`} /></a>
        <p className="fs-help">Rebuilt from your Desktop flow screenshots. The surrounding storyboard canvas is reference only; it is never included in the film.</p>
        <h3>GraphicalUI connection</h3><p className="fs-help">The supplied registry URL installs only “Hello from Graphical” and contains no component files. This visual editor is built for the studio; it is not GraphicalUI. A real exported registry URL is needed to connect that component.</p>
        <h3>Design handoff</h3><p className="fs-prompt">{prompt}</p><button className="fs-secondary" onClick={async () => { try { await navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { setNotice('Clipboard access failed. Select the design handoff text and copy it manually.') } }}><Copy size={14} />{copied ? 'Copied' : 'Copy direction'}</button>
      </div>
      <section className="fs-export"><h2>Export the loop</h2><p>Transparent WebM · silent · 24 fps.<br />Only the phone. No editor, text panels or backdrop.</p><label className="fs-field">Resolution<select value={exportWidth} onChange={e => setExportWidth(Number(e.target.value))}><option value="540">540 × 780 · draft</option><option value="720">720 × 1040 · full</option></select></label>
        {exportStatus && !exportStatus.url ? <><progress max="1" value={exportStatus.progress} /><p role="status">{exportStatus.message}</p><button className="fs-secondary" onClick={() => abortExport.current?.abort()}>Cancel render</button></> : <button className="fs-export-button" onClick={exportVideo}><Download size={15} />Render transparent video</button>}
        {exportStatus?.url && <a className="fs-download" href={exportStatus.url} download={`filo-${flow.id}.webm`}><Check size={14} />Download rendered loop</a>}
        {exportError && <p className="fs-error" role="alert">{exportError}</p>}
        <small>Local dev server + headless Chromium + FFmpeg. Exports one full cycle including its return transition. Approval and sending are story states, not external actions.</small>
      </section>
    </aside>
  </section>
}

export type RenderAPI = { ready: boolean; setProject: (p: unknown, width?: number) => number; frame: (time: number) => string }
declare global { interface Window { filoRender?: RenderAPI } }
export function RenderOnly() {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    document.body.dataset.renderOnly = 'true'
    let alive = true
    loadAssets().then(assets => {
      if (!alive || !canvas.current) return
      let project: Project = { version: 1, flow: structuredClone(STUDIO_FLOWS[0]), settings: structuredClone(DEFAULT_SETTINGS) }
      window.filoRender = {
        ready: true,
        setProject(value, width = WIDTH) {
          project = parseProject(value)
          canvas.current!.width = width; canvas.current!.height = Math.round(width * HEIGHT / WIDTH)
          renderFrame(canvas.current!, project, assets, 0)
          return timeline(project).duration
        },
        frame(seconds) { renderFrame(canvas.current!, project, assets, seconds); return canvas.current!.toDataURL('image/png').split(',')[1] },
      }
      renderFrame(canvas.current, project, assets, 0)
    })
    return () => { alive = false; delete window.filoRender }
  }, [])
  return <canvas ref={canvas} width={WIDTH} height={HEIGHT} aria-label="Transparent phone render" />
}
