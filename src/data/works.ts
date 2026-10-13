import type { Route } from '../lib/router'

/** Selected works. Media (image/video loops) plugs in per card once assets exist. */
export type Work = {
  id: 'momo' | 'filo' | 'harvard-mit'
  title: string
  shortTitle: string
  /** Surface under the card for the custom cursor (white dot on dark, black on light). */
  surface: 'dark' | 'light'
  /** Project page the card opens, when it has one. */
  route?: Route
}

export const WORKS: Work[] = [
  {
    id: 'momo',
    title: 'Momo – Novel Multimodal AI Reflection System for Behavioral Change',
    shortTitle: 'Momo',
    surface: 'dark',
    route: 'momo',
  },
  {
    id: 'filo',
    title: 'Filo – An Agentic Sample Room for Biomaterial Adoption in Fashion',
    shortTitle: 'Filo',
    surface: 'light',
    route: 'filo',
  },
  {
    id: 'harvard-mit',
    title: 'The Design Portfolio that Got Me Into Harvard & MIT',
    shortTitle: 'Harvard & MIT Design Portfolio',
    surface: 'dark',
    route: 'harvard-mit',
  },
]
