/**
 * DialKit panel memory: which folders are open and how far the panel is scrolled survive closing
 * the panel and reloading the page (localStorage).
 *
 * DialKit keeps folder state in component state, lost when the panel closes (its content
 * unmounts) or the page reloads, so this works on its DOM:
 * - A folder's `data-open` flipping is a user toggle: it is saved under the folder's title path
 *   ("Selected works › touchArc"). Folders appear in their default state; any with a saved state
 *   that differs are toggled back as they mount (nested folders mount once their parent opens).
 * - The panel scroller's position is saved per page while the user scrolls it, and put back
 *   each time the panel opens, following the content as restored folders animate open.
 */
const FOLDERS = 'dialkit:folders'
const SCROLL = 'dialkit:scroll'

type Saved = Record<string, number>

function load<T extends object>(key: string): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '{}') as T
  } catch {
    return {} as T
  }
}

function save(key: string, value: object) {
  localStorage.setItem(key, JSON.stringify(value))
}

const isFolder = (el: Element) => el.classList.contains('dialkit-folder') && !el.classList.contains('dialkit-folder-root')

function folderPath(folder: Element) {
  const titles: string[] = []
  for (let el: Element | null = folder; el; el = el.parentElement?.closest('.dialkit-folder') ?? null) {
    if (!isFolder(el)) continue
    titles.unshift(el.querySelector(':scope > .dialkit-folder-header .dialkit-folder-title')?.textContent ?? '')
  }
  return titles.join(' › ')
}

export function rememberPanelState() {
  const folders = load<Record<string, boolean>>(FOLDERS)
  const scrollKey = () => location.pathname
  // Scroll is saved only when the user moved it (wheel, touch, keys, scrollbar drag, folder clicks),
  // not when the panel's own open/close animation or a restore moves it. Only scroll input (not the
  // click that opens the panel) interrupts a restore.
  let intentUntil = 0
  let scrolledAt = 0
  let pointerDown = false
  const intent = (e: Event) => {
    if (!(e.target instanceof Element) || !e.target.closest('.dialkit-root')) return
    intentUntil = performance.now() + 1000
    if (e.type === 'pointerdown') pointerDown = true
    else scrolledAt = performance.now()
  }
  const release = () => { pointerDown = false }
  const userMoved = () => !restoringActive && (pointerDown || performance.now() < intentUntil)

  const restoreFolders = (root: Element) => {
    const found = isFolder(root) ? [root] : []
    found.push(...Array.from(root.querySelectorAll('.dialkit-folder')).filter(isFolder))
    for (const folder of found) {
      const open = folders[folderPath(folder)]
      if (open === undefined || String(open) === folder.getAttribute('data-open')) continue
      folder.querySelector<HTMLElement>(':scope > .dialkit-folder-header')?.click()
    }
  }
  let restoring = 0
  let restoringActive = false
  const restoreScroll = (inner: HTMLElement) => {
    cancelAnimationFrame(restoring)
    const target = load<Saved>(SCROLL)[scrollKey()]
    if (!target) return
    const start = performance.now()
    restoringActive = true
    // Folders restored open grow over ~0.4s; keep re-applying until the content is tall enough.
    const step = () => {
      const now = performance.now()
      const done = scrolledAt > start || inner.dataset.collapsed === 'true' || now - start > 1500
        || (Math.abs(inner.scrollTop - target) < 1 && now - start > 600)
      if (done) { restoringActive = false; return }
      inner.scrollTop = target
      restoring = requestAnimationFrame(step)
    }
    step()
  }

  const onScroll = (e: Event) => {
    const inner = e.target
    if (!(inner instanceof HTMLElement) || !inner.classList.contains('dialkit-panel-inner')) return
    if (inner.dataset.collapsed === 'true' || !userMoved()) return
    save(SCROLL, { ...load<Saved>(SCROLL), [scrollKey()]: Math.round(inner.scrollTop) })
  }

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      const target = record.target as Element
      if (!target.closest?.('.dialkit-root')) continue
      if (record.type === 'attributes') {
        if (record.attributeName === 'data-open' && isFolder(target)) {
          folders[folderPath(target)] = target.getAttribute('data-open') === 'true'
          save(FOLDERS, folders)
        } else if (record.attributeName === 'data-collapsed' && target.getAttribute('data-collapsed') === 'false') {
          restoreScroll(target as HTMLElement)
        }
        continue
      }
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue
        restoreFolders(node)
        const inner = node.matches('.dialkit-panel-inner') ? node : node.querySelector('.dialkit-panel-inner')
        if (inner instanceof HTMLElement && inner.dataset.collapsed === 'false') restoreScroll(inner)
      }
    }
  })
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-open', 'data-collapsed'] })
  for (const root of document.querySelectorAll('.dialkit-root')) restoreFolders(root)

  const events = ['wheel', 'touchmove', 'keydown', 'pointerdown'] as const
  for (const type of events) addEventListener(type, intent, { capture: true, passive: true })
  addEventListener('pointerup', release, true)
  addEventListener('pointercancel', release, true)
  addEventListener('scroll', onScroll, { capture: true, passive: true })
  return () => {
    observer.disconnect()
    cancelAnimationFrame(restoring)
    for (const type of events) removeEventListener(type, intent, { capture: true })
    removeEventListener('pointerup', release, true)
    removeEventListener('pointercancel', release, true)
    removeEventListener('scroll', onScroll, { capture: true })
  }
}
