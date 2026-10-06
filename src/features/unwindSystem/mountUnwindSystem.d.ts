export const SETTINGS_KEY: string

export type UnwindSystemHandle = {
  /** Starts the studio walkthrough sequence from its first step. */
  start(): void
  /** Pauses automatic step changes while the figure is off-screen. */
  pause(): void
  destroy(): void
}

export function mountUnwindSystem(
  root: HTMLElement,
  options?: {
    /** 'studio': every tuning surface; 'embed': walkthrough with chrome; 'sequence': autoplay only. */
    mode?: 'studio' | 'embed' | 'sequence'
    /** Embed/sequence only: with layout 'auto', a narrow frame uses the diamond layout. */
    narrow?: boolean
  },
): Promise<UnwindSystemHandle>
