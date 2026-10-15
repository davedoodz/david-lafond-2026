import { createDialKit, createDialRoot } from 'dialkit/vanilla'
import 'dialkit/vanilla/styles.css'
import { animate } from 'motion'

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
// A shared 24-unit, round-stroke family. Filled silhouettes get a white die-cut edge.
const art = {
  people: '<circle class="die-cut art-fill" cx="8" cy="8" r="4"/><circle class="die-cut art-fill" cx="17" cy="10" r="3.5"/><path class="die-cut art-fill" d="M2 21v-3a6 6 0 0 1 12 0v3Zm12 0v-6a5 5 0 0 1 8 4v2Z"/><path class="art-detail" d="M7 8h2m7 2h2"/>',
  city: '<path class="die-cut art-fill" d="M3 21V8h6V3h7v9h5v9Z"/><path class="art-detail" d="M6 12v2m0 3v1m6-11h1m-1 4h1m-1 4h1m-1 4h1m5-3h1m-1 3h1"/>',
  orbit: '<circle class="die-cut art-fill" cx="12" cy="12" r="9"/><ellipse class="art-detail" cx="12" cy="12" rx="10" ry="4" transform="rotate(-35 12 12)"/><circle class="art-light" cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>',
  cursor: '<path class="die-cut art-fill" d="m4 3 16 10-8 2-4 7Z"/><path class="art-detail" d="m12 15 4 6"/>',
  spark: '<path class="die-cut art-fill" d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>',
  globe: '<circle class="die-cut art-fill" cx="12" cy="12" r="9"/><ellipse class="art-detail" cx="12" cy="12" rx="4" ry="9"/><path class="art-detail" d="M3 12h18M5 6.5c4 2 10 2 14 0M5 17.5c4-2 10-2 14 0"/>',
  layers: '<path class="die-cut art-fill" d="m2 15 10-5 10 5-10 6Z"/><path class="die-cut art-fill" d="M2 8 12 3l10 5-10 5Z"/><path class="art-detail" d="m7 8 5 2.5L17 8"/>',
  flask: '<path class="die-cut art-fill" d="M9 3h6v7l6 9a2 2 0 0 1-2 3H5a2 2 0 0 1-2-3l6-9Z"/><path class="art-detail" d="M8 3h8M7 15h10"/><circle class="art-light" cx="10" cy="18" r="1"/>',
  heart: '<path class="die-cut art-fill" d="M12 21 3 12C-2 5 7-1 12 6c5-7 14-1 9 6Z"/>',
  bolt: '<path class="die-cut art-fill" d="M13.5 2 4 14h7l-1.5 8L19 10h-7Z"/>',
  rocket: '<path class="die-cut art-fill" d="M7 13.5 4 18.5l4.5.5M17 13.5l3 5-4.5.5Z"/><path class="die-cut art-fill" d="M12 2c4 3 6 7 5 12l-2 4H9l-2-4C6 9 8 5 12 2Z"/><circle class="art-detail" cx="12" cy="9.5" r="2"/><path class="art-detail" d="M12 20v2"/>',
  arrow: '<path class="die-cut art-fill" d="M4 17.5 14.5 7H10V3.5h10.5V14H17V9.5L6.5 20Z"/>',
}
const iconOptions = Object.keys(art)

/* Landing presets: how the next sticker arrives and the old one leaves.
 * t = resting tilt (deg), s = resting scale. Values are Motion keyframes. */
