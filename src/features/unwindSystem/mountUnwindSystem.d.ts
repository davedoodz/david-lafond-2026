export const SETTINGS_KEY: string

export type TipAnimation = 'fade' | 'pop' | 'grow' | 'slide' | 'bounce' | 'instant'
/** Arrow-tip entrance presets for the case study (`fade` is the studio original). */
export const TIP_ANIMATIONS: readonly TipAnimation[]

export type UnwindSystemHandle = {
  /** Starts the walkthrough from its first step. Sequence mode then rests on the final step. */
  start(): void
  /** Pauses automatic step changes while the figure is off-screen. */
  pause(): void
  /** Embed/sequence only: px between each blue node icon and its title; arrows that clear titles follow. */
  setTitleGap(px: number): void
  /** Embed/sequence only: hold time in ms for each step (index = step); overrides the baked step time. */
  setStepHolds(ms: number[]): void
  /** Embed/sequence only: how arrow tips enter; applies from the next drawn arrow. */
  setTipAnimation(name: TipAnimation): void
  destroy(): void
}

export function mountUnwindSystem(
  root: HTMLElement,
  options?: {
    /** 'studio': every tuning surface; 'embed': walkthrough with chrome; 'sequence': autoplay only. */
    mode?: 'studio' | 'embed' | 'sequence'
    /** Embed/sequence only: with layout 'auto', a narrow frame uses the diamond layout. */
    narrow?: boolean
    /** Multiplier for each step's hold duration. */
    sequenceSpeed?: number
    /** Multiplier for line draws, text reveals, icon motion and moving-flow effects. */
    motionSpeed?: number
    /** Initial px between each blue node icon and its title (defaults to the baked studio value). */
    titleGap?: number
    /** Initial per-step hold times in ms (index = step). */
    stepHolds?: number[]
    /** Initial arrow-tip entrance preset (default 'fade'). */
    tipAnimation?: TipAnimation
  },
): Promise<UnwindSystemHandle>
