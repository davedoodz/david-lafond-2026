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
      { text: 'Momo', emphasis: true },
      { text: ', a multimodal AI reflection system for behavioral change; ' },
      { text: 'Filo', emphasis: true },
      { text: ', an AI agent that gets new biomaterials from swatch to production; and the ' },
      { text: 'design portfolio', emphasis: true },
      { text: ' that got David into Harvard and MIT.' },
    ],
  },
  {
    id: 'momo',
    title: 'Momo',
    route: 'work',
    keys: ['momo', 'reflection', 'behavioral change', 'multimodal', 'journaling', 'wellbeing'],
    answer: [
      { text: 'Momo is a ' },
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
      { text: 'David is a ' },
      { text: 'product designer with architecture, research, and technical-prototyping experience', emphasis: true },
      { text: '. He is most credible on ambiguous products where the system, interaction model, and story still need to be defined.' },
    ],
  },
  {
    id: 'recruiter-fit',
    title: 'Why interview David',
    route: 'about',
    keys: [
      'why david', 'why hire david', 'why interview david', 'candidate', 'fit', 'strengths',
      'what makes david different', 'what sets him apart', 'good designer',
    ],
    answer: [
      { text: 'David is strongest when a product is still an ' },
      { text: 'untidy pile of assumptions', emphasis: true },
      { text: '. He uses research to find the real problem, prototypes the system in enough detail to test it, and explains the result without hiding the tradeoffs. Filo is the neatest proof: 11 interviews showed the original marketplace solved the wrong step, so he reframed the product around adoption risk.' },
    ],
  },
  {
    id: 'recruiter-experience',
    title: 'Experience',
    route: 'about',
    keys: [
      'experience', 'work history', 'career', 'previous roles', 'companies', 'professional',
      'tekuma', 'senseable', 'media lab', 'pumba',
    ],
    answer: [
      { text: 'David has worked across ' },
      { text: 'smart-city design, MIT research teams, and early-stage products', emphasis: true },
      { text: '. His public record includes Tekuma Urban Innovation, MIT Media Lab Fluid Interfaces, MIT Senseable City Lab, and Pumba Parking. The common thread is turning complex systems into decisions people can use—occasionally with fewer spreadsheets than the system originally requested.' },
    ],
  },
  {
    id: 'recruiter-education',
    title: 'Education',
    route: 'about',
    keys: ['education', 'school', 'degree', 'mit', 'mcgill', 'architecture', 'product management', 'sloan'],
    answer: [
      { text: 'David holds a ' },
      { text: 'Master of Architecture from MIT', emphasis: true },
      { text: ', a Product Management certificate from MIT Sloan, and a BSc in Architecture from McGill. At McGill he was a founding member of the Computational Design Lab and received 8+ scholarship grants and awards.' },
    ],
  },
  {
    id: 'recruiter-impact',
    title: 'Measured impact',
    route: 'about',
    keys: ['impact', 'metrics', 'results', 'outcomes', 'numbers', 'evidence', 'measurable'],
    answer: [
      { text: 'A few useful numbers: Momo’s 20-person field study saw weekly action plans rise from ' },
      { text: '3.33 to 6.53', emphasis: true },
      { text: '; Global Interiors turned 640K+ images across 80 cities into an interactive data story; and an internal Tekuma design tool cut presentation production time by 60%. Davebot keeps the receipts. Tiny ghost, surprisingly organized filing cabinet.' },
    ],
  },
  {
    id: 'recruiter-process',
    title: 'Design process',
    route: 'work/momo',
    keys: [
      'process', 'research process', 'design process', 'user research', 'interviews',
      'testing', 'prototype', 'how does david work',
    ],
    answer: [
      { text: 'David’s process is evidence-led rather than ceremony-led: ' },
      { text: 'frame the risk, talk to the people carrying it, prototype the uncertain part, and change direction when the evidence disagrees', emphasis: true },
      { text: '. Momo used a 15-day field study; Filo changed shape after 11 supply-chain interviews; Pumba used 12 city-planner interviews to define a B2G dashboard.' },
    ],
  },
  {
    id: 'recruiter-technical',
    title: 'Technical prototyping',
    route: 'about',
    keys: [
      'technical', 'code', 'coding', 'prototype', 'prototyping', 'react', 'swift',
      'three js', 'webgl', 'ai tools', 'implementation',
    ],
    answer: [
      { text: 'David is an ' },
      { text: 'implementation-aware product designer and high-fidelity prototyper', emphasis: true },
      { text: '. His published toolkit includes React, React Native, Swift, HTML/CSS, Three.js, WebGL, Git, Codex, and Claude Code alongside Figma and Framer. The honest label is designer who can build convincing product behavior—not production software engineer unless David says otherwise.' },
    ],
  },
  {
    id: 'recruiter-communication',
    title: 'Communication and leadership',
    route: 'about',
    keys: [
      'communication', 'leadership', 'presenting', 'storytelling', 'facilitation',
      'content', 'youtube', 'community', 'collaboration',
    ],
    answer: [
      { text: 'David has led design delivery across international urban projects, facilitated weekly design sprints, and translated technical research into public-facing stories. His independent design work reached ' },
      { text: '340K+ views and 4.4M impressions', emphasis: true },
      { text: ' from 38 videos, and he grew an online design community to 800+ members. Useful evidence for a role where design has to earn alignment, not merely arrive looking polished.' },
    ],
  },
  {
    id: 'contact',
    title: 'Contact David',
    route: 'mailto:davidkhanhlafond@gmail.com',
    keys: ['contact', 'email', 'hire', 'hiring', 'available', 'work together', 'freelance', 'job', 'can i hire you'],
    answer: [
      { text: 'For availability, role details, or a conversation, contact ' },
      { text: 'davidkhanhlafond@gmail.com', emphasis: true },
      { text: '. Davebot is trusted with the portfolio, not the calendar. You can also find David on LinkedIn, X, and GitHub.' },
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
