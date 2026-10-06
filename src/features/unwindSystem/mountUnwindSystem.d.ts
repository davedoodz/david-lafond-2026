export const SETTINGS_KEY: string

export type UnwindSystemHandle = {
  /** Plays the walkthrough from step 1 (reduced motion: shows the full loop, still). */
  start(): void
  /** Stops the frame loop and empties the root. */
  destroy(): void
}

export function mountUnwindSystem(
  root: HTMLElement,
  options?: {
    /** 'studio': every tuning control plus the static options; 'embed': caption, figure and step pills. */
    mode?: 'studio' | 'embed'
    /** Embed only: with layout 'auto', a narrow frame uses the diamond layout. */
    narrow?: boolean
  },
): Promise<UnwindSystemHandle>
