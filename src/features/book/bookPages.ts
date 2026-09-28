/**
 * The Harvard & MIT portfolio book: 60 A4 pages (front cover, 58 interior
 * pages, back cover). Three sizes of every page:
 * - thumb  480 px wide, bundled here, for the grid and far-away book pages
 * - medium 1600 px wide, for reading in the book
 * - detail 4961 px wide (600 dpi A4 scan), swapped in only while zoomed
 * Medium and detail live on the portfolio Vercel Blob store.
 */
export const PAGE_COUNT = 60
/** Page width / height (A4). */
export const PAGE_ASPECT = 1600 / 2263

const BLOB_ROOT = 'https://iywe3spz629xaaix.public.blob.vercel-storage.com/mit-harvard-portfolio'
const pad = (page: number) => String(page).padStart(2, '0')

export type PageQuality = 'thumb' | 'medium' | 'detail'

/** `page` is 1-based. */
export function pageUrl(page: number, quality: PageQuality): string {
  if (quality === 'thumb') return `/work/harvard-mit/thumbs/page-${pad(page)}.webp`
  return `${BLOB_ROOT}/${quality}/page-${pad(page)}.webp`
}

/**
 * Spreads as the closed book shows them: the front cover alone, 29 two-page
 * spreads, then the back cover alone. Values are 1-based page numbers.
 */
export const SPREADS: number[][] = [
  [1],
  ...Array.from({ length: (PAGE_COUNT - 2) / 2 }, (_, i) => [2 + i * 2, 3 + i * 2]),
  [PAGE_COUNT],
]

export function pageLabel(pages: number[]): string {
  return pages.length === 1 ? String(pages[0]) : `${pages[0]}–${pages[pages.length - 1]}`
}
