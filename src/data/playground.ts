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
  videoFit?: 'cover'
  presentation?: 'journal' | 'critical-action' | 'portfolio'
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
  },
  {
    id: 'p05',
    title: 'Architectural sketchbooks',
    video: '/about/playground/architectural-sketchbooks.mp4',
    poster: '/about/playground/architectural-sketchbooks.webp',
  },
  {
    id: 'p06',
    title: 'David’s Journal',
    video: '/about/playground/davids-journal.mp4',
    poster: '/about/playground/davids-journal.webp',
    presentation: 'journal',
  },
  {
    id: 'p07',
    title: 'Decode: A Critical Action',
    presentation: 'critical-action',
  },
  {
    id: 'p08',
    title: 'My room in 3D',
    video: '/about/playground/bedroom-world.mp4',
    poster: '/about/playground/bedroom-world.webp',
    videoFit: 'cover',
  },
  {
    id: 'p09',
    title: 'Harvard + MIT acceptance portfolio',
    video: '/about/playground/harvard-mit-portfolio.mp4',
    poster: '/about/playground/harvard-mit-portfolio.webp',
    presentation: 'portfolio',
  },
  {
    id: 'p10',
    title: 'Interactive signature',
    video: '/about/playground/interactive-signature.mp4',
    poster: '/about/playground/interactive-signature.webp',
  },
  {
    id: 'p11',
    title: 'Globalization research explorer',
    video: '/about/playground/globalization-research.mp4',
    poster: '/about/playground/globalization-research.webp',
  },
  { id: 'p12', title: 'Prototype 12' },
  { id: 'p13', title: 'Prototype 13' },
  { id: 'p14', title: 'Prototype 14' },
  { id: 'p15', title: 'Prototype 15' },
  { id: 'p16', title: 'Prototype 16' },
]
