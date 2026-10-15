import { createDialKit, createDialRoot } from 'dialkit/vanilla'
import 'dialkit/vanilla/styles.css'
import {
  iconOptions, landingOptions, letterOptions, mixHex, toHex,
  createArtSvg, paintArt, createFaceArt,
  faceOf, currentFace, turn as engineTurn,
  createStickerEngine, createLoopScheduler,
} from '../features/workStickers/engine.js'

/* STICKER STORYBOARD
 *   0ms  click: the letters reorganize using the active Letters preset
 *        (Morph · Wave · Cascade · Slot · Scramble · Fade), staggered per letter.
 *   0ms  the old sticker leaves and the next one lands using the Landing preset
 *        (Pop · Drop · Slap · Flip · Spin · Peel); the pill resizes to the new label.
 * ~420ms the default spring settles. Hover lifts artwork without changing copy.
 * Each sticker can override both presets. Reduced motion makes changes immediate.
 * Standalone study: local DialKit persistence only; never writes site tuning.json.
 */
const $ = (selector, scope = document) => scope.querySelector(selector)
const reduced = matchMedia('(prefers-reduced-motion: reduce)')
const compact = matchMedia('(max-width: 760px)')
const status = (message) => { $('#status').textContent = message }
// Each HTML study owns its copy, defaults, and persistence namespace.
const { id: studyId, theme, appearance, slots } = JSON.parse($('#sticker-config').textContent)
// A shared 24-unit, round-stroke family, landing/letter presets, and artwork helpers live in the
// shared sticker engine; this study only owns its gradient presets for the built-in editor.
const GRADIENTS = [
  { name: 'Sunset', from: '#ffc175', to: '#ff6f91', angle: 135 },
  { name: 'Lagoon', from: '#83c9f4', to: '#7be0b5', angle: 160 },
  { name: 'Lilac', from: '#b8a0f5', to: '#f5a3d6', angle: 135 },
  { name: 'Citrus', from: '#ffe066', to: '#ff9f43', angle: 180 },
  { name: 'Aurora', from: '#7fd1c7', to: '#6a7dff', angle: 120 },
  { name: 'Mint', from: '#a8dbbc', to: '#dff28a', angle: 150 },
]

const MAX_FACES = 6
const defaultLabel = (slot, index) => slot.labels[index] ?? slot.labels[0]
// Every face owns its words, artwork, fill, outline, size, placement, tilt, and motion overrides.
const faceConfig = (slot, index) => ({
  label: { type: 'text', default: defaultLabel(slot, index) },
  artwork: { type: 'select', options: iconOptions, default: slot.icons[index] ?? iconOptions[(index * 5) % iconOptions.length] },
  image: { type: 'image' },
  fill: { type: 'select', options: ['Solid', 'Gradient'], default: slot.fill ?? 'Solid' },
  color: slot.color,
  gradientEnd: slot.gradientEnd ?? mixHex(slot.color, '#ffffff', 0.5),
  gradientAngle: [slot.gradientAngle ?? 135, 0, 360, 1],
  tilt: [slot.tilt, -30, 30, 1],
  outline: [slot.outline ?? 2.5, 0, 6, 0.1],
  // Size multiplies the global Sticker Scale; offsets are in em relative to the words (up and right are positive).
  size: [1, 0.4, 2.5, 0.01],
  offsetX: [0, -1, 1, 0.01],
  offsetY: [0, -1, 1, 0.01],
  // Which side of the words the artwork sits on, and the space between them (em, added to the default).
  side: { type: 'select', options: ['Left', 'Right'], default: 'Left' },
  gap: [0, -0.4, 1, 0.01],
  // Hover pose: the artwork's angle (deg) and extra x/y shift (em; up and right are positive) while hovered.
  hoverRotate: [0, -45, 45, 1],
  hoverX: [0, -0.6, 0.6, 0.01],
  hoverY: [0, -0.6, 0.6, 0.01],
  ends: [0, 0, 1.5, 0.01],
  height: [1.28, 0.9, 2.2, 0.01],
  motion: {
    _collapsed: true,
    landing: { type: 'select', options: ['Global', ...landingOptions], default: 'Global' },
    letters: { type: 'select', options: ['Global', ...letterOptions], default: 'Global' },
  },
})
const STYLE_FIELDS = ['fill', 'color', 'gradientEnd', 'gradientAngle', 'outline', 'size', 'offsetX', 'offsetY', 'side', 'gap', 'ends', 'height', 'tilt', 'hoverRotate', 'hoverX', 'hoverY', 'motion']
const styleOf = (face) => Object.fromEntries(STYLE_FIELDS.map(key => [key, key === 'motion' ? { ...face.motion } : face[key]]))
// Face counts and removed stickers live beside DialKit: each sticker panel registers
// with exactly the faces it owns, so saved face values reconcile cleanly on reload.
const layoutKey = `${studyId}-layout-v1`
/* The dev server keeps every edit in studio/<id>.saved.json beside the HTML. On load that
 * file seeds this study's localStorage entries before DialKit reads them, so a refresh,
 * another browser, or a cleared cache all show the saved artwork and settings.
 * Uploaded images live in studio/sticker-uploads/ and are referenced by URL: inline data
 * URLs filled the ~5 MB localStorage quota, and DialKit drops failed writes silently. */
