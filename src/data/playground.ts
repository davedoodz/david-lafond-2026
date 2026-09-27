/**
 * Playground grid content. 16 slots, 4x4 desktop / 2x8 mobile.
 * Titles here are the baseline defaults — the DialKit "Playground" panel's
 * `titles` folder exposes one text field per card that overrides these live.
 * Videos aren't produced yet: leave `video`/`poster` unset and the card
 * renders the #D9D9D9 placeholder fill until David wires a source in.
 */
export type PlaygroundItem = {
  id: string
  title: string
  /** Muted/looped source, played only while the card is on screen or zoomed. */
  video?: string
  poster?: string
}

export const playgroundItems: PlaygroundItem[] = [
  { id: 'p01', title: 'Prototype 01' },
  { id: 'p02', title: 'Prototype 02' },
  { id: 'p03', title: 'Prototype 03' },
  { id: 'p04', title: 'Prototype 04' },
  { id: 'p05', title: 'Prototype 05' },
  { id: 'p06', title: 'Nintendogs for MacOS' },
  { id: 'p07', title: 'Prototype 07' },
  { id: 'p08', title: 'Prototype 08' },
  { id: 'p09', title: 'Prototype 09' },
  { id: 'p10', title: 'Prototype 10' },
  { id: 'p11', title: 'Prototype 11' },
  { id: 'p12', title: 'Prototype 12' },
  { id: 'p13', title: 'Prototype 13' },
  { id: 'p14', title: 'Prototype 14' },
  { id: 'p15', title: 'Prototype 15' },
  { id: 'p16', title: 'Prototype 16' },
]
