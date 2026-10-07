/**
 * Playground grid content. 16 slots, 4x4 desktop / 2x8 mobile.
 * Titles here are the baseline defaults — the DialKit "Playground" panel's
 * `titles` folder exposes one text field per card that overrides these live.
 * Items without media render the #D9D9D9 placeholder fill until David wires
 * in a source.
 */
export type PlaygroundItem = {
  id: string
  title: string
  /** Muted/looped source, played only while the card is on screen or zoomed. */
  video?: string
  poster?: string
  /** Preserve portrait media inside the landscape card instead of cropping it. */
  fit?: 'cover' | 'contain'
}

export const playgroundItems: PlaygroundItem[] = [
  {
    id: 'p01',
    title: 'Paper shaders',
    video: '/about/playground/paper-shaders.mp4',
    poster: '/about/playground/paper-shaders.webp',
  },
  {
    id: 'p02',
    title: 'FutureFabric',
    video: '/about/playground/futurefabric.mp4',
    poster: '/about/playground/futurefabric.webp',
  },
  {
    id: 'p03',
    title: 'Nintendogs for macOS',
    video: '/about/playground/nintendogs.mp4',
    poster: '/about/playground/nintendogs.webp',
  },
  {
    id: 'p04',
    title: 'Renovation contractor agent',
    video: '/about/playground/contractor-agent.mp4',
    poster: '/about/playground/contractor-agent.webp',
    fit: 'contain',
  },
  { id: 'p05', title: 'Prototype 05' },
  { id: 'p06', title: 'Prototype 06' },
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
