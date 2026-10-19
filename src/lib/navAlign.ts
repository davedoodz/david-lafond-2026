/**
 * Phones: every page's nav starts its first link where the Work hero's text starts.
 *
 * The Work hero sits at max(inset, min(50% − half, 100% − inset − wide)) of the screen width, where
 * `half` is a quarter of its narrowest + widest line and `wide` its widest line, both at full type
 * size (useHeroFit). Below the width where the hero type shrinks, that formula pins to the inset, as
 * the hero does. The Work page publishes both lengths on <html> (--nav-half, --nav-wide) and keeps
 * them in localStorage so other pages, even opened first after a copy change, place their nav the
 * same way (Nav.css). The CSS fallbacks match the current copy.
 */
const KEY = 'nav-align'

function apply(half: number, wide: number) {
  const root = document.documentElement.style
  root.setProperty('--nav-half', `${half.toFixed(1)}px`)
  root.setProperty('--nav-wide', `${wide.toFixed(1)}px`)
}

export function publishNavAlign(half: number, wide: number) {
  apply(half, wide)
  localStorage.setItem(KEY, JSON.stringify([half, wide]))
}

export function restoreNavAlign() {
  if (document.documentElement.style.getPropertyValue('--nav-half')) return
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (Array.isArray(value) && typeof value[0] === 'number' && typeof value[1] === 'number') apply(value[0], value[1])
  } catch {
    // Unreadable: the CSS fallbacks apply.
  }
}
