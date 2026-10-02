import type { Route } from '../lib/router'

/** Selected works. Media (image/video loops) plugs in per card once assets exist. */
export type Work = {
  id: 'unwind' | 'filo' | 'harvard-mit'
  title: string
  shortTitle: string
  /** Surface under the card for the custom cursor (white dot on dark, black on light). */
  surface: 'dark' | 'light'
  /** Project page the card opens, when it has one. */
  route?: Route
}

export const WORKS: Work[] = [
  {
    id: 'unwind',
    title: 'Unwind – Novel Multimodal AI Reflection System for Behavioral Change',
    shortTitle: 'Unwind',
    surface: 'dark',
    route: 'unwind',
  },
  {
    id: 'filo',
    title: 'Filo – Agentic Commerce for Biomaterial Adoption in Fashion',
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
