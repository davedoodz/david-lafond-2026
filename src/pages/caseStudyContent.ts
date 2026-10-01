/**
 * Case-study copy and media dials. Every section is one full-screen snap stop:
 * an eyebrow (also its sidebar label), a title, a short body, and an optional
 * prototype video placed relative to the text. All copy is editable on the page
 * in dev and autosaves to tuning.json, like the About story.
 */
type Tuple = [number, number, number, number]

/** Prototype recordings in public/work/unwind/proto: the phone only, cropped to its frame (1080 px tall H.264 + first-frame poster). */
export const PROTO_VIDEOS = {
  'welcome-park': { w: 522, h: 1080, dir: 'proto' },
  'freeform-evening': { w: 522, h: 1080, dir: 'proto' },
  'guided-models': { w: 530, h: 1080, dir: 'flows' },
  'guided-woop': { w: 530, h: 1080, dir: 'flows' },
  voice: { w: 530, h: 1080, dir: 'flows' },
  dynamic: { w: 530, h: 1080, dir: 'flows' },
  entries: { w: 530, h: 1080, dir: 'flows' },
} as const
export type ProtoVideo = keyof typeof PROTO_VIDEOS
const VIDEO_OPTIONS = ['none', ...Object.keys(PROTO_VIDEOS)]

/** Where the video sits relative to the text. */
const LAYOUTS = ['right', 'left', 'below', 'above', 'center', 'rise']

