import type { MomoThumbValues } from './config'

export type MomoThumbLayout = 'd' | 'm'

export interface MomoThumb {
  /** Applies values (the first call sets everything; later calls apply only what changed). */
  apply(values: MomoThumbValues): void
  replay(): void
  togglePause(): void
  destroy(): void
}

export function sceneHTML(key: MomoThumbLayout, options?: { chrome?: boolean }): string

export function mountMomoThumb(options: {
  root: HTMLElement
  cards: HTMLElement[]
  mesh?: boolean
  keys?: boolean
}): MomoThumb
