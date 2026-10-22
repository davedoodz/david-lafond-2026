/**
 * Keeps a page's images, videos and embedded prototypes loaded ahead of the reader, so nothing
 * paints blank while scrolling, on slow phone networks too.
 *
 * One queue, nearest first: a few loads at a time, always the media closest to the screen (ahead of
 * it before behind it), re-picked as the reader scrolls. Starting a load means lazy images and
 * iframes switch to eager and videos to preload="auto". Media mounted later (sections that render
 * on demand, a source picked after measuring) joins the queue as it appears. After the page's own
 * media, the `extra` URLs follow (for example the case-study heroes a thumbnail opens).
 * Save-Data limits it to the next two screens.
 */
import { useEffect, type RefObject } from 'react'

/** Loads in flight at once: few enough that the nearest one gets most of a slow connection. */
const PARALLEL = 3
/** A load that stalls longer than this frees its slot for the next one. */
const STALL_MS = 8000
/** Save-Data: how far ahead to load, in screens. */
const SAVE_DATA_AHEAD = 2

type Media = HTMLImageElement | HTMLVideoElement | HTMLIFrameElement
const SELECTOR = 'img, video, iframe'

const started = new WeakSet<Media>()

/** Start loading one element; resolves once it can paint (or fails, or stalls). */
function warm(el: Media): Promise<void> {
  started.add(el)
  if (el instanceof HTMLVideoElement) {
    if (el.preload !== 'auto') el.preload = 'auto'
    // iOS ignores preload and leaves a clip idle with nothing loaded; ask it to buffer now. A clip
    // already loading is left alone (load() would restart it).
    if (el.readyState === 0 && el.networkState === HTMLMediaElement.NETWORK_IDLE && el.paused) el.load()
  } else if (el.loading === 'lazy') {
    el.loading = 'eager'
  }
  const ready = el instanceof HTMLImageElement ? el.complete && el.naturalWidth > 0
    : el instanceof HTMLVideoElement ? el.readyState >= 3 || !(el.currentSrc || el.getAttribute('src'))
    : false
  if (ready) return Promise.resolve()
  return new Promise<void>((resolve) => {
    const events = el instanceof HTMLVideoElement ? ['canplaythrough', 'error'] : ['load', 'error']
    const done = () => {
      clearTimeout(timer)
      for (const type of events) el.removeEventListener(type, done)
      resolve()
    }
    for (const type of events) el.addEventListener(type, done)
    const timer = window.setTimeout(done, STALL_MS)
  })
}

function prefetch(url: string) {
  return new Promise<void>((resolve) => {
    const img = new Image()
    img.onload = img.onerror = () => resolve()
    img.src = url
  })
}

/** Distance from the screen in px: media below the screen ranks ahead of media above it. */
function distance(el: Element) {
  const r = el.getBoundingClientRect()
  if (r.bottom >= 0 && r.top <= window.innerHeight) return 0
  return r.top > window.innerHeight ? r.top - window.innerHeight : -r.bottom * 1.5
}

export function useMediaWarmup(ref: RefObject<HTMLElement | null>, extra: readonly string[] = []) {
  const extraKey = extra.join('\n')
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true
    let alive = true
    let running = 0
    let extrasDone = false

    const pump = () => {
      if (!alive) return
      const limit = saveData ? SAVE_DATA_AHEAD * window.innerHeight : Infinity
      const waiting = [...root.querySelectorAll<Media>(SELECTOR)]
        .filter((el) => !started.has(el))
        .map((el) => [el, distance(el)] as const)
        .filter(([, d]) => Math.abs(d) <= limit)
        .sort((a, b) => Math.abs(a[1]) - Math.abs(b[1]))
      for (const [el] of waiting) {
        if (running >= PARALLEL) return
        running++
        void warm(el).then(() => {
          running--
          pump()
        })
      }
      if (!waiting.length && !running && !extrasDone && !saveData) {
        extrasDone = true
        void (async () => { for (const url of extra) if (alive) await prefetch(url) })()
      }
    }

    let frame = 0
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; pump() })
    }
    const added = new MutationObserver(schedule)
    added.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] })
    window.addEventListener('scroll', schedule, { passive: true })
    schedule()

    return () => {
      alive = false
      cancelAnimationFrame(frame)
      added.disconnect()
      window.removeEventListener('scroll', schedule)
    }
    // `extraKey` captures `extra`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, extraKey])
}
