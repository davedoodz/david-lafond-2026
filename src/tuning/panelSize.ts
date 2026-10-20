/**
 * DialKit panel size: drag the grip on the open panel's top-left corner to make it narrower or
 * shorter (or larger), so it covers less of the page. The panel is pinned bottom-right, so the
 * top-left corner is the free one. Double-click the grip to go back to DialKit's own size (280 wide,
 * full height). The size is saved in localStorage and applies every time the panel opens.
 *
 * DialKit writes the open panel's width and height inline as it animates open, so the saved size
 * is applied in panelSize.css with !important through two variables on <html>, and only once a
 * size has been set (`data-dialkit-sized`).
 */
import './panelSize.css'

const KEY = 'dialkit:size'
const MIN_W = 220
const MIN_H = 160

type Size = { w: number; h: number }

function load(): Size | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Size | null
    return s && s.w > 0 && s.h > 0 ? s : null
  } catch {
    return null
  }
}

function apply(size: Size | null) {
  const root = document.documentElement
  if (!size) {
    root.removeAttribute('data-dialkit-sized')
    root.style.removeProperty('--dialkit-w')
    root.style.removeProperty('--dialkit-h')
    return
  }
  root.setAttribute('data-dialkit-sized', '')
  root.style.setProperty('--dialkit-w', `${Math.round(size.w)}px`)
  root.style.setProperty('--dialkit-h', `${Math.round(size.h)}px`)
}

function addGrip(wrapper: HTMLElement) {
  if (wrapper.querySelector(':scope > .dialkit-size-grip')) return
  const grip = document.createElement('div')
  grip.className = 'dialkit-size-grip'
  grip.title = 'Drag to resize · double-click to reset'
  grip.setAttribute('aria-hidden', 'true')
  grip.addEventListener('pointerdown', (e) => {
    const inner = wrapper.querySelector<HTMLElement>('.dialkit-panel-inner')
    if (!inner || inner.dataset.collapsed === 'true') return
    e.preventDefault()
    e.stopPropagation()
    grip.setPointerCapture(e.pointerId)
    const box = inner.getBoundingClientRect()
    const start = { x: e.clientX, y: e.clientY, w: box.width, h: box.height }
    const maxW = () => window.innerWidth - 32
    const maxH = () => window.innerHeight - 32
    let size: Size = { w: box.width, h: box.height }
    const move = (ev: PointerEvent) => {
      size = {
        w: Math.min(maxW(), Math.max(MIN_W, start.w - (ev.clientX - start.x))),
        h: Math.min(maxH(), Math.max(MIN_H, start.h - (ev.clientY - start.y))),
      }
      apply(size)
    }
    const up = () => {
      grip.removeEventListener('pointermove', move)
      grip.removeEventListener('pointerup', up)
      grip.removeEventListener('pointercancel', up)
      localStorage.setItem(KEY, JSON.stringify(size))
    }
    grip.addEventListener('pointermove', move)
    grip.addEventListener('pointerup', up)
    grip.addEventListener('pointercancel', up)
  })
  grip.addEventListener('dblclick', (e) => {
    e.stopPropagation()
    localStorage.removeItem(KEY)
    apply(null)
  })
  wrapper.append(grip)
}

/** Effect: apply the saved size and keep a grip on every popover panel as it mounts. */
export function rememberPanelSize() {
  apply(load())
  const scan = () => {
    for (const wrapper of document.querySelectorAll<HTMLElement>('.dialkit-panel[data-mode="popover"] .dialkit-panel-wrapper')) addGrip(wrapper)
  }
  scan()
  const observer = new MutationObserver(scan)
  observer.observe(document.body, { subtree: true, childList: true })
  return () => {
    observer.disconnect()
    for (const grip of document.querySelectorAll('.dialkit-size-grip')) grip.remove()
  }
}
