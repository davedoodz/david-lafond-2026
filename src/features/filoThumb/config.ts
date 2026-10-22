/**
 * The Filo card's layers (phone, tag, portal) as David set them in the studio
 * (public/work/filo/studio/thumbnail-layers.html, "01 · Triptych, picked", Oct 21).
 *
 * Placement is in card px of the studio's cards: desktop 867 × 493, mobile 308 × 413.
 * Phone: x, y = top-left, size = phone height. Portal: x, y = top-left, size = window width.
 * Tag: x = centre of the tag body, y = top of the body, size = body height.
 */
export type Place = { x: number; y: number; size: number }
export type Layout = { width: number; phone: Place; tag: Place; desk: Place }

export const FILO_LAYOUT: { d: Layout; m: Layout } = {
  d: { width: 867, phone: { x: 9, y: 139, size: 432 }, tag: { x: 377, y: 63, size: 220 }, desk: { x: 559, y: 142, size: 794 } },
  m: { width: 308, phone: { x: -11, y: 197, size: 287 }, tag: { x: 83, y: 43, size: 119 }, desk: { x: 171, y: 21, size: 406 } },
}

export const FILO_MOTION = {
  /** Tag sway speed (1 = one swing every 6.5 s). */
  sway: 3,
  /** Slide speed: divides every slide duration. */
  slide: 1.3,
  /** Seconds after the slide-in starts before each layer moves; its clip starts as it moves. */
  delay: { phone: 0.6, tag: 0, desk: 0.6 },
  /** Clip playback rates. */
  rate: { phone: 1.4, desk: 1.4 },
  /** Seconds the layers stay in, then away (empty wall) before they slide back. */
  stay: 6.5,
  away: 2.5,
  /** The slide-out at 1× speed, in seconds (the last layer leaves 0.3 s after the first, each takes 0.9 s). */
  exit: 1.2,
}

export const FILO_MEDIA = {
  phone: '/work/filo/thumb/phone-tap.mp4',
  desk: '/work/filo/thumb/desk-materials.mp4',
  /** First frames, shown until each clip can play, so the screens are never empty. */
  phonePoster: '/work/filo/thumb/phone-tap.webp',
  deskPoster: '/work/filo/thumb/desk-materials.webp',
  tag: '/work/filo/filo-app-flow/filo-tag.webp',
  cord: '/work/filo/thumb/tag-cord.webp',
}

/** filo-tag.webp: image px, and the tag body inside it (top, height, centre x). */
export const TAG_ART = { w: 368, h: 900, top: 245, height: 653, cx: 184 }