const LANDINGS = {
  Pop: {
    enter: (t, s) => ({ y: [16, 0], rotate: [t * -2, t], scale: [0.5 * s, s], opacity: [0, 1] }),
    exit: (t, s) => ({ y: -12, rotate: -t * 2, scale: 0.6 * s, opacity: 0 }),
  },
  Drop: {
    enter: (t, s) => ({ y: [-30, 0], rotate: [t + 18, t], scale: [1.25 * s, s], opacity: [0, 1] }),
    exit: (t, s) => ({ y: 20, rotate: t - 25, scale: 0.8 * s, opacity: 0 }),
  },
  Slap: {
    enter: (t, s) => ({ scale: [2.2 * s, s], rotate: [t - 26, t], opacity: [0, 1] }),
    exit: (t, s) => ({ scale: 0.35 * s, opacity: 0 }),
  },
  Flip: {
    enter: (t, s) => ({ transformPerspective: [90, 90], rotateY: [-100, 0], rotate: [t, t], scale: [s, s], opacity: [0, 1] }),
    exit: () => ({ transformPerspective: 90, rotateY: 100, opacity: 0 }),
  },
  Spin: {
    enter: (t, s) => ({ rotate: [t - 300, t], scale: [0.2 * s, s], opacity: [0, 1] }),
    exit: (t, s) => ({ rotate: t + 220, scale: 0.2 * s, opacity: 0 }),
  },
  Peel: {
    enter: (t, s) => ({ x: [-16, 0], y: [7, 0], rotate: [t - 38, t], scale: [0.7 * s, s], opacity: [0, 1] }),
    exit: (t, s) => ({ x: 18, y: -12, rotate: t + 42, scale: 0.7 * s, opacity: 0 }),
  },
}
const landingOptions = Object.keys(LANDINGS)
const letterOptions = ['Morph', 'Crisp', 'Glide', 'Drift', 'Soft', 'Ripple', 'Echo', 'Bloom', 'Punch', 'Sway', 'Squish', 'Hop', 'Twirl', 'Breeze', 'Tide', 'Tilt', 'Lean', 'Melt', 'Mist', 'Arc', 'Flip', 'Hinge', 'Turn', 'Coin', 'Barrel', 'Domino', 'Spin', 'Tumble', 'Pinwheel', 'Wave', 'Cascade', 'Slot', 'Split', 'Zoom', 'Elastic', 'Typewriter', 'Scramble', 'Fade']
const GRADIENTS = [
  { name: 'Sunset', from: '#ffc175', to: '#ff6f91', angle: 135 },
  { name: 'Lagoon', from: '#83c9f4', to: '#7be0b5', angle: 160 },
  { name: 'Lilac', from: '#b8a0f5', to: '#f5a3d6', angle: 135 },
  { name: 'Citrus', from: '#ffe066', to: '#ff9f43', angle: 180 },
  { name: 'Aurora', from: '#7fd1c7', to: '#6a7dff', angle: 120 },
  { name: 'Mint', from: '#a8dbbc', to: '#dff28a', angle: 150 },
]

function mixHex(hex, other, amount) {
  const parse = (value) => value.match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i)?.slice(1).map(n => parseInt(n, 16))
  const a = parse(hex), b = parse(other)
  if (!a || !b) return hex
  return `#${a.map((n, i) => Math.round(n + (b[i] - n) * amount).toString(16).padStart(2, '0')).join('')}`
}
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
const currentFace = (record) => record.kit.values[`face${faceOf(record)}`]
function setCurrentFace(record, partial) {
  const index = faceOf(record)
  record.kit.setValues({ [`face${index}`]: { ...record.kit.values[`face${index}`], ...partial } })
}
const faceOf = (record) => Math.min(Number(record.kit.values.face.replace(/\D/g, '')) || 1, faceCount(record.id))
const root = createDialRoot({ mode: 'inline', target: $('#dial-root'), theme, defaultOpen: true })

