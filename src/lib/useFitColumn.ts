import { useLayoutEffect, type RefObject } from 'react'

/** Non-text boxes that count toward a block's width (buttons, signature). */
const BOX_SELECTOR = '.chat, .sig-root'

/**
 * Shrink-wraps every `.column` inside `root` to the widest rendered text line,
 * so the text blocks share one left edge and the group stays centered on the
 * page. Measured at the design column width, then written to `--column-fit`.
 * Re-measures on resize, font load and text changes (live edits, dial values).
 */
export function useFitColumn(rootRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return

    const measure = () => {
      root.style.removeProperty('--column-fit')
      const columns = root.querySelectorAll<HTMLElement>('.column')
      if (!columns.length) return
      const left = Math.min(...Array.from(columns, (col) => col.getBoundingClientRect().left))
      let right = left
      const range = document.createRange()
      for (const col of columns) {
        const walker = document.createTreeWalker(col, NodeFilter.SHOW_TEXT)
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (!node.textContent?.trim()) continue
          range.selectNodeContents(node)
          for (const rect of range.getClientRects()) right = Math.max(right, rect.right)
        }
        for (const box of col.querySelectorAll(BOX_SELECTOR)) right = Math.max(right, box.getBoundingClientRect().right)
      }
      range.detach()
      root.style.setProperty('--column-fit', `${Math.ceil(right - left)}px`)
    }

    let frame = 0
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0
        measure()
      })
    }

    measure()
    let lastWidth = root.clientWidth
    const resize = new ResizeObserver(() => {
      if (root.clientWidth === lastWidth) return
      lastWidth = root.clientWidth
      schedule()
    })
    resize.observe(root)
    const mutations = new MutationObserver(schedule)
    mutations.observe(root, { subtree: true, childList: true, characterData: true })
    void document.fonts.ready.then(schedule)

    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      mutations.disconnect()
    }
  }, [rootRef])
}