const savedFile = `/studio/${studyId}.saved.json`
const studyKeys = () => Object.keys(localStorage).filter(key => key === layoutKey || key.startsWith(`dialkit:${studyId}-`))
const uploads = new Map()
function uploadImage(dataUrl) {
  if (!uploads.has(dataUrl)) {
    uploads.set(dataUrl, fetch('/__dev/upload', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dataUrl }) })
      .then(response => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then(body => body.url)
      .catch(() => dataUrl))
  }
  return uploads.get(dataUrl)
}
async function externalizeImages(value) {
  if (typeof value === 'string') return value.startsWith('data:image/') ? uploadImage(value) : value
  if (!value || typeof value !== 'object') return value
  if (Array.isArray(value)) return Promise.all(value.map(externalizeImages))
  return Object.fromEntries(await Promise.all(Object.entries(value).map(async ([key, item]) => [key, await externalizeImages(item)])))
}
{
  let saved = null
  try {
    const response = await fetch(savedFile, { cache: 'no-store', headers: { accept: 'application/json' } })
    if (response.ok) saved = (await response.json()).storage ?? null
  } catch { /* no saved file yet, or a static build: keep this browser's values */ }
  const local = Object.fromEntries(studyKeys().flatMap(key => { try { return [[key, JSON.parse(localStorage.getItem(key))]] } catch { return [] } }))
  const storage = await externalizeImages(saved ?? local)
  // Clear first so rewriting never trips the quota on the old, larger copies.
  for (const key of studyKeys()) localStorage.removeItem(key)
  for (const [key, value] of Object.entries(storage)) {
    try { localStorage.setItem(key, JSON.stringify(value)) } catch { status('Browser storage is full. Edits still save to the study file.') }
  }
}
let fileTimer
function saveToFile() {
  clearTimeout(fileTimer)
  fileTimer = setTimeout(async () => {
    const storage = Object.fromEntries(studyKeys().map(key => [key, JSON.parse(localStorage.getItem(key))]))
    try {
      const response = await fetch('/__dev/save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ file: studyId, data: { version: 1, storage } }) })
      if (!response.ok) throw new Error(String(response.status))
    } catch {
      status(`Could not write studio/${studyId}.saved.json. Edits are kept in this browser only.`)
    }
  }, 400)
}
const layout = { faces: {}, removed: {}, copy: {} }
try { Object.assign(layout, JSON.parse(localStorage.getItem(layoutKey)) ?? {}) } catch { /* unreadable layout: use page defaults */ }
const saveLayout = () => { localStorage.setItem(layoutKey, JSON.stringify(layout)); saveToFile() }
const faceCount = (id) => Math.min(MAX_FACES, Math.max(1, layout.faces[id] ?? slots[id].labels.length))
function kitConfig(id) {
  const slot = slots[id]
  const count = faceCount(id)
  const faces = Object.fromEntries(Array.from({ length: count }, (_, i) => [`face${i + 1}`, { ...(i ? { _collapsed: true } : {}), ...faceConfig(slot, i) }]))
  return {
    face: { type: 'select', options: Array.from({ length: count }, (_, i) => `Face ${i + 1}`), default: 'Face 1' },
    // Loop timing belongs to the pill, not a face: how long its turn animates, then how long it rests before the next pill.
    // letterSpeed divides the letters' time only (2 = letters twice as fast as the artwork); it multiplies the global Letter Speed.
    timing: { hold: [2.5, 0.5, 12, 0.1], duration: [0.42, 0.15, 2, 0.01], letterSpeed: [1, 0.25, 3, 0.05] },
    ...faces,
    reset: { type: 'action', label: 'Reset this sticker' },
  }
}
const main = createDialKit('Look & motion', {
  appearance: {
    background: appearance.background, text: appearance.text, pill: appearance.pill,
    textSize: [appearance.textSize, 20, 52, 1], lineHeight: [appearance.lineHeight, 1.3, 1.9, 0.01],
    radius: [12, 0, 36, 1], stickerScale: [1, 0.6, 1.5, 0.01],
  },
  motion: {
    landing: { type: 'select', options: landingOptions, default: 'Pop' },
    letters: { type: 'select', options: letterOptions, default: 'Morph' },
    letterStagger: [0.018, 0, 0.08, 0.001],
    // Global speed for every letter motion on every pill; multiplies each pill's own Letter speed.
    letterSpeed: [1, 0.25, 3, 0.05],
    lift: [4, 0, 14, 1], hoverScale: [1.1, 1, 1.3, 0.01],
    spring: { type: 'spring', visualDuration: 0.42, bounce: 0.25 },
    loop: true,
    preview: { type: 'action', label: 'Preview on all stickers' },
  },
  // Tunes the Hop letter preset. Sliding letters hop over to their new places; new letters rise in, old ones float out.
  hop: {
    height: [0.14, 0, 0.6, 0.01],
    perDistance: [0, 0, 0.2, 0.005],
    peak: [0.5, 0.2, 0.8, 0.01],
    lean: [0, -20, 20, 1],
    rise: [0.35, 0, 1, 0.01],
    exit: [0.35, -1, 1, 0.01],
    blur: [3, 0, 12, 0.5],
    ripple: [0, 0, 3, 0.05],
  },
  reset: { type: 'action', label: 'Reset look & motion' },
}, {
  id: `${studyId}-look-v1`,
  persist: true,
  onAction: (path) => (path === 'reset' ? main.resetValues() : active().forEach(turn)),
})

// Built-in editor trigger lives beside each sticker, never inside its button.
const pencil = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.5 2.5 13.5 5.5 6 13H3v-3Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>'
const records = Object.entries(slots).map(([id, slot]) => {
  const button = $(`[data-slot="${id}"]`)
  const wrapper = document.createElement('span')
  wrapper.className = 'sticker-slot'
  button.before(wrapper)
  const edit = document.createElement('button')
  edit.type = 'button'
  edit.className = 'sticker-edit'
  edit.setAttribute('aria-label', `Edit ${slot.title} sticker`)
  edit.title = `Edit ${slot.title}`
  edit.innerHTML = pencil
  wrapper.append(button, edit)
  const icon = document.createElement('span')
  icon.className = 'sticker-art-window'
  icon.setAttribute('aria-hidden', 'true')
  const label = document.createElement('span')
  label.className = 'sticker-text'
  label.setAttribute('aria-hidden', 'true')
  button.replaceChildren(icon, label)
  const record = { id, title: slot.title, wrapper, button, edit, icon, label, kit: null, plain: null, current: '', imageKey: '', animations: [], revision: 0 }
  Object.defineProperty(record, 'values', { get: () => record.kit?.values })
  record.faceCount = () => faceCount(record.id)
  record.defaultLabel = (index) => defaultLabel(slot, index)
  record.titleFor = (text) => `${text} — click to turn, press E to edit`
  record.onRender = () => { if (editor.record === record) syncEditor() }
  button.addEventListener('click', () => {
    // Touch layouts show only the last-turned sticker's pencil, so pencils never cover copy.
    for (const other of document.querySelectorAll('.sticker-slot.is-recent')) other.classList.remove('is-recent')
    wrapper.classList.add('is-recent')
    // In Edit text mode a sticker click opens its editor instead of turning it.
    if (editingCopy) openEditor(record)
    else turn(record)
  })
  button.addEventListener('keydown', event => {
    if (event.key.toLowerCase() !== 'e' || event.metaKey || event.ctrlKey || event.altKey) return
    event.preventDefault()
    openEditor(record)
  })
  button.addEventListener('pointerenter', () => hover(record, true))
  button.addEventListener('pointerleave', () => hover(record, false))
  button.addEventListener('focus', () => hover(record, true))
  button.addEventListener('blur', () => hover(record, false))
  edit.addEventListener('click', () => openEditor(record))
  return record
})
// Kits mount after the editor exists because subscribing renders immediately.
function mountKit(record) {
  migrateSaved(record)
  record.kit = createDialKit(record.title, kitConfig(record.id), { id: `${studyId}-${record.id}-v1`, persist: true, defaultCollapsed: true, onAction: () => resetSticker(record) })
  // Loop turns only change which face shows; skipping the file write keeps idle tabs from overwriting real edits.
  record.unsubscribe = record.kit.subscribe(() => { render(record); if (!looping) saveToFile() })
}
let looping = false
// Earlier versions saved one style per sticker. Copy it into every face once,
// before DialKit reconciles (it drops keys the new config no longer has).
function migrateSaved(record) {
  const key = `dialkit:${studyId}-${record.id}-v1`
  let state
  try { state = JSON.parse(localStorage.getItem(key)) } catch { return }
  if (!state?.values || !('color' in state.values)) return
  const legacy = ['fill', 'color', 'gradientEnd', 'gradientAngle', 'tilt', 'motion.landing', 'motion.letters']
  const move = (values) => {
    if (!values || !('color' in values)) return values
    const next = { ...values }
    for (const name of legacy) {
      if (!(name in next)) continue
      for (let i = 1; i <= faceCount(record.id); i++) next[`face${i}.${name}`] ??= next[name]
      delete next[name]
    }
    return next
  }
  state.values = move(state.values)
  state.baseValues = move(state.baseValues)
  if (Array.isArray(state.presets)) state.presets = state.presets.map(preset => ({ ...preset, values: move(preset.values) }))
  localStorage.setItem(key, JSON.stringify(state))
}
const active = () => records.filter(record => record.kit)
function setCurrentFace(record, partial) {
  const index = faceOf(record)
  record.kit.setValues({ [`face${index}`]: { ...record.kit.values[`face${index}`], ...partial } })
}
const root = createDialRoot({ mode: 'inline', target: $('#dial-root'), theme, defaultOpen: true })

// Letters run at the pill's Letter speed times the global Letter Speed in Look & motion.
const lettersSpeed = (record) => record.kit.values.timing.letterSpeed * main.values.motion.letterSpeed
function turn(record) {
  engineTurn(record, (rec, label) => rec.kit.setValue('face', label), (rec) => status(`${rec.title} has one face. Add a face in its editor to make it turn.`))
}
function setFaceCount(record, count) {
  layout.faces[record.id] = count
  saveLayout()
  record.kit.updateConfig(kitConfig(record.id))
}
function addFace(record) {
  const count = faceCount(record.id)
  if (count >= MAX_FACES) return
  // A new face starts with the current face's look, so only the words and art need changing.
  const style = styleOf(currentFace(record))
  setFaceCount(record, count + 1)
  record.kit.setValues({ face: `Face ${count + 1}`, [`face${count + 1}`]: style })
  status(`Added face ${count + 1} to ${record.title}. Give it new words, artwork, or colors.`)
}
function applyStyleToAll(record) {
  const style = styleOf(currentFace(record))
  const updates = {}
  for (let i = 1; i <= faceCount(record.id); i++) updates[`face${i}`] = style
  record.kit.setValues(updates)
  status(`Applied face ${faceOf(record)}’s fill, outline, size, position, tilt, and motion to every ${record.title} face.`)
}
function removeFace(record) {
  const count = faceCount(record.id)
  if (count < 2) return
  const index = faceOf(record)
  const values = record.kit.values
  // Shift later faces down one slot, then drop the last folder.
  const updates = { face: `Face ${Math.min(index, count - 1)}` }
  for (let i = index; i < count; i++) updates[`face${i}`] = { ...values[`face${i + 1}`] }
  record.kit.setValues(updates)
  setFaceCount(record, count - 1)
  status(`Removed face ${index} from ${record.title}. ${count - 1} ${count - 1 === 1 ? 'face' : 'faces'} left.`)
}
function resetSticker(record) {
  delete layout.faces[record.id]
  saveLayout()
  record.kit.updateConfig(kitConfig(record.id))
  record.kit.resetValues()
}
function showPlain(record, text) {
  record.wrapper.hidden = true
  record.plain = document.createElement('span')
  record.plain.className = 'sticker-plain'
  record.plain.textContent = text
  record.wrapper.after(record.plain)
  if (editingCopy) makeEditable(record.plain, true)
}
function removeSticker(record) {
  const text = record.current || defaultLabel(slots[record.id], 0)
  if (editor.record === record) editor.element.hidePopover()
  record.animations.forEach(a => a.stop())
  record.hoverAnimation?.stop()
  record.unsubscribe()
  record.kit.destroy()
  record.kit = null
  showPlain(record, text)
  layout.removed[record.id] = text
  saveLayout()
  refreshLists()
  $(`#slot-shortcuts [data-restore="${record.id}"]`).focus({ preventScroll: true })
  status(`Removed the ${record.title} sticker. “${text}” stays as plain text. Restore it from the sidebar.`)
}
function restoreSticker(record) {
  record.plain?.remove()
  record.plain = null
  record.wrapper.hidden = false
  delete layout.removed[record.id]
  saveLayout()
  record.current = ''
  record.imageKey = ''
  mountKit(record)
  refreshLists()
  record.button.focus({ preventScroll: true })
  status(`Restored the ${record.title} sticker with its saved faces.`)
}
const { render, hover } = createStickerEngine({ getLook: () => main.values, reducedMotion: reduced })

/* Built-in sticker editor: a light-dismiss popover anchored to the sticker.
 * Every field writes through the sticker's DialKit controller, so the panel,
 * persistence, and export stay one source of truth. */
const editor = { record: null, element: document.createElement('div') }
editor.element.id = 'sticker-editor'
editor.element.className = 'sticker-editor'
editor.element.setAttribute('popover', 'auto')
editor.element.setAttribute('role', 'dialog')
editor.element.setAttribute('aria-labelledby', 'se-title')
editor.element.innerHTML = `
  <header class="se-header">
    <span class="se-preview" aria-hidden="true"></span>
    <div><span class="se-eyebrow" id="se-eyebrow">Edit sticker</span><h2 id="se-title"></h2></div>
    <button type="button" class="se-close" aria-label="Close sticker editor">×</button>
  </header>
  <div class="se-section">
    <div class="se-label-row"><span class="se-label" id="se-face-label">Faces</span><button type="button" class="se-link" id="se-remove-face">Remove this face</button></div>
    <div class="se-row">
      <div class="se-segment se-faces" role="radiogroup" aria-labelledby="se-face-label"></div>
      <button type="button" class="se-button se-add" id="se-add-face" aria-label="Add a face" title="Add a face">+</button>
    </div>
    <label class="se-label" for="se-text">Words</label>
    <input id="se-text" class="se-input" maxlength="40" autocomplete="off" spellcheck="false" />
  </div>
  <div class="se-section">
    <span class="se-label" id="se-art-label">Artwork</span>
    <div class="se-art-grid" role="group" aria-labelledby="se-art-label"></div>
    <div class="se-row">
      <button type="button" class="se-button" id="se-upload">Upload image</button>
      <button type="button" class="se-button" id="se-remove-image">Use artwork</button>
      <input type="file" id="se-file" accept="image/*" hidden />
    </div>
  </div>
  <div class="se-section">
    <div class="se-label-row"><span class="se-label" id="se-fill-label">Fill <span class="se-scope">· this face</span></span><button type="button" class="se-link" id="se-apply-all">Use on all faces</button></div>
    <div class="se-segment" role="radiogroup" aria-labelledby="se-fill-label">
      <button type="button" role="radio" data-fill="Solid">Solid</button><button type="button" role="radio" data-fill="Gradient">Gradient</button>
    </div>
    <div class="se-row se-colors">
      <label class="se-color"><input type="color" id="se-from" /><span id="se-from-label">Color</span></label>
      <label class="se-color se-gradient-only"><input type="color" id="se-to" /><span>End</span></label>
      <button type="button" class="se-button se-gradient-only" id="se-swap" aria-label="Swap gradient colors">⇄</button>
    </div>
    <label class="se-label se-gradient-only se-range" for="se-angle">Angle <output id="se-angle-value"></output></label>
    <input type="range" class="se-gradient-only" id="se-angle" min="0" max="360" step="1" />
    <div class="se-swatches" role="group" aria-label="Gradient presets"></div>
    <p class="se-note" id="se-fill-note" hidden>Fill colors apply to drawn artwork, not uploaded images.</p>
  </div>
  <div class="se-section">
    <label class="se-label se-range" for="se-outline">White outline <output id="se-outline-value"></output></label>
    <input type="range" id="se-outline" min="0" max="6" step="0.1" />
    <div class="se-label-row"><span class="se-label">Placement</span><button type="button" class="se-link" id="se-center">Reset size &amp; position</button></div>
    <span class="se-label" id="se-side-label">Artwork side</span>
    <div class="se-segment" role="radiogroup" aria-labelledby="se-side-label">
      <button type="button" role="radio" data-side="Left">Left of words</button><button type="button" role="radio" data-side="Right">Right of words</button>
    </div>
    <label class="se-label se-range" for="se-size">Size <output id="se-size-value"></output></label>
    <input type="range" id="se-size" min="0.4" max="2.5" step="0.01" />
    <label class="se-label se-range" for="se-x">Left / right <output id="se-x-value"></output></label>
    <input type="range" id="se-x" min="-1" max="1" step="0.01" />
    <label class="se-label se-range" for="se-y">Up / down <output id="se-y-value"></output></label>
    <input type="range" id="se-y" min="-1" max="1" step="0.01" />
    <label class="se-label se-range" for="se-gap">Gap to words <output id="se-gap-value"></output></label>
    <input type="range" id="se-gap" min="-0.4" max="1" step="0.01" />
    <label class="se-label se-range" for="se-ends">Pill ends <output id="se-ends-value"></output></label>
    <input type="range" id="se-ends" min="0" max="1.5" step="0.01" />
    <label class="se-label se-range" for="se-height">Pill height <output id="se-height-value"></output></label>
    <input type="range" id="se-height" min="0.9" max="2.2" step="0.01" />
    <label class="se-label se-range" for="se-tilt">Tilt <output id="se-tilt-value"></output></label>
    <input type="range" id="se-tilt" min="-30" max="30" step="1" />
    <div class="se-label-row"><span class="se-label">On hover</span><button type="button" class="se-link" id="se-hover-reset">Reset hover</button></div>
    <label class="se-label se-range" for="se-hover-rotate">Angle <output id="se-hover-rotate-value"></output></label>
    <input type="range" id="se-hover-rotate" min="-45" max="45" step="1" />
    <label class="se-label se-range" for="se-hover-x">Left / right <output id="se-hover-x-value"></output></label>
    <input type="range" id="se-hover-x" min="-0.6" max="0.6" step="0.01" />
    <label class="se-label se-range" for="se-hover-y">Up / down <output id="se-hover-y-value"></output></label>
    <input type="range" id="se-hover-y" min="-0.6" max="0.6" step="0.01" />
    <div class="se-row se-selects">
      <label><span class="se-label">Landing</span><select id="se-landing" class="se-input"></select></label>
      <label><span class="se-label">Letters</span><select id="se-letters" class="se-input"></select></label>
    </div>
  </div>
  <div class="se-section">
    <span class="se-label">Loop timing · this pill</span>
    <label class="se-label se-range" for="se-duration">Animation <output id="se-duration-value"></output></label>
    <input type="range" id="se-duration" min="0.15" max="2" step="0.01" />
    <label class="se-label se-range" for="se-hold">Hold before next pill <output id="se-hold-value"></output></label>
    <input type="range" id="se-hold" min="0.5" max="12" step="0.1" />
    <label class="se-label se-range" for="se-letter-speed">Letter speed <output id="se-letter-speed-value"></output></label>
    <input type="range" id="se-letter-speed" min="0.25" max="3" step="0.05" />
  </div>
  <footer class="se-footer">
    <button type="button" class="se-button se-danger" id="se-remove-sticker">Remove sticker</button>
    <span class="se-footer-actions"><button type="button" class="se-button" id="se-reset">Reset</button><button type="button" class="se-button se-primary" id="se-turn">Turn</button></span>
  </footer>`
document.body.append(editor.element)
const field = (id) => $(`#${id}`, editor.element)
const artButtons = iconOptions.map(name => {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'se-art'
  button.dataset.art = name
  button.setAttribute('aria-label', name)
  button.title = name
  button.append(createArtSvg(name))
  button.addEventListener('click', () => setFace({ artwork: name, image: '' }))
  field('se-art-label').nextElementSibling.append(button)
  return button
})
const swatches = GRADIENTS.map(preset => {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'se-swatch'
  button.title = preset.name
  button.setAttribute('aria-label', `${preset.name} gradient`)
  button.style.background = `linear-gradient(${preset.angle}deg, ${preset.from}, ${preset.to})`
  button.addEventListener('click', () => setFace({ fill: 'Gradient', color: preset.from, gradientEnd: preset.to, gradientAngle: preset.angle }))
  $('.se-swatches', editor.element).append(button)
  return { button, preset }
})
for (const [id, options] of [['se-landing', landingOptions], ['se-letters', letterOptions]]) {
  field(id).append(...['Global', ...options].map(option => new Option(option === 'Global' ? 'Use global' : option, option)))
}
const faceIndex = () => faceOf(editor.record)
function setFace(partial) {
  setCurrentFace(editor.record, partial)
}
function setInput(input, value) {
  if (document.activeElement !== input && value !== null && input.value !== String(value)) input.value = value
}
function syncEditor() {
  const record = editor.record
  if (!record) return
  const values = record.kit.values
  const index = faceIndex()
  const face = values[`face${index}`]
  const gradient = face.fill === 'Gradient'
  field('se-title').textContent = record.title
  // Everything below the face picker edits only this face.
  field('se-eyebrow').textContent = `Editing face ${index} of ${faceCount(record.id)}`
  const preview = $('.se-preview', editor.element)
  const previewArt = createFaceArt(face)
  preview.replaceChildren(previewArt)
  if (previewArt.tagName === 'svg') paintArt(previewArt, face)
  preview.style.rotate = `${face.tilt}deg`
  editor.element.style.setProperty('--accent', face.color)
  const count = faceCount(record.id)
  const faces = $('.se-faces', editor.element)
  if (faces.children.length !== count) {
    faces.replaceChildren(...Array.from({ length: count }, (_, i) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.setAttribute('role', 'radio')
      button.dataset.face = String(i + 1)
      button.textContent = String(i + 1)
      button.setAttribute('aria-label', `Face ${i + 1}`)
      return button
    }))
  }
  for (const button of faces.children) button.setAttribute('aria-checked', String(Number(button.dataset.face) === index))
  field('se-add-face').disabled = count >= MAX_FACES
  field('se-remove-face').disabled = count < 2
  for (const button of editor.element.querySelectorAll('[data-fill]')) button.setAttribute('aria-checked', String(button.dataset.fill === face.fill))
  field('se-apply-all').disabled = count < 2
  setInput(field('se-text'), face.label)
  field('se-text').placeholder = defaultLabel(slots[record.id], index - 1)
  for (const button of artButtons) {
    button.setAttribute('aria-pressed', String(!face.image && button.dataset.art === face.artwork))
    paintArt(button.firstElementChild, face)
  }
  field('se-remove-image').hidden = !face.image
  field('se-fill-note').hidden = !face.image
  editor.element.classList.toggle('is-gradient', gradient)
  field('se-from-label').textContent = gradient ? 'Start' : 'Color'
  setInput(field('se-from'), toHex(face.color))
  setInput(field('se-to'), toHex(face.gradientEnd))
  setInput(field('se-angle'), face.gradientAngle)
  field('se-angle-value').textContent = `${face.gradientAngle}°`
  setInput(field('se-tilt'), face.tilt)
  field('se-tilt-value').textContent = `${face.tilt}°`
  setInput(field('se-hover-rotate'), face.hoverRotate)
  field('se-hover-rotate-value').textContent = `${face.hoverRotate}°`
  setInput(field('se-hover-x'), face.hoverX)
  field('se-hover-x-value').textContent = `${face.hoverX > 0 ? '+' : ''}${face.hoverX.toFixed(2)} em`
  setInput(field('se-hover-y'), face.hoverY)
  field('se-hover-y-value').textContent = `${face.hoverY > 0 ? '+' : ''}${face.hoverY.toFixed(2)} em`
  setInput(field('se-outline'), face.outline)
  field('se-outline-value').textContent = face.outline ? face.outline.toFixed(1) : 'None'
  preview.style.setProperty('--outline', String(face.outline))
  setInput(field('se-size'), face.size)
  field('se-size-value').textContent = `${Math.round(face.size * 100)}%`
  setInput(field('se-x'), face.offsetX)
  field('se-x-value').textContent = `${face.offsetX > 0 ? '+' : ''}${face.offsetX.toFixed(2)} em`
  setInput(field('se-y'), face.offsetY)
  field('se-y-value').textContent = `${face.offsetY > 0 ? '+' : ''}${(face.offsetY || 0).toFixed(2)} em`
  for (const button of editor.element.querySelectorAll('[data-side]')) button.setAttribute('aria-checked', String(button.dataset.side === face.side))
  setInput(field('se-gap'), face.gap)
  field('se-gap-value').textContent = `${face.gap > 0 ? '+' : ''}${(face.gap || 0).toFixed(2)} em`
  setInput(field('se-ends'), face.ends)
  field('se-ends-value').textContent = `+${(face.ends || 0).toFixed(2)} em`
  setInput(field('se-height'), face.height)
  field('se-height-value').textContent = `${face.height.toFixed(2)} em`
  const timing = editor.record.kit.values.timing
  setInput(field('se-duration'), timing.duration)
  field('se-duration-value').textContent = `${timing.duration.toFixed(2)} s`
  setInput(field('se-hold'), timing.hold)
  field('se-hold-value').textContent = `${timing.hold.toFixed(1)} s`
  setInput(field('se-letter-speed'), timing.letterSpeed)
  field('se-letter-speed-value').textContent = `${timing.letterSpeed.toFixed(2)}× · ${(timing.duration / lettersSpeed(editor.record)).toFixed(2)} s`
  field('se-landing').value = face.motion.landing
  field('se-letters').value = face.motion.letters
  for (const { button, preset } of swatches) {
    const active = gradient && toHex(face.color) === preset.from && toHex(face.gradientEnd) === preset.to && face.gradientAngle === preset.angle
    button.setAttribute('aria-pressed', String(active))
  }
}
function placeEditor() {
  const element = editor.element
  if (!editor.record || compact.matches) { element.style.left = ''; element.style.top = ''; return }
  const anchor = editor.record.button.getBoundingClientRect()
  const { width, height } = element.getBoundingClientRect()
  const gap = 12
  const clamp = (value, max) => Math.min(Math.max(gap, value), max - gap)
  // Never cover the sticker being edited: below, then beside, then above.
  let left = clamp(anchor.left, innerWidth - width)
  let top = anchor.bottom + gap
  if (top + height > innerHeight - gap) {
    const right = anchor.right + gap
    const beside = right + width <= innerWidth - gap ? right : anchor.left - gap - width >= gap ? anchor.left - gap - width : null
    if (beside !== null) {
      left = beside
      top = clamp(anchor.top + anchor.height / 2 - height / 2, innerHeight - height)
    } else top = Math.max(gap, anchor.top - height - gap)
  }
  element.style.left = `${left}px`
  element.style.top = `${top}px`
}
function openEditor(record) {
  editor.record = record
  syncEditor()
  if (!editor.element.matches(':popover-open')) editor.element.showPopover()
  placeEditor()
  if (compact.matches) {
    // The bottom sheet covers most of a phone; keep the live sticker visible above it.
    scrollTo({ top: scrollY + record.button.getBoundingClientRect().top - 72, behavior: reduced.matches ? 'instant' : 'smooth' })
    // Avoid summoning the on-screen keyboard; focus the active face instead.
    $('[data-face][aria-checked=true]', editor.element).focus({ preventScroll: true })
  } else field('se-text').focus({ preventScroll: true })
}
editor.element.addEventListener('toggle', event => {
  if (event.newState === 'open') return
  const record = editor.record
  editor.record = null
  // A removed sticker has no pencil left; return focus to its Restore button.
  const target = record?.kit ? record.edit : $(`#slot-shortcuts [data-restore="${record?.id}"]`)
  if (editor.element.contains(document.activeElement) || document.activeElement === document.body) target?.focus({ preventScroll: true })
})
addEventListener('resize', placeEditor)
addEventListener('scroll', placeEditor, { capture: true, passive: true })
field('se-text').addEventListener('input', event => setFace({ label: event.target.value }))
$('.se-faces', editor.element).addEventListener('click', event => {
  const button = event.target.closest('[data-face]')
  if (button) editor.record.kit.setValue('face', `Face ${button.dataset.face}`)
})
field('se-add-face').addEventListener('click', () => {
  addFace(editor.record)
  field('se-text').focus({ preventScroll: true })
  field('se-text').select()
})
field('se-remove-face').addEventListener('click', () => removeFace(editor.record))
field('se-remove-sticker').addEventListener('click', () => removeSticker(editor.record))
for (const button of editor.element.querySelectorAll('[data-fill]')) button.addEventListener('click', () => setFace({ fill: button.dataset.fill }))
field('se-apply-all').addEventListener('click', () => applyStyleToAll(editor.record))
for (const group of editor.element.querySelectorAll('.se-segment')) {
  group.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
    const buttons = [...group.querySelectorAll('button')]
    const next = buttons[(buttons.indexOf(document.activeElement) + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length]
    event.preventDefault()
    next.focus()
    next.click()
  })
}
field('se-from').addEventListener('input', event => setFace({ color: event.target.value }))
field('se-to').addEventListener('input', event => setFace({ fill: 'Gradient', gradientEnd: event.target.value }))
field('se-swap').addEventListener('click', () => {
  const { color, gradientEnd } = currentFace(editor.record)
  setFace({ color: gradientEnd, gradientEnd: color })
})
field('se-angle').addEventListener('input', event => setFace({ gradientAngle: Number(event.target.value) }))
field('se-tilt').addEventListener('input', event => setFace({ tilt: Number(event.target.value) }))
// Hover sliders show the hover pose on the sticker while dragging, then let it settle back.
let hoverPreview
function previewHover(partial) {
  const record = editor.record
  setFace(partial)
  hover(record, true)
  clearTimeout(hoverPreview)
  hoverPreview = setTimeout(() => hover(record, record.button.matches(':hover, :focus-visible')), 900)
}
field('se-hover-rotate').addEventListener('input', event => previewHover({ hoverRotate: Number(event.target.value) }))
field('se-hover-x').addEventListener('input', event => previewHover({ hoverX: Number(event.target.value) }))
field('se-hover-y').addEventListener('input', event => previewHover({ hoverY: Number(event.target.value) }))
field('se-hover-reset').addEventListener('click', () => previewHover({ hoverRotate: 0, hoverX: 0, hoverY: 0 }))
field('se-outline').addEventListener('input', event => setFace({ outline: Number(event.target.value) }))
field('se-size').addEventListener('input', event => setFace({ size: Number(event.target.value) }))
field('se-x').addEventListener('input', event => setFace({ offsetX: Number(event.target.value) }))
field('se-y').addEventListener('input', event => setFace({ offsetY: Number(event.target.value) }))
field('se-gap').addEventListener('input', event => setFace({ gap: Number(event.target.value) }))
field('se-ends').addEventListener('input', event => setFace({ ends: Number(event.target.value) }))
field('se-height').addEventListener('input', event => setFace({ height: Number(event.target.value) }))
field('se-duration').addEventListener('input', event => editor.record.kit.setValue('timing.duration', Number(event.target.value)))
field('se-hold').addEventListener('input', event => editor.record.kit.setValue('timing.hold', Number(event.target.value)))
field('se-letter-speed').addEventListener('input', event => editor.record.kit.setValue('timing.letterSpeed', Number(event.target.value)))
for (const button of editor.element.querySelectorAll('[data-side]')) button.addEventListener('click', () => setFace({ side: button.dataset.side }))
field('se-center').addEventListener('click', () => setFace({ size: 1, offsetX: 0, offsetY: 0, side: 'Left', gap: 0, ends: 0, height: 1.28 }))
field('se-landing').addEventListener('change', event => setFace({ motion: { ...currentFace(editor.record).motion, landing: event.target.value } }))
field('se-letters').addEventListener('change', event => setFace({ motion: { ...currentFace(editor.record).motion, letters: event.target.value } }))
field('se-upload').addEventListener('click', () => field('se-file').click())
field('se-remove-image').addEventListener('click', () => setFace({ image: '' }))
field('se-file').addEventListener('change', event => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) { status('Choose an image file up to 10 MB.'); return }
  const reader = new FileReader()
  reader.addEventListener('load', async () => {
    const record = editor.record
    const image = await uploadImage(String(reader.result))
    if (record?.kit) setCurrentFace(record, { image })
    status(image.startsWith('data:') ? `Uploaded ${file.name} to ${record?.title ?? 'the sticker'}. Saved in this browser only.` : `Uploaded ${file.name} to ${record?.title ?? 'the sticker'}. Saved to ${image.slice(1)}.`)
  })
  reader.addEventListener('error', () => status(`Could not read ${file.name}. Try another image.`))
  reader.readAsDataURL(file)
})
field('se-reset').addEventListener('click', () => resetSticker(editor.record))
field('se-turn').addEventListener('click', () => turn(editor.record))
$('.se-close', editor.element).addEventListener('click', () => editor.element.hidePopover())

