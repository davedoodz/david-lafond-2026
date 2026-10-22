/**
 * Text temporarily split into animated spans for a load-in (features/storyEntrance), keyed by the
 * split element. useFitColumn swaps the original text back in for a moment to measure it, so the
 * centred column never shifts when the split starts or ends.
 */
export const entranceSplits = new WeakMap<HTMLElement, { showOriginal: () => void; showSplit: () => void }>()

/** Runs `measure` with every split element under `root` showing its original text. */
export function withOriginalText<T>(root: HTMLElement, measure: () => T): T {
  const swapped = [...root.querySelectorAll<HTMLElement>('[data-entrance-split]')].flatMap((el) => entranceSplits.get(el) ?? [])
  for (const split of swapped) split.showOriginal()
  try {
    return measure()
  } finally {
    for (const split of swapped) split.showSplit()
  }
}
