/**
 * Case-study copy and media dials. Every section is one full-screen snap stop:
 * an eyebrow (also its sidebar label), a title, a short body, and an optional
 * prototype video placed relative to the text. All copy is editable on the page
 * in dev and autosaves to tuning.json, like the About story.
 */
type Tuple = [number, number, number, number]

/** Prototype recordings in public/work/unwind/proto: the phone only, cropped to its frame (1080 px tall H.264 + first-frame poster). */
export const PROTO_VIDEOS = {
  'welcome-park': { w: 522, h: 1080 },
  'freeform-evening': { w: 522, h: 1080 },
  'guided-models': { w: 528, h: 1080 },
  'guided-woop': { w: 528, h: 1080 },
} as const
export type ProtoVideo = keyof typeof PROTO_VIDEOS
const VIDEO_OPTIONS = ['none', ...Object.keys(PROTO_VIDEOS)]

/** Where the video sits relative to the text. */
const LAYOUTS = ['right', 'left', 'below', 'above', 'center']

type SectionDefaults = {
  eyebrow: string
  title: string
  body?: string
  video?: ProtoVideo | 'none'
  layout?: 'right' | 'left' | 'below' | 'above' | 'center'
  size?: number
  gap?: number
}

export function sectionDials(d: SectionDefaults) {
  return {
    eyebrow: { type: 'text' as const, default: d.eyebrow },
    title: { type: 'text' as const, default: d.title },
    body: { type: 'text' as const, default: d.body ?? '', placeholder: 'Blank lines = paragraph breaks' },
    media: {
      video: { type: 'select' as const, options: VIDEO_OPTIONS, default: d.video ?? 'none' },
      layout: { type: 'select' as const, options: LAYOUTS, default: d.layout ?? 'right' },
      /** Video height, % of the screen height. */
      size: [d.size ?? 72, 20, 95, 1] as Tuple,
      /** Space between the text and the video (px). */
      gap: [d.gap ?? 72, 0, 240, 1] as Tuple,
      /** Nudge from its slot, % of the video's own width / height. */
      x: [0, -60, 60, 0.5] as Tuple,
      y: [0, -60, 60, 0.5] as Tuple,
      radius: [0, 0, 60, 1] as Tuple,
      _collapsed: true,
    },
    _collapsed: true,
  }
}

const pageDials = {
  snap: { type: 'select' as const, options: ['off', 'proximity', 'mandatory'], default: 'mandatory' },
  showSidebar: true,
  /** Widest the content column gets (px). */
  contentWidth: [1040, 600, 1400, 10] as Tuple,
  /** Text column width when the video sits beside it (px). */
  textWidth: [520, 280, 760, 10] as Tuple,
  _collapsed: false,
}

const heroDials = (d: SectionDefaults & { role: string; timeline: string; team: string }) => ({
  ...sectionDials(d),
  role: { type: 'text' as const, default: d.role },
  timeline: { type: 'text' as const, default: d.timeline },
  team: { type: 'text' as const, default: d.team },
  _collapsed: false,
})

export const UNWIND_CONFIG = {
  page: pageDials,
  hero: heroDials({
    eyebrow: 'Unwind · RE:SELF · 2025',
    title: 'Unwind – Novel Multimodal AI Reflection System for Behavioral Change',
    video: 'welcome-park',
    layout: 'center',
    size: 44,
    gap: 28,
    role: 'Lead Product Designer',
    timeline: 'March – September 2025',
    team: '2 developers\n2 designers\n2 therapists',
  }),
  overview: sectionDials({
    eyebrow: 'Overview',
    title: 'Knowing isn’t doing: The Action Gap',
    body: 'I noticed that strong intention to change, alone, rarely translates into new behavior. So I designed RE:SELF: a multimodal AI voice journaling system that pairs counterfactual reflection with biometric sensing to close the gap between noticing a pattern and acting on it.',
    video: 'freeform-evening',
  }),
  problem: sectionDials({
    eyebrow: 'Problem',
    title: 'Reflection tools help people notice the loop, but never help them break it.',
    body: 'People stuck in a recurring regret can usually name the exact trigger, but insight alone doesn’t change what happens next time. Existing journaling tools capture the moment after it’s already passed.',
    layout: 'below',
  }),
  opportunity: sectionDials({
    eyebrow: 'Opportunity',
    title: 'A wearable-augmented reflection tool for self-awareness and adaptive behavioral change.',
    layout: 'below',
  }),
  solution: sectionDials({
    eyebrow: 'Solution',
    title: 'A Novel Counterfactual Reflection System',
    body: 'RE:SELF pairs a smartwatch that senses rising stress with a voice journal built for the moment itself. It captures the regret as it happens, then turns it into a counterfactual and an if-then plan for the next time the pattern shows up.',
    video: 'guided-models',
  }),
  context: sectionDials({
    eyebrow: 'Context',
    title: 'A Context-Aware Journaling System',
    body: 'Micro-reflection prompts read emotional state from context clues and biometric variation.\n\nspeech / acoustic variability\ntemperature / humidity\nheart rate variability\nrespiratory rate\noxygen levels',
    video: 'welcome-park',
    layout: 'left',
  }),
  tracking: sectionDials({
    eyebrow: 'Tracking change',
    title: 'Tracking Behavioral Change',
    body: 'A daily calendar tracks shifts, obstacles and habit formation over time.\n\nWeekly, user-driven goals turn into “if-then” plans.',
    video: 'guided-woop',
  }),
  outcomes: sectionDials({
    eyebrow: 'Outcomes',
    title: 'Coping flexibility improved significantly across a 15-day pilot with 20 participants.',
    body: 'Guided reflection produced nearly twice as many action plans, and participants put more of them into practice in daily life.',
    layout: 'below',
  }),
}

export const ECOFABRIQ_CONFIG = {
  page: pageDials,
  hero: heroDials({
    eyebrow: 'EcoFabriq',
    title: 'EcoFabriq – Personalized AI-Driven Smart Product Discovery for Bio-Textiles',
    layout: 'below',
    role: '',
    timeline: '',
    team: '',
  }),
}