/* The loop turns one pill at a time, in reading order. Each pill animates for its own
 * Animation time, then rests for its Hold time before the next pill turns. */
const loop = createLoopScheduler({
  list: () => editingCopy ? [] : active().filter(record => faceCount(record.id) > 1)
    .sort((a, b) => (a.button.compareDocumentPosition(b.button) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)),
  // A pill being edited, hovered, or focused keeps its face; the loop moves on to the next one.
  skip: (record) => record === editor.record || record.wrapper.matches(':hover, :focus-within'),
  turn: (record) => { looping = true; try { turn(record) } finally { looping = false } },
  // Wait for whichever finishes last, the artwork or the letters, then hold.
  getTiming: (record) => ({ duration: record.kit.values.timing.duration, hold: record.kit.values.timing.hold, letterSpeed: lettersSpeed(record) }),
  loopEnabled: () => main.values.motion.loop,
  reducedMotion: reduced,
  isHidden: () => document.hidden,
})
const schedule = loop.schedule
const unsubscribeMain = main.subscribe(values => {
  const a = values.appearance
  const style = document.body.style
  for (const [key, value] of Object.entries({ page: a.background, text: a.text, pill: a.pill, size: `${a.textSize}px`, leading: a.lineHeight, radius: `${a.radius}px`, 'icon-scale': a.stickerScale })) style.setProperty(`--${key}`, value)
  active().forEach(record => hover(record, false))
  schedule()
  saveToFile()
})
/* Editable copy: each plain-text run between stickers becomes its own inline
 * text field in Edit text mode. Text is always read and written via textContent. */
