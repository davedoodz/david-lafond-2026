/**
 * Davebot's local answer index — this site's facts only, ported in spirit
 * from ditto's `public/ask-index.json`. Every `source`/`answer` string is
 * grounded in what David has actually shared; nothing here is invented.
 */
import type { Route } from '../../lib/router'

export type AnswerSegment = { text: string; emphasis?: boolean }

export type DavebotEntry = {
  id: string
  title: string
  /** An in-app route, or an absolute `mailto:`/`https:` URL. */
  route: Route | string
  keys: string[]
  answer: AnswerSegment[]
}

export const DAVEBOT_ENTRIES: DavebotEntry[] = [
  {
    id: 'work',
    title: 'Selected work',
    route: 'work',
    keys: ['work', 'projects', 'portfolio', 'case studies', 'what did david build', 'what work is here'],
    answer: [
      { text: 'Three projects lead the portfolio: ' },
      { text: 'Unwind', emphasis: true },
      { text: ', a multimodal AI reflection system for behavioral change; ' },
      { text: 'Filo', emphasis: true },
      { text: ', an AI agent that gets new biomaterials from swatch to production; and the ' },
      { text: 'design portfolio', emphasis: true },
      { text: ' that got David into Harvard and MIT.' },
    ],
  },
  {
    id: 'unwind',
    title: 'Unwind',
    route: 'work',
    keys: ['unwind', 'reflection', 'behavioral change', 'multimodal', 'journaling', 'wellbeing'],
    answer: [
      { text: 'Unwind is a ' },
      { text: 'novel multimodal AI reflection system for behavioral change', emphasis: true },
      { text: ' — David designed it to help people notice and shift patterns through more than one input mode, not just text.' },
    ],
  },
  {
    id: 'filo',
    title: 'Filo',
    route: 'work',
    keys: ['filo', 'ecofabriq', 'eco fabriq', 'biomaterials', 'biotextiles', 'bio-textiles', 'agentic commerce', 'material adoption'],
    answer: [
      { text: 'Filo is ' },
      { text: 'an AI agent for fashion technical designers', emphasis: true },
      { text: ' — it runs sampling, lab tests and the factory handoff for a new biomaterial, then returns a go/no-go with evidence. It started as EcoFabriq, a 2024 hackathon marketplace that 11 industry interviews proved was solving the wrong step.' },
    ],
  },
  {
    id: 'portfolio-piece',
    title: 'The design portfolio that got David into Harvard & MIT',
    route: 'work',
    keys: ['harvard', 'mit portfolio', 'application portfolio', 'design portfolio', 'admissions', 'got into'],
    answer: [
      { text: 'That case study walks through ' },
      { text: 'the design portfolio David used to get into both Harvard and MIT', emphasis: true },
      { text: ' — the work and the thinking behind how it was put together.' },
    ],
  },
  {
    id: 'about',
    title: 'About David',
    route: 'about',
    keys: ['about', 'who is david', 'background', 'architect', 'researcher', 'bio', 'career path'],
    answer: [
      { text: 'David is an ' },
      { text: 'architect and ex-MIT UX researcher now focused on product design', emphasis: true },
      { text: '. His path ran from pre-med, to architecture, to product design — three ways of asking the same question about how people actually use the things built for them.' },
    ],
  },
  {
    id: 'contact',
    title: 'Contact David',
    route: 'mailto:davidkhanhlafond@gmail.com',
    keys: ['contact', 'email', 'hire', 'hiring', 'available', 'work together', 'freelance', 'job', 'can i hire you'],
    answer: [
      { text: 'Yes — start with ' },
      { text: 'davidkhanhlafond@gmail.com', emphasis: true },
      { text: '. You can also find him on LinkedIn, X, and GitHub.' },
    ],
  },
  {
    id: 'linkedin',
    title: 'LinkedIn',
    route: 'https://www.linkedin.com/in/davidlafondx/',
    keys: ['linkedin', 'linked in'],
    answer: [{ text: "David's LinkedIn is " }, { text: 'linkedin.com/in/davidlafondx', emphasis: true }, { text: '.' }],
  },
  {
    id: 'x',
    title: 'X',
    route: 'https://x.com/davidlafondx',
    keys: ['x', 'twitter'],
    answer: [{ text: "David's on X as " }, { text: '@davidlafondx', emphasis: true }, { text: '.' }],
  },
  {
    id: 'github',
    title: 'GitHub',
    route: 'https://github.com/davedoodz',
    keys: ['github', 'git hub', 'code', 'repos'],
    answer: [{ text: "David's GitHub is " }, { text: 'github.com/davedoodz', emphasis: true }, { text: '.' }],
  },
]

export const DAVEBOT_ENTRY_BY_ID: Record<string, DavebotEntry> = Object.fromEntries(
  DAVEBOT_ENTRIES.map(entry => [entry.id, entry]),
)

const STOP_WORDS: Record<string, true> = {
  a: true, about: true, and: true, can: true, do: true, for: true, i: true, in: true,
  is: true, me: true, of: true, on: true, the: true, tell: true, to: true, what: true,
  who: true, you: true,
}

function normalize(value: string): string {
  return value.toLowerCase().replaceAll(/['\u2019]/g, '').replaceAll(/[^a-z0-9]+/g, ' ').trim()
}

/** Best-scoring entries for a free-text query, highest first. Zero-score entries are dropped. */
export function rankEntries(query: string, entries: DavebotEntry[] = DAVEBOT_ENTRIES): DavebotEntry[] {
  const phrase = normalize(query)
  const queryTokens = phrase.split(' ').filter(token => token.length > 1 && !STOP_WORDS[token])

  return entries
    .map(entry => {
      const keys = entry.keys.map(normalize)
      const haystack = normalize([entry.id, entry.title, ...entry.keys].join(' '))
      let score = 0
      for (const key of keys) {
        if (phrase === key) score += 24
        else if (phrase.includes(key) || key.includes(phrase)) score += 8
      }
      for (const token of queryTokens) {
        if (haystack.includes(token)) score += token.length >= 5 ? 3 : 2
      }
      return { entry, score }
    })
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(result => result.entry)
}

export function isExternalRoute(route: string): boolean {
  return route.startsWith('mailto:') || /^https?:/.test(route)
}
