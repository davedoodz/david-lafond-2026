/** Card aspect ratios from the Paper design — differ slightly per breakpoint. */
export const DESKTOP_CARD_RATIO = 230 / 208
export const MOBILE_CARD_RATIO = 142 / 129

/** Matches the global mobile breakpoint used across the site (global.css). */
export const MOBILE_BREAKPOINT = 640

export function cardRatioForViewport(width: number): number {
  return width <= MOBILE_BREAKPOINT ? MOBILE_CARD_RATIO : DESKTOP_CARD_RATIO
}