let editingCopy = false
const copyRuns = []
for (const [p, paragraph] of [...$('#intro').querySelectorAll('p')].entries()) {
  let r = 0
  for (const node of [...paragraph.childNodes]) {
    if (node.nodeType !== Node.TEXT_NODE || !node.data.trim()) continue
    const span = document.createElement('span')
    span.className = 'copy-run'
    span.dataset.run = `${p}.${r++}`
    span.dataset.original = node.data
    span.textContent = layout.copy[span.dataset.run] ?? node.data
    node.replaceWith(span)
    copyRuns.push(span)
  }
}
const editableCopy = () => [...copyRuns, ...$('#intro').querySelectorAll('.sticker-plain')]
function makeEditable(element, on) {
  if (!on) {
    for (const name of ['contenteditable', 'role', 'aria-label', 'spellcheck']) element.removeAttribute(name)
    return
  }
  try { element.contentEditable = 'plaintext-only' } catch { element.contentEditable = 'true' }
  element.spellcheck = true
  element.setAttribute('role', 'textbox')
  element.setAttribute('aria-label', 'Intro text')
}
function setCopyEditing(on) {
  editingCopy = on
  document.body.classList.toggle('is-editing-copy', on)
  const toggle = $('#edit-copy')
  toggle.setAttribute('aria-pressed', String(on))
  toggle.textContent = on ? 'Done editing' : 'Edit text'
  $('#reset-copy').hidden = !on
  for (const element of editableCopy()) makeEditable(element, on)
  syncBreaks()
  if (on && editor.record) editor.element.hidePopover()
  status(on ? 'Editing text. Click any words to change them. Click a sticker to edit its words. Changes save in this browser.' : 'Text saved in this browser.')
  schedule()
}
function saveCopy(element) {
  // contenteditable may insert non-breaking spaces; keep typed line breaks (rendered with pre-line).
  const text = element.textContent.replace(/\u00a0/g, ' ').replace(/\r\n?/g, '\n')
  if (element.classList.contains('sticker-plain')) {
    const record = records.find(item => item.plain === element)
    if (record) layout.removed[record.id] = text
  } else if (text === element.dataset.original) delete layout.copy[element.dataset.run]
  else layout.copy[element.dataset.run] = text
  saveLayout()
}
/* A break typed at the very end of a run pushes the next sticker down, and the caret
 * cannot easily reach it. Edit mode shows a join chip at the start of that line. */
