type Connection = { saveData?: boolean; effectiveType?: string }
const nav = navigator as Navigator & { connection?: Connection; deviceMemory?: number }

/**
 * Lite media: Save-Data is on, the connection is 3G-class or slower, or the phone has 2 GB of memory or
 * less. Autoplaying video then stays on its poster (where a playback toggle shows, it still plays on
 * request) and the media warmup only fetches images for the next two screens. Chromium reports these
 * signals; Safari reports none, so iPhones keep the full experience. Read once per visit, so the page
 * never switches modes mid-scroll.
 */
export const liteMedia =
  nav.connection?.saveData === true ||
  /^(slow-2g|2g|3g)$/.test(nav.connection?.effectiveType ?? '') ||
  (nav.deviceMemory ?? Infinity) <= 2