type SectionDefaults = {
  eyebrow: string
  title: string
  body?: string
  video?: ProtoVideo | 'none'
  /** Re:Self diagram shown instead of a video. */
  figure?: 'none' | 'flow' | 'system' | 'notification' | 'vision' | 'signals'
  layout?: 'right' | 'left' | 'below' | 'above' | 'center' | 'rise'
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
      figure: { type: 'select' as const, options: ['none', 'flow', 'system', 'vision', 'signals', 'notification'], default: d.figure ?? 'none' },
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
    layout: 'rise',
    size: 78,
    gap: 44,
    role: 'Lead Product Designer',
    timeline: 'March – September 2025',
    team: '2 developers\n2 designers\n2 therapists',
  }),
  /** Hero vertical spacing (px): logos → title, title → role/timeline/team, those → the phone. */
  heroSpacing: {
    logosToTitle: [16, -40, 160, 1] as Tuple,
    titleToMeta: [40, 0, 200, 1] as Tuple,
    metaToPhone: [44, 0, 240, 1] as Tuple,
    /** Phone height (svh); the whole phone shows, no cut at the fold. */
    phoneHeight: [50, 30, 90, 1] as Tuple,
    _collapsed: false,
  },
  /** Partner logos in the hero (public/work/unwind/logos). Rendered by the hero, not as a section. */
  logos: {
    show: true,
    placement: { type: 'select' as const, options: ['eyebrow', 'below meta', 'above title', 'top right', 'bottom'], default: 'eyebrow' },
    /** Logo height (px); each logo keeps its own proportions. */
    height: [28, 12, 72, 1] as Tuple,
    gap: [40, 8, 120, 1] as Tuple,
    /** Space between the row and the text (px). */
    offset: [24, 0, 160, 1] as Tuple,
    x: [0, -400, 400, 1] as Tuple,
    y: [0, -300, 300, 1] as Tuple,
    opacity: [0.85, 0.2, 1, 0.05] as Tuple,
    /** Harvard's shield reads smaller; scale it against the others. */
    harvardScale: [1, 0.5, 2, 0.05] as Tuple,
    _collapsed: true,
  },
  overview: sectionDials({
    eyebrow: 'Overview',
    title: 'A journal that notices before you do.',
    body: 'Unwind pairs an Apple Watch that senses when your body shifts for no physical reason with a 30-second voice reflection. Over time it learns what stress looks like for you, and turns each moment into a plan for next time.',
    figure: 'vision',
    layout: 'right',
  }),
  /** Problem, Opportunity and Solution side by side in one snap view (rendered as `story`). */
  story: {
    problemTitle: { type: 'text' as const, default: 'Insight alone doesn’t change what happens next.' },
    problemBody: { type: 'text' as const, default: 'People can name their trigger. Journals capture the moment after it has already passed.' },
    opportunityTitle: { type: 'text' as const, default: 'Catch the moment while it’s happening.' },
    opportunityBody: { type: 'text' as const, default: 'A wearable can notice physiological arousal in real time, and ask.' },
    solutionTitle: { type: 'text' as const, default: 'Reflect, then rehearse next time.' },
    solutionBody: { type: 'text' as const, default: 'A short voice reflection becomes a counterfactual and an if-then plan.' },
    _collapsed: true,
  },
  system: sectionDials({
    eyebrow: 'System',
    title: 'Watch, phone and AI, with therapists shaping the model.',
    figure: 'system',
    layout: 'below',
    gap: 24,
  }),
  notification: sectionDials({
    eyebrow: 'The notification',
    title: 'A gentle tap, only when something changes.',
    figure: 'notification',
    layout: 'below',
    size: 78,
    gap: 16,
  }),
  howItWorks: sectionDials({
    eyebrow: 'How it works',
    title: 'Your body notices first. You name what it was.',
    figure: 'flow',
    layout: 'below',
    gap: 40,
  }),
  /** Pinned, scroll-driven wrist sequence (WristSequence); keyed `moment` so the page renders it specially. */
  moment: {
    eyebrow: { type: 'text' as const, default: 'The moment' },
    captionDetect: { type: 'text' as const, default: 'Heart rate up. HRV down. Not moving.' },
    captionNotify: { type: 'text' as const, default: 'Something changed. How are you feeling?' },
    captionFocus: { type: 'text' as const, default: 'One tap starts a 30-second voice reflection.' },
    /** Scroll length of the pinned sequence (svh). */
    height: [360, 200, 500, 10] as Tuple,
    /** Push-in over the whole sequence (0.04 = 1.00 → 1.04). */
    zoom: [0.04, 0, 0.12, 0.005] as Tuple,
    drift: [12, 0, 60, 1] as Tuple,
    /** Outline the watch display the live UI will sit on. */
    showScreen: false,
    _collapsed: true,
  },
  /** Three phones side by side (rendered as `flows`). */
  flows: {
    eyebrow: { type: 'text' as const, default: 'Core flows' },
    title: { type: 'text' as const, default: 'Notice. Reflect. Look back.' },
    notificationLabel: { type: 'text' as const, default: 'A gentle nudge' },
    voiceLabel: { type: 'text' as const, default: 'Say what happened' },
    entriesLabel: { type: 'text' as const, default: 'Your entries' },
    /** Vertical offset between neighbouring phones (px). */
    stagger: [56, 0, 160, 1] as Tuple,
    /** How far each phone slides with scroll (px). */
    parallax: [70, 0, 200, 1] as Tuple,
    _collapsed: true,
  },
  /** Guided WOOP and Gross models side by side (rendered as `guided`). */
  guided: {
    eyebrow: { type: 'text' as const, default: 'Guided reflection' },
    title: { type: 'text' as const, default: 'Evidence-based models, spoken out loud.' },
    body: { type: 'text' as const, default: 'Pick a framework and answer one question at a time.' },
    woopLabel: { type: 'text' as const, default: 'WOOP · plan for next time' },
    modelsLabel: { type: 'text' as const, default: 'Gross model · unpack what happened' },
    _collapsed: true,
  },
  dynamic: sectionDials({
    eyebrow: 'Dynamic mode',
    title: 'It asks the right question at the right moment.',
    body: 'As you talk, Unwind offers a follow-up at natural pauses. Tap to answer, or keep going.',
    video: 'dynamic',
    layout: 'right',
  }),
  context: sectionDials({
    eyebrow: 'Context',
    title: 'It learns what stress looks like for you.',
    body: 'It doesn’t guess emotions. It learns your baseline, flags unusual arousal, and lets you name what it was.\n\nheart rate · HRV · motion\nrespiratory rate · sleep · time of day\nyour voice, only when you choose to reflect',
    figure: 'signals',
    layout: 'left',
  }),
  tracking: sectionDials({
    eyebrow: 'Tracking change',
    title: 'Tracking Behavioral Change',
    body: 'A daily calendar tracks shifts, obstacles and habit formation over time.\n\nWeekly, user-driven goals turn into “if-then” plans.',
    video: 'entries',
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