function syncBreaks() {
  for (const chip of $('#intro').querySelectorAll('.copy-join')) chip.remove()
  if (!editingCopy) return
  for (const element of editableCopy()) {
    if (!/\n\s*$/.test(element.textContent)) continue
    const chip = document.createElement('button')
    chip.type = 'button'
    chip.className = 'copy-join'
    chip.contentEditable = 'false'
    chip.textContent = '↑'
    chip.title = 'Join with the line above'
    chip.setAttribute('aria-label', 'Remove line break: join with the line above')
    chip.addEventListener('click', () => {
      element.textContent = element.textContent.replace(/\s*\n\s*$/, ' ')
      saveCopy(element)
      syncBreaks()
      status('Line break removed. The next phrase moves back up when it fits.')
    })
    element.after(chip)
  }
}
$('#intro').addEventListener('input', event => {
  const element = event.target.closest?.('.copy-run, .sticker-plain')
  if (editingCopy && element) { saveCopy(element); syncBreaks() }
})
$('#intro').addEventListener('keydown', event => {
  if (!editingCopy || !event.target.matches('.copy-run, .sticker-plain')) return
  // Enter moves the following text to the next line; Escape finishes the run.
  if (event.key === 'Escape') { event.preventDefault(); event.target.blur() }
  else if (event.key === 'Enter') {
    event.preventDefault()
    // insertText keeps native undo and fires input, which saves the run.
    document.execCommand('insertText', false, '\n')
  }
})
$('#edit-copy').addEventListener('click', () => setCopyEditing(!editingCopy))
$('#reset-copy').addEventListener('click', () => {
  layout.copy = {}
  saveLayout()
  for (const run of copyRuns) run.textContent = run.dataset.original
  syncBreaks()
  status('Text reset to the original copy. Sticker words are unchanged.')
})
for (const record of records) {
  if (record.id in layout.removed) showPlain(record, layout.removed[record.id])
  else mountKit(record)
}
reduced.addEventListener('change', () => {
  active().forEach(record => { record.current = ''; render(record) })
  schedule()
})
document.addEventListener('visibilitychange', schedule)
$('#cycle-all').addEventListener('click', () => active().forEach(turn))
$('#toggle-editor').addEventListener('click', event => {
  const hidden = document.body.classList.toggle('editor-hidden')
  event.currentTarget.setAttribute('aria-expanded', String(!hidden))
  event.currentTarget.textContent = hidden ? 'Show controls' : 'Hide controls'
  if (hidden && editor.record) editor.element.hidePopover()
})
// Sidebar shortcuts and Graphical targets follow which stickers are live.
function refreshLists() {
  const shortcuts = records.map(record => {
    const button = document.createElement('button')
    button.type = 'button'
    if (record.kit) {
      button.textContent = record.title
      button.addEventListener('click', () => openEditor(record))
    } else {
      button.className = 'is-removed'
      button.dataset.restore = record.id
      button.textContent = `↺ ${record.title}`
      button.setAttribute('aria-label', `Restore ${record.title} sticker`)
      button.title = 'Restore this sticker'
      button.addEventListener('click', () => restoreSticker(record))
    }
    return button
  })
  $('#slot-shortcuts').replaceChildren(...shortcuts)
  const select = $('#token-target')
  for (const option of [...select.options]) if (option.value.includes(':')) option.remove()
  for (const record of active()) select.append(new Option(`${record.title} · current face color`, `${record.id}:color`), new Option(`${record.title} · current face gradient end`, `${record.id}:gradientEnd`))
}
refreshLists()
function selectTab(id) {
  for (const name of ['dial', 'graphical']) {
    const selected = name === id
    $(`#${name}-tab`).setAttribute('aria-selected', String(selected))
    $(`#${name}-tab`).tabIndex = selected ? 0 : -1
    $(`#${name}-panel`).hidden = !selected
  }
}
for (const name of ['dial', 'graphical']) {
  $(`#${name}-tab`).addEventListener('click', () => selectTab(name))
  $(`#${name}-tab`).addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'Home' ? 'dial' : event.key === 'End' ? 'graphical' : name === 'dial' ? 'graphical' : 'dial'
    selectTab(next)
    $(`#${next}-tab`).focus()
  })
}
$('#read-theme').addEventListener('click', () => {
  const css = $('#theme-css').value.replace(/\/\*[\s\S]*?\*\//g, '')
  const tokens = new Map()
  for (const match of css.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+)\s*(?:;|(?=\}))/g)) {
    const value = match[2].trim()
    if (CSS.supports('color', value) && !/var\(|currentcolor|inherit|initial|unset|revert|light-dark\(/i.test(value)) tokens.set(match[1], value)
  }
  $('#token-colors').replaceChildren()
  for (const [name, color] of tokens) {
    const button = document.createElement('button')
    const chip = document.createElement('i')
    chip.style.backgroundColor = color
    chip.setAttribute('aria-hidden', 'true')
    button.append(chip, document.createTextNode(name))
    button.title = color
    button.addEventListener('click', () => {
      const target = $('#token-target').value
      if (target.startsWith('appearance.')) main.setValue(target, color)
      else {
        const [id, key] = target.split(':')
        const record = records.find(item => item.id === id)
        setCurrentFace(record, key === 'gradientEnd' ? { fill: 'Gradient', gradientEnd: color } : { color })
      }
      status(`Applied ${name} to ${$('#token-target').selectedOptions[0].textContent}. Saved locally.`)
    })
    $('#token-colors').append(button)
  }
  status(tokens.size ? `${tokens.size} literal color tokens found. Choose a target, then a color. Variable aliases are not imported.` : 'No literal color tokens found. Paste CSS declarations such as --accent: #a8dbbc; or --accent: oklch(0.8 0.1 150);')
})
$('#export').addEventListener('click', () => {
  const settings = { version: 4, look: main.getValues(), copy: layout.copy, faces: Object.fromEntries(records.map(record => [record.id, faceCount(record.id)])), removed: layout.removed, stickers: Object.fromEntries(active().map(record => [record.id, record.kit.getValues()])) }
  const url = URL.createObjectURL(new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${studyId}.json`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  status(`Exported ${studyId}.json, including custom images. The live portfolio is unchanged.`)
})
// Re-measure after the local font loads; all widths remain intrinsic at rest.
document.fonts.ready.then(() => active().forEach(record => { record.button.style.width = '' }))
window.addEventListener('pageshow', event => { if (event.persisted) schedule() })
window.addEventListener('pagehide', event => {
  loop.stop()
  if (event.persisted) return
  unsubscribeMain()
  records.forEach(record => { record.unsubscribe?.(); record.animations.forEach(a => a.stop()); record.hoverAnimation?.stop(); record.kit?.destroy() })
  main.destroy()
  root.destroy()
})
