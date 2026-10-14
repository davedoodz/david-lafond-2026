import { useCallback, useEffect, useRef, useState } from 'react'
import saved from '../../data/portfolio-layouts.json'
import { PAGE_LAYOUTS, type PageLayout } from './pageLayouts'

const RECOVERY_KEY = 'portfolio-layouts:pending:v1'
type Layouts = Record<number, PageLayout>
let pending: Layouts = {}
// One queue survives route remounts; an older save must never overtake a newer edit.
let saveQueue = Promise.resolve()
if (import.meta.env.DEV) {
  try { pending = JSON.parse(localStorage.getItem(RECOVERY_KEY) || '{}') as Layouts } catch { /* Source layouts remain available when browser storage is disabled. */ }
}

/** Dev changes are written to source; a pending local copy survives a lost connection. */
export function usePageLayouts() {
  const [pages, setPages] = useState<Layouts>(() => import.meta.env.DEV ? { ...PAGE_LAYOUTS, ...saved, ...pending } : {})
  const [status, setStatus] = useState('Saved')
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  const savePage = useCallback((page: number, layout: PageLayout) => {
    if (!import.meta.env.DEV) return
    setPages((current) => ({ ...current, [page]: layout }))
    pending[page] = layout
    let localSaved = true
    try { localStorage.setItem(RECOVERY_KEY, JSON.stringify(pending)) } catch { localSaved = false }
    setStatus('Saving…')
    saveQueue = saveQueue.then(async () => {
      try {
        const response = await fetch('/__dev/save', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ file: 'portfolioLayouts', key: String(page), data: layout }),
        })
        if (!response.ok) throw new Error('Source save failed')
        if (pending[page] === layout) {
          delete pending[page]
          try { localStorage.setItem(RECOVERY_KEY, JSON.stringify(pending)) } catch { /* Source save succeeded. */ }
        }
        if (mounted.current) setStatus(Object.keys(pending).length ? 'Project saves pending — retry below' : 'Saved to project')
      } catch {
        if (mounted.current) setStatus(localSaved ? 'Saved locally — project save unavailable; retry below' : 'Not saved — retry below')
      }
    })
  }, [])

  const retry = useCallback(() => {
    for (const [page, layout] of Object.entries(pending)) savePage(Number(page), layout)
  }, [savePage])
  useEffect(() => { retry() }, [retry])
  return { pages, savePage, status, retry }
}