// A turn runs at its pill's own duration; everything else (hover, previews outside a turn) uses the global spring.
// While letters animate, the spring loses its bounce so words settle without overshooting.
let turnSeconds = null
let lettersPhase = false
function transition(delay = 0) {
  if (reduced.matches) return { duration: 0 }
  const value = main.values.motion.spring
  // Advanced springs carry stiffness/damping, so letters get a fresh bounce-free spring of the same duration.
  const base = value.type === 'easing' ? { ...value, type: 'tween' } : lettersPhase ? { type: 'spring', visualDuration: value.visualDuration ?? 0.42, bounce: 0 } : value
  const paced = turnSeconds === null ? base : base.type === 'tween' ? { ...base, duration: turnSeconds } : { ...base, visualDuration: turnSeconds }
  return delay ? { ...paced, delay } : paced
}
const seconds = () => turnSeconds ?? main.values.motion.spring.visualDuration ?? main.values.motion.spring.duration ?? 0.42
// Letters run at the pill's Letter speed times the global Letter Speed in Look & motion.
const lettersSpeed = (record) => record.kit.values.timing.letterSpeed * main.values.motion.letterSpeed
function run(record, element, values, options = transition()) {
  const animation = animate(element, values, options)
  record.animations.push(animation)
  return animation
}
function turn(record) {
  const count = faceCount(record.id)
  if (count < 2) { status(`${record.title} has one face. Add a face in its editor to make it turn.`); return }
  record.kit.setValue('face', `Face ${faceOf(record) % count + 1}`)
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
function hover(record, active) {
  const element = record.icon.lastElementChild
  // Hiding a removed sticker can still fire blur/pointerleave.
  if (!element || !record.kit) return
  record.hoverAnimation?.stop()
  const p = main.values
  const face = currentFace(record)
  const lifted = active && !reduced.matches
  const em = lifted ? parseFloat(getComputedStyle(record.button).fontSize) : 0
  record.hoverAnimation = animate(element, {
    y: lifted ? -p.motion.lift - face.hoverY * em : 0,
    x: lifted ? face.hoverX * em : 0,
    rotateY: 0,
    scale: p.appearance.stickerScale * (lifted ? p.motion.hoverScale : 1),
    rotate: lifted ? face.hoverRotate : face.tilt,
  }, transition())
}

/* Artwork: each SVG instance owns its own gradient so ghosts keep their paint. */
let gradientCount = 0
function createArtSvg(name) {
  const id = `sticker-fill-${++gradientCount}`
  const holder = document.createElement('span')
  // Only trusted, authored SVG paths enter markup. User labels always use textContent.
  holder.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse"><stop offset="0"/><stop offset="1"/></linearGradient></defs>${art[name] ?? art.spark}</svg>`
  return holder.firstElementChild
}
function paintArt(svg, values) {
  const gradient = svg?.querySelector('linearGradient')
  if (!gradient) return
  const radians = values.gradientAngle * Math.PI / 180
  const dx = Math.sin(radians) * 12
  const dy = -Math.cos(radians) * 12
  gradient.setAttribute('x1', String(12 - dx))
  gradient.setAttribute('y1', String(12 - dy))
  gradient.setAttribute('x2', String(12 + dx))
  gradient.setAttribute('y2', String(12 + dy))
  const [start, end] = gradient.querySelectorAll('stop')
  start.setAttribute('stop-color', values.color)
  end.setAttribute('stop-color', values.fill === 'Gradient' ? values.gradientEnd : values.color)
  svg.style.setProperty('--art-fill', `url(#${gradient.id})`)
  svg.style.setProperty('--outline', String(values.outline))
}
function createFaceArt(face) {
  if (!face.image) return createArtSvg(face.artwork)
  const image = document.createElement('img')
  image.src = face.image
  image.alt = ''
  image.draggable = false
  return image
}

/* Letter presets: how characters reorganize between labels. */
function ghost(record, { element, x }) {
  element.className = 'sticker-char sticker-ghost'
  element.style.cssText = `left:${x}px;top:0`
  record.label.append(element)
  return element
}
/* The Morph family: shared letters slide to their new places; new letters arrive and old ones
 * leave with a small, tunable difference. rise/fall are in em (positive = down), blur in px,
 * grow/shrink are entering/leaving scales, ripple staggers letters (reverse: right to left),
 * bend(dir, em, dx) adds a mid-move motion to sliding letters (bendTimes places its middle keyframe), and enter(em)/exit(em) add extra
 * keyframes for arriving and leaving letters. */
function morphLike({ rise = 0.35, fall = -0.35, blur = 3, grow = 1, shrink = 1, ripple = 0, reverse = false, bend = null, bendTimes, enter = null, exit = null }) {
  return ({ record, entering, leaving, em, stagger }) => {
    entering.forEach(({ span, old, dx }, i) => {
      const order = reverse ? entering.length - 1 - i : i
      const options = transition(ripple ? order * stagger * ripple : 0)
      if (!old) {
        run(record, span, { y: [em * rise, 0], opacity: [0, 1], scale: [grow, 1], filter: [`blur(${blur}px)`, 'blur(0px)'], ...enter?.(em) }, options)
        return
      }
      run(record, span, { x: [dx, 0] }, options)
      if (bend && dx) run(record, span, bend(Math.sign(dx), em, dx), { duration: seconds(), ease: 'easeInOut', delay: options.delay ?? 0, ...(bendTimes && { times: bendTimes }) })
    })
    for (const item of leaving) {
      const element = ghost(record, item)
      run(record, element, { y: em * fall, opacity: 0, scale: shrink, filter: `blur(${blur}px)`, ...exit?.(em) }).then(() => element.remove())
    }
  }
}
const MORPH_FAMILY = {
  Morph: morphLike({}),
  // No vertical travel and no blur: a clean crossfade while letters slide.
  Glide: morphLike({ rise: 0, fall: 0, blur: 0 }),
  // Exactly Morph's rise and fall, with no blur: sharp letters the whole way.
  Crisp: morphLike({ blur: 0 }),
  // Reversed direction: new letters drop in from above, old ones sink away.
  Drift: morphLike({ rise: -0.35, fall: 0.35 }),
  // Shorter travel, heavier blur: hazier and quieter.
  Soft: morphLike({ rise: 0.18, fall: -0.18, blur: 7 }),
  // Letters settle one after another, left to right.
  Ripple: morphLike({ ripple: 1.2 }),
  // New letters grow in place; old ones swell and fade.
  Bloom: morphLike({ rise: 0, fall: 0, blur: 4, grow: 0.55, shrink: 1.35 }),
  // Sliding letters lean into the direction they travel.
  Sway: morphLike({ bend: (dir) => ({ rotate: [0, dir * -9, 0] }) }),
  // Sliding letters stretch as they move, then snap back.
  Squish: morphLike({ bend: () => ({ scaleX: [1, 1.18, 1], scaleY: [1, 0.86, 1] }) }),
  // Sliding letters make a small hop; lower and quicker-feeling than Arc. Tuned live from the Hop folder in Look & motion.
  Hop: (args) => {
    const hop = main.values.hop
    return morphLike({
      rise: hop.rise, fall: -hop.exit, blur: hop.blur, ripple: hop.ripple,
      bendTimes: [0, hop.peak, 1],
      bend: (dir, em, dx) => {
        const height = em * hop.height + Math.abs(dx) * hop.perDistance
        return { y: [0, -height, 0], rotate: [0, dir * -hop.lean, 0] }
      },
    })(args)
  },
  // Letters settle right to left: Ripple in reverse.
  Echo: morphLike({ ripple: 1.2, reverse: true }),
  // New letters breeze in from the right; old ones drift off to the left.
  Breeze: morphLike({ rise: 0, fall: 0, blur: 2, enter: (em) => ({ x: [em * 0.45, 0] }), exit: (em) => ({ x: -em * 0.45 }) }),
  // Breeze in the other direction.
  Tide: morphLike({ rise: 0, fall: 0, blur: 2, enter: (em) => ({ x: [-em * 0.45, 0] }), exit: (em) => ({ x: em * 0.45 }) }),
  // New letters rotate up into place; old ones tip away.
  Tilt: morphLike({ rise: 0.3, enter: () => ({ rotate: [14, 0] }), exit: () => ({ rotate: -14 }) }),
  // New letters straighten from a slant; old ones slant as they go.
  Lean: morphLike({ rise: 0.2, fall: -0.2, enter: () => ({ skewX: [-18, 0] }), exit: () => ({ skewX: 18 }) }),
  // Big-to-small arrival, no blur: punchier than Bloom.
  Punch: morphLike({ rise: 0, fall: 0, blur: 0, grow: 1.45, shrink: 0.6 }),
  // Old letters stretch and drip downward; new ones settle from above.
  Melt: morphLike({ rise: -0.2, fall: 0.45, blur: 6, exit: () => ({ scaleY: 1.6, scaleX: 0.85 }) }),
  // Almost no travel and very heavy blur: letters fade through fog.
  Mist: morphLike({ rise: 0.08, fall: -0.08, blur: 12 }),
  // Shared letters do a full spin as they slide to their new places.
  Twirl: morphLike({ bend: (dir) => ({ rotate: [0, dir * 360] }) }),
}
/* The Flip & spin family: every letter turns over or around, one after another.
 * enter(em) gives from→to keyframes, exit(em) gives targets; origin is the pivot;
 * pace scales the per-letter stagger. */
function flipLike({ enter, exit, origin = '', pace = 1 }) {
  return ({ record, entering, leaving, em, stagger }) => {
    entering.forEach(({ span }, i) => {
      span.style.transformOrigin = origin
      run(record, span, { opacity: [0, 1], ...enter(em) }, transition(i * stagger * pace))
    })
    leaving.forEach((item, i) => {
      const element = ghost(record, item)
      element.style.transformOrigin = origin
      run(record, element, { opacity: 0, ...exit(em) }, transition(i * stagger * pace * 0.5)).then(() => element.remove())
    })
  }
}
const FLIP_FAMILY = {
  // Letters swing up from the baseline like a flap; old ones fall back.
  Hinge: flipLike({ origin: '50% 100%', enter: () => ({ rotateX: [-100, 0] }), exit: () => ({ rotateX: 100 }) }),
  // Letters turn sideways like cards.
  Turn: flipLike({ enter: () => ({ rotateY: [90, 0] }), exit: () => ({ rotateY: -90 }) }),
  // Letters spin around their vertical axis like flipped coins.
  Coin: flipLike({ enter: () => ({ rotateY: [-540, 0] }), exit: () => ({ rotateY: 360 }), pace: 0.6 }),
  // Letters roll forward over the top, a full turn.
  Barrel: flipLike({ enter: () => ({ rotateX: [-360, 0] }), exit: () => ({ rotateX: 180 }) }),
  // Letters open in from the left edge like doors, one by one.
  Domino: flipLike({ origin: '0% 50%', enter: () => ({ rotateY: [-100, 0] }), exit: () => ({ rotateY: 100 }), pace: 2 }),
  // Letters spin in flat and grow; old ones spin out and shrink.
  Spin: flipLike({ enter: () => ({ rotate: [-180, 0], scale: [0.2, 1] }), exit: () => ({ rotate: 180, scale: 0.2 }) }),
  // Letters tumble down into place; old ones tumble out below.
  Tumble: flipLike({ enter: (em) => ({ y: [-em * 0.6, 0], rotate: [-120, 0] }), exit: (em) => ({ y: em * 0.6, rotate: 120 }) }),
  // Letters swing in on a pivot below them, like spokes of a wheel.
  Pinwheel: flipLike({ origin: '50% 160%', enter: () => ({ rotate: [-80, 0] }), exit: () => ({ rotate: 80 }) }),
}
const LETTERS = {
  ...MORPH_FAMILY,
  ...FLIP_FAMILY,
  // Morph whose shared letters hop over to their new places.
  Arc({ record, entering, leaving, em }) {
    for (const { span, old, dx } of entering) {
      if (old) {
        run(record, span, { x: [dx, 0] })
        if (dx) run(record, span, { y: [0, -em * Math.min(0.4, 0.12 + Math.abs(dx) / em * 0.08), 0] }, { duration: seconds() * 1.1, ease: 'easeInOut' })
      } else run(record, span, { y: [em * 0.35, 0], opacity: [0, 1], filter: ['blur(3px)', 'blur(0px)'] })
    }
    for (const item of leaving) {
      const element = ghost(record, item)
      run(record, element, { y: -em * 0.35, opacity: 0, filter: 'blur(3px)' }).then(() => element.remove())
    }
  },
  Wave({ record, entering, leaving, em, stagger }) {
    entering.forEach(({ span, old, dx }, i) => {
      run(record, span, { x: [old ? dx : 0, 0], opacity: [old ? 1 : 0, 1] })
      run(record, span, { y: [0, -em * 0.32, 0] }, { duration: 0.46, ease: 'easeInOut', delay: i * stagger })
    })
    for (const item of leaving) {
      const element = ghost(record, item)
      run(record, element, { y: em * 0.4, opacity: 0 }).then(() => element.remove())
    }
  },
  Cascade({ record, entering, leaving, em, stagger }) {
    entering.forEach(({ span }, i) => run(record, span, { y: [em * 0.6, 0], rotate: [10, 0], opacity: [0, 1], filter: ['blur(3px)', 'blur(0px)'] }, transition(i * stagger)))
    leaving.forEach((item, i) => {
      const element = ghost(record, item)
      run(record, element, { y: -em * 0.5, rotate: -10, opacity: 0 }, transition(i * stagger * 0.5)).then(() => element.remove())
    })
  },
  Slot({ record, entering, leaving, em, stagger }) {
    entering.forEach(({ span }, i) => run(record, span, { y: [em * 1.2, 0] }, transition(i * stagger)))
    leaving.forEach((item, i) => {
      const element = ghost(record, item)
      run(record, element, { y: -em * 1.2 }, transition(i * stagger)).then(() => element.remove())
    })
  },
  Flip({ record, entering, leaving, stagger }) {
    entering.forEach(({ span }, i) => run(record, span, { rotateX: [-90, 0], opacity: [0, 1] }, transition(i * stagger + 0.06)))
    leaving.forEach((item, i) => {
      const element = ghost(record, item)
      run(record, element, { rotateX: 90, opacity: 0 }, transition(i * stagger * 0.5)).then(() => element.remove())
    })
  },
  // Old letters burst outward from the middle; new ones gather in from it.
  Split({ record, entering, leaving, em, stagger }) {
    const middle = record.label.getBoundingClientRect()
    const center = middle.left + middle.width / 2
    for (const { span } of entering) {
      const box = span.getBoundingClientRect()
      const toCenter = center - (box.left + box.width / 2)
      run(record, span, { x: [toCenter, 0], opacity: [0, 1], scale: [0.6, 1] }, transition(Math.abs(toCenter) / em * stagger))
    }
    const oldCenter = leaving.reduce((max, item) => Math.max(max, item.x), 0) / 2
    for (const item of leaving) {
      const element = ghost(record, item)
      run(record, element, { x: item.x + Math.sign(item.x - oldCenter || 1) * em * 0.6, opacity: 0, scale: 0.6 }).then(() => element.remove())
    }
  },
  Zoom({ record, entering, leaving, stagger }) {
    entering.forEach(({ span }, i) => run(record, span, { scale: [1.9, 1], opacity: [0, 1], filter: ['blur(4px)', 'blur(0px)'] }, transition(i * stagger * 0.6)))
    for (const item of leaving) {
      const element = ghost(record, item)
      run(record, element, { scale: 0.3, opacity: 0, filter: 'blur(4px)' }).then(() => element.remove())
    }
  },
  Elastic({ record, entering, leaving, em, stagger }) {
    const spring = (delay) => ({ type: 'spring', visualDuration: seconds(), bounce: 0.62, delay })
    entering.forEach(({ span }, i) => run(record, span, { y: [em * 0.45, 0], scaleY: [0.2, 1], scaleX: [1.5, 1], opacity: [0, 1] }, spring(i * stagger)))
    for (const item of leaving) {
      const element = ghost(record, item)
      run(record, element, { scaleY: 0, scaleX: 1.4, opacity: 0 }, { duration: seconds() * 0.5, ease: 'easeIn' }).then(() => element.remove())
    }
  },
  // Deletes the old word from its end, then types the new one, letter by letter.
  Typewriter({ record, entering, leaving, stagger }) {
    const step = Math.max(stagger, 0.012) * 1.6
    const erase = [...leaving].sort((a, b) => b.x - a.x)
    erase.forEach((item, i) => {
      const element = ghost(record, item)
      run(record, element, { opacity: 0 }, { duration: 0.01, delay: i * step * 0.6 }).then(() => element.remove())
    })
    const start = erase.length * step * 0.6
    entering.forEach(({ span }, i) => run(record, span, { opacity: [0, 1] }, { duration: 0.01, delay: start + i * step }))
  },
  Scramble({ record, entering, leaving, stagger }) {
    for (const { element } of leaving) element.remove()
    const glyphs = 'abcdefghijklmnopqrstuvwxyz'
    const items = entering.filter(({ span }) => span.textContent.trim()).map(({ span }, i) => {
      const final = span.textContent
      span.style.width = `${span.getBoundingClientRect().width}px`
      span.style.textAlign = 'center'
      return { span, final, revealAt: 0.1 + i * Math.max(stagger, 0.012) * 2.2, scramble: true }
    })
    const started = performance.now()
    let frame = 0
    const tick = (now) => {
      const elapsed = (now - started) / 1000
      let pending = false
      for (const item of items) {
        if (!item.scramble) continue
        if (elapsed >= item.revealAt) {
          item.span.textContent = item.final
          item.span.style.width = ''
          item.span.style.textAlign = ''
          item.scramble = false
          continue
        }
        pending = true
        const glyph = glyphs[Math.floor(Math.random() * glyphs.length)]
        item.span.textContent = item.final === item.final.toUpperCase() ? glyph.toUpperCase() : glyph
      }
      if (pending) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    record.animations.push({
      stop() {
        cancelAnimationFrame(frame)
        for (const item of items) { item.span.textContent = item.final; item.span.style.width = ''; item.span.style.textAlign = '' }
      },
    })
  },
  Fade({ record, entering, leaving, stagger }) {
    entering.forEach(({ span }, i) => run(record, span, { opacity: [0, 1], filter: ['blur(5px)', 'blur(0px)'] }, transition(i * stagger * 0.5)))
    for (const item of leaving) {
      const element = ghost(record, item)
      run(record, element, { opacity: 0, filter: 'blur(5px)' }).then(() => element.remove())
    }
  },
}

function activePreset(value, fallback) {
  return value === 'Global' ? fallback : value
}
/* The hover tint follows the face's artwork: an SVG uses its fill (the midpoint of a gradient);
 * an uploaded image uses its most common vivid color, sampled once per image. */
const imageTints = new Map()
const NEUTRAL_TINT = '#f2f2f2'
function imageTint(src) {
  if (!imageTints.has(src)) {
    imageTints.set(src, new Promise(resolve => {
      const image = new Image()
      image.crossOrigin = 'anonymous'
      image.onerror = () => resolve(null)
      image.onload = () => {
        try {
          const size = 40
          const canvas = Object.assign(document.createElement('canvas'), { width: size, height: size })
          const context = canvas.getContext('2d', { willReadFrequently: true })
          context.drawImage(image, 0, 0, size, size)
          const { data } = context.getImageData(0, 0, size, size)
          // Bucket pixels by coarse color, weighting vivid ones; skip transparent, near-white, and near-black pixels.
          const buckets = new Map()
          for (let i = 0; i < data.length; i += 4) {
            const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]]
            const max = Math.max(r, g, b), min = Math.min(r, g, b)
            if (a < 160 || max < 40 || min > 225) continue
            const key = (r >> 5) << 6 | (g >> 5) << 3 | (b >> 5)
            const bucket = buckets.get(key) ?? { weight: 0, r: 0, g: 0, b: 0 }
            const weight = 1 + (max - min) / 32
            bucket.weight += weight; bucket.r += r * weight; bucket.g += g * weight; bucket.b += b * weight
            buckets.set(key, bucket)
          }
          let best = null
          for (const bucket of buckets.values()) if (!best || bucket.weight > best.weight) best = bucket
          if (!best) { resolve(NEUTRAL_TINT); return }
          const [r, g, b] = [best.r, best.g, best.b].map(n => Math.round(n / best.weight))
          // Black, white, and gray artwork has no color to borrow, so its pill lifts to a light gray instead.
          if (Math.max(r, g, b) - Math.min(r, g, b) < 24) { resolve(NEUTRAL_TINT); return }
          resolve(`#${[r, g, b].map(n => n.toString(16).padStart(2, '0')).join('')}`)
        } catch { resolve(null) }
      }
      image.src = src
    }))
  }
  return imageTints.get(src)
}
function paint(record) {
  const face = currentFace(record)
  record.button.style.setProperty('--accent', face.color)
  const fillTint = face.fill === 'Gradient' ? mixHex(toHex(face.color), toHex(face.gradientEnd), 0.5) : face.color
  record.button.style.setProperty('--tint', fillTint)
  if (face.image) {
    const image = face.image
    imageTint(image).then(tint => { if (tint && currentFace(record).image === image) record.button.style.setProperty('--tint', tint) })
  }
  record.button.style.setProperty('--tilt', `${face.tilt}deg`)
  // Uploaded images read --outline from the button; SVG art carries its own copy.
  record.button.style.setProperty('--outline', String(face.outline))
  record.button.style.setProperty('--gap', `${face.gap}em`)
  record.button.style.setProperty('--ends', `${face.ends}em`)
  record.button.style.setProperty('--pill-height', `${face.height}em`)
  record.button.dataset.side = face.side.toLowerCase()
  for (const art of record.icon.querySelectorAll('.sticker-art:not(.sticker-ghost)')) {
    // CSS translate/scale compose with Motion's animated transform; a leaving face keeps its own values.
    art.dataset.side = face.side.toLowerCase()
    art.style.translate = `${face.offsetX}em ${-face.offsetY}em`
    art.style.scale = String(face.size)
    const svg = art.querySelector('svg')
    if (svg) paintArt(svg, face)
  }
}
function render(record) {
  const values = record.kit.values
  const faceIndex = faceOf(record)
  const face = values[`face${faceIndex}`]
  const text = face.label.trim() || defaultLabel(slots[record.id], faceIndex - 1)
  record.button.setAttribute('aria-label', `${text}. Show next sticker`)
  record.button.title = `${text} — click to turn, press E to edit`
  if (editor.record === record) syncEditor()
  // Including the face number makes every turn animate, even between look-alike faces.
  const imageKey = `${faceIndex}|${face.image}|${face.artwork}`
  const changed = record.current !== text || record.imageKey !== imageKey
  if (!changed) { paint(record); hover(record, record.button.matches(':hover, :focus-visible')); return }
  record.revision += 1
  const revision = record.revision
  record.animations.forEach(a => a.stop())
  record.animations = []
  record.hoverAnimation?.stop()
  record.button.querySelectorAll('.sticker-ghost').forEach(el => el.remove())
  const initial = !record.current
  const animated = !initial && !reduced.matches
  const motion = main.values.motion
  const letters = activePreset(face.motion.letters, motion.letters)
  const landing = LANDINGS[activePreset(face.motion.landing, motion.landing)] ?? LANDINGS.Pop
  const reuse = letters in MORPH_FAMILY || letters === 'Arc' || letters === 'Wave'
  record.label.dataset.letters = letters
  const previousWidth = record.button.getBoundingClientRect().width
  const previous = new Map()
  const oldOrigin = record.label.getBoundingClientRect()
  for (const span of record.label.children) {
    previous.set(span.dataset.key, { element: span, x: span.getBoundingClientRect().left - oldOrigin.left })
  }
  record.label.replaceChildren()
  const counts = new Map()
  const entering = []
  for (const char of Array.from(text)) {
    const n = counts.get(char) ?? 0
    counts.set(char, n + 1)
    const key = `${char}:${n}`
    const old = reuse ? previous.get(key) : undefined
    if (old) previous.delete(key)
    const span = old?.element ?? document.createElement('span')
    span.className = 'sticker-char'
    span.dataset.key = key
    span.textContent = char
    span.style.cssText = ''
    record.label.append(span)
    entering.push({ span, old })
  }
  // Apply the new face's gap before measuring, without the slider transition, so the pill resizes to its true width.
  record.button.style.transition = 'none'
  record.button.style.setProperty('--gap', `${face.gap}em`)
  record.button.style.setProperty('--ends', `${face.ends}em`)
  record.button.style.setProperty('--pill-height', `${face.height}em`)
  record.button.dataset.side = face.side.toLowerCase()
  record.button.style.width = ''
  const targetWidth = record.button.getBoundingClientRect().width
  record.button.style.transition = ''
  const { duration } = values.timing
  const letterSpeed = lettersSpeed(record)
  turnSeconds = duration / letterSpeed
  lettersPhase = true
  if (animated) {
    const origin = record.label.getBoundingClientRect()
    for (const item of entering) item.dx = item.old ? item.old.x - (item.span.getBoundingClientRect().left - origin.left) : 0
    const em = parseFloat(getComputedStyle(record.button).fontSize)
    LETTERS[letters]({ record, entering, leaving: [...previous.values()], em, stagger: motion.letterStagger / letterSpeed })
    record.button.style.width = `${targetWidth}px`
    run(record, record.button, { width: [previousWidth, targetWidth] }).then(() => {
      if (record.revision === revision) record.button.style.width = ''
    })
  }
  lettersPhase = false
  turnSeconds = duration
  const oldArt = record.icon.lastElementChild
  const nextArt = document.createElement('span')
  nextArt.className = 'sticker-art'
  nextArt.append(createFaceArt(face))
  record.icon.replaceChildren(nextArt)
  paint(record)
  if (animated) {
    const scale = main.values.appearance.stickerScale
    if (oldArt) {
      oldArt.classList.add('sticker-ghost')
      record.icon.prepend(oldArt)
      run(record, oldArt, landing.exit(record.restTilt ?? face.tilt, scale)).then(() => oldArt.remove())
    }
    run(record, nextArt, landing.enter(face.tilt, scale))
  }
  turnSeconds = null
  record.current = text
  record.restTilt = face.tilt
  record.imageKey = imageKey
}

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
const colorProbe = document.createElement('canvas').getContext('2d')
function toHex(color) {
  if (/^#[\da-f]{6}$/i.test(color)) return color
  colorProbe.fillStyle = '#000000'
  colorProbe.fillStyle = color
  return /^#[\da-f]{6}$/i.test(colorProbe.fillStyle) ? colorProbe.fillStyle : null
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
let timer
let turnIndex = 0
function schedule(delay = 600) {
  clearTimeout(timer)
  if (!main.values.motion.loop || reduced.matches || document.hidden) return
  timer = setTimeout(step, delay)
}
function step() {
  const list = active().filter(record => faceCount(record.id) > 1)
    .sort((a, b) => (a.button.compareDocumentPosition(b.button) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
  if (editingCopy || !list.length) { schedule(1000); return }
  const record = list[turnIndex++ % list.length]
  // A pill being edited, hovered, or focused keeps its face; the loop moves on to the next one.
  if (record === editor.record || record.wrapper.matches(':hover, :focus-within')) { schedule(300); return }
  looping = true
  try { turn(record) } finally { looping = false }
  // Wait for whichever finishes last, the artwork or the letters, then hold.
  const { duration, hold } = record.kit.values.timing
  schedule((Math.max(duration, duration / lettersSpeed(record)) + hold) * 1000)
}
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
  clearTimeout(timer)
  if (event.persisted) return
  unsubscribeMain()
  records.forEach(record => { record.unsubscribe?.(); record.animations.forEach(a => a.stop()); record.hoverAnimation?.stop(); record.kit?.destroy() })
  main.destroy()
  root.destroy()
})
