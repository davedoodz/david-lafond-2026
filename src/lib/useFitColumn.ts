import { useLayoutEffect, type RefObject } from 'react'
import { withOriginalText } from './entranceSplit'

/** Non-text boxes that count toward a block's width (buttons, signature). */
const BOX_SELECTOR = '.chat, .sig-root'
/** Blocks whose content changes on its own (the Work sticker intro) never resize or move the column. */
const IGNORE_SELECTOR = '[data-fit-ignore]'

/**
 * Shrink-wraps every `.column` inside `root` to the widest rendered text line,
 * so the text blocks share one left edge and the group stays centered on the
 * page. A `.column[data-fit-own]` also keeps its own width (same position on
 * every page) while still counting toward the shared one. Measured at the design column width, then written to `--column-fit`.
 * Re-measures on resize, font load and text changes (live edits, dial values).
 */
export function useFitColumn(rootRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return

    const fit = () => {
      root.style.removeProperty('--column-fit')
      const columns = root.querySelectorAll<HTMLElement>('.column')
      const own = Array.from(columns).filter((col) => col.hasAttribute('data-fit-own'))
      for (const col of own) col.style.removeProperty('--column-fit')
      if (!columns.length) return
      // Measure every column left-aligned and from its own left edge, so the
      // centre-align option and X offsets don't inflate the shared width.
      root.dataset.fitMeasuring = ''
      let width = 0
      const range = document.createRange()
      for (const col of columns) {
        const left = col.getBoundingClientRect().left
        let right = left
        const walker = document.createTreeWalker(col, NodeFilter.SHOW_TEXT)
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (!node.textContent?.trim() || node.parentElement?.closest(IGNORE_SELECTOR)) continue
          range.selectNodeContents(node)
          for (const rect of range.getClientRects()) right = Math.max(right, rect.right)
        }
        for (const box of col.querySelectorAll(BOX_SELECTOR)) right = Math.max(right, box.getBoundingClientRect().right)
        width = Math.max(width, right - left)
        // Own-fit blocks (the shared contact CTA) also keep their own width, so they sit
        // in the same place on every page instead of following that page's widest line.
        if (col.hasAttribute('data-fit-own')) col.style.setProperty('--column-fit', `${Math.ceil(right - left)}px`)
      }
      range.detach()
      delete root.dataset.fitMeasuring
      root.style.setProperty('--column-fit', `${Math.ceil(width)}px`)
    }

    // A load-in may have a column's text split into spans (storyEntrance); measure the real text
    // so the column never shifts sideways when the split starts or ends. The swap's own mutations
    // are dropped, or every measure would schedule the next.
    const measure = () => {
      withOriginalText(root, fit)
      mutations.takeRecords()
    }

    let frame = 0
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0
        measure()
      })
    }

    let lastWidth = root.clientWidth
    const resize = new ResizeObserver(() => {
      if (root.clientWidth === lastWidth) return
      lastWidth = root.clientWidth
      schedule()
    })
    resize.observe(root)
    // Only text changes inside a column matter (live edits, dial copy). The footer clock
    // ticking every second would otherwise re-measure every text line on the page.
    const mutations = new MutationObserver((records) => {
      const inColumn = records.some((r) => {
        const el = r.target instanceof Element ? r.target : r.target.parentElement
        return Boolean(el?.closest('.column') && !el.closest(IGNORE_SELECTOR))
      })
      if (inColumn) schedule()
    })
    mutations.observe(root, { subtree: true, childList: true, characterData: true })
    measure()
    void document.fonts.ready.then(schedule)
    // Faces load as text first uses them, after `ready` too; each changes line widths.
    document.fonts.addEventListener('loadingdone', schedule)

    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      mutations.disconnect()
      document.fonts.removeEventListener('loadingdone', schedule)
    }
  }, [rootRef])
}
