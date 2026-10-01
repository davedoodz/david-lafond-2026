import { useState } from 'react'
import { sampleTracking, watchTracking, type TrackingKeyframe, type Quad } from './watchTracking'
import './trackingEditor.css'

const STORAGE_KEY = 'unwind-watch-tracking-v1'
export function loadTracking(): TrackingKeyframe[] {
  try {
    const keys: TrackingKeyframe[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (Array.isArray(keys) && keys.length >= 2 && keys.every((key, i) =>
      Number.isInteger(key.frame) && key.frame >= 1 && key.frame <= 57 && (!i || key.frame > keys[i - 1].frame) &&
      Number.isFinite(key.opacity) && key.opacity >= 0 && key.opacity <= 1 &&
      Array.isArray(key.corners) && key.corners.length === 4 && key.corners.every(p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite)),
    )) return keys
  } catch { /* Invalid or unavailable local storage uses the checked-in poses. */ }
  return structuredClone(watchTracking)
}

type Props = { keys: TrackingKeyframe[]; onChange: (keys: TrackingKeyframe[]) => void; currentFrame: number; onSeek: (frame: number) => void }
const names = ['Top left', 'Top right', 'Bottom right', 'Bottom left']
export function TrackingEditor({ keys, onChange, currentFrame, onSeek }: Props) {
  const [selected, setSelected] = useState(keys[0].frame)
  const [status, setStatus] = useState('Edits save in this browser. Export JSON to keep them.')
  const pose = keys.find(k => k.frame === selected) ?? keys[0]
  const save = (next: TrackingKeyframe[]) => {
    onChange(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setStatus('Saved in this browser. Export JSON for source control.') }
    catch { setStatus('Browser storage unavailable. Export JSON to keep these edits.') }
  }
  const updateCorner = (corner: number, axis: number, value: number) => {
    if (!Number.isFinite(value)) return
    save(keys.map(key => key.frame === pose.frame ? { ...key, corners: key.corners.map((p, i) => i === corner ? p.map((n, a) => a === axis ? value : n) : [...p]) as Quad } : key))
    onSeek(pose.frame)
  }
  const add = () => {
    const frame = Math.max(1, Math.min(57, Math.round(currentFrame)))
    if (!keys.some(k => k.frame === frame)) save([...keys, { ...sampleTracking(keys, frame), frame }].sort((a, b) => a.frame - b.frame))
    setSelected(frame); onSeek(frame)
  }
  const exportData = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(keys, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = 'watchTracking.json'; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <aside className="watch-tracking-editor" aria-label="Watch tracking editor">
    <strong>Watch tracking · frame {currentFrame.toFixed(1)}</strong>
    <label>Scrub frame<input aria-label="Scrub frame" type="range" min="1" max="57" step="1" value={Math.round(currentFrame)} onChange={e => onSeek(+e.target.value)} /></label>
    <label>Tracking keyframe<select value={pose.frame} onChange={e => { setSelected(+e.target.value); onSeek(+e.target.value) }}>{keys.map(k => <option key={k.frame} value={k.frame}>Frame {k.frame}</option>)}</select></label>
    <div className="watch-tracking-editor__coords">
      <span>Source pixels</span><span>X</span><span>Y</span>
      {pose.corners.map((p, i) => <div className="watch-tracking-editor__row" key={i}><span>{i + 1}. {names[i]}</span>{p.map((n, axis) => <input key={axis} aria-label={`${names[i]} ${axis ? 'y' : 'x'}`} type="number" step="1" value={n} onChange={e => updateCorner(i, axis, e.target.valueAsNumber)} />)}</div>)}
    </div>
    <label>UI opacity<input aria-label="UI opacity" type="number" min="0" max="1" step="0.05" value={pose.opacity} onChange={e => { const opacity = e.target.valueAsNumber; if (Number.isFinite(opacity)) { save(keys.map(k => k.frame === pose.frame ? { ...k, opacity: Math.min(1, Math.max(0, opacity)) } : k)); onSeek(pose.frame) } }} /></label>
    <div className="watch-tracking-editor__actions"><button onClick={add}>Add current pose</button><button disabled={keys.length <= 2} onClick={() => { const next = keys.filter(k => k.frame !== pose.frame); save(next); setSelected(next[0].frame); onSeek(next[0].frame) }}>Delete pose</button><button onClick={exportData}>Export JSON</button><button onClick={() => { save(structuredClone(watchTracking)); setSelected(1); onSeek(1) }}>Reset poses</button></div>
    <small>{status}</small>
  </aside>
}
