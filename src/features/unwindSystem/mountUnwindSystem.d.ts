export const SETTINGS_KEY: string

export type UnwindSystemHandle = {
  /** Starts the requested presentation; Full loop stays on its tuned final state. */
  start(): void
  /** Stops the frame loop and empties the root. */
  destroy(): void
}

export function mountUnwindSystem(
  root: HTMLElement,
  options?: {
    /** 'studio': every tuning surface; 'embed': walkthrough; 'full-loop': tuned final state only. */
    mode?: 'studio' | 'embed' | 'full-loop'
    /** Embed/full-loop only: with layout 'auto', a narrow frame uses the diamond layout. */
    narrow?: boolean
  },
): Promise<UnwindSystemHandle>
