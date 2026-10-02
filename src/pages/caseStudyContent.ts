/**
 * Case-study copy and media dials. Every section is one full-screen snap stop:
 * an eyebrow (also its sidebar label), a title, a short body, and an optional
 * prototype video placed relative to the text. All copy is editable on the page
 * in dev and autosaves to tuning.json, like the About story.
 */
import { PERSONA_DIALS } from './casePersona'

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

/**
 * Copy for the 8-part recruiter structure (order panel › structure). Each section answers one
 * recruiter question. Overrides the section copy only while that structure is active.
 */
const copy = (fields: Record<string, string>) => ({
  ...Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, { type: 'text' as const, default: v }])),
  _collapsed: true,
})
export const RECRUITER_COPY = {
  /** 01 · Why should this product exist now? */
  story: copy({
    problemTitle: 'Support usually comes too late.',
    problemBody:
      'Stress, rumination and difficult conversations happen in real time. Most wellness tools are pull-based: you have to notice you need help, remember the app, open it and start. By then the intensity and the context have often faded.',
    opportunityTitle: 'Three technologies just converged.',
    opportunityBody:
      'Wearables learn your baseline and surface unusual changes in heart rate, HRV, breathing and movement. Voice captures the story, plus its pace, pauses and intensity. Realtime AI connects the signal, the situation and what you say.',
    solutionLabel: 'Why now',
    solutionTitle: 'Wellness support can become situational.',
    solutionBody: 'Not just something we remember to seek out later.',
  }),
  /** 02 · So what did you actually build? */
  overview: copy({
    eyebrow: 'Product overview',
    title: 'A journal that notices before you do.',
    body: 'Unwind pairs Apple Watch sensing with voice reflection to surface moments worth checking in on. It combines body signals, situational context and what you say to turn a stressful moment into understanding, and a plan for next time.',
  }),
  /** 03 · Who is this actually for? */
  persona: {
    ...copy({
      eyebrow: 'Who it’s for',
      title: 'For people who get stuck in their head.',
      body: 'The high-functioning overthinker. Independent, capable people who live with recurring stress or rumination, and need somewhere to process what happened when nobody is around to talk.',
    }),
    preset: { type: 'select' as const, options: ['scenario', 'reading', 'portrait first', 'compact', 'poster', 'custom'], default: 'scenario' },
    driven: copy({
      title: 'Behaviors',
      d1: 'Performs well, but internalizes stress',
      d2: 'Replays conversations afterward, and processes alone',
      d3: 'Uses wellness tools, but rarely journals in the moment',
    }),
    challenges: copy({
      title: 'Needs',
      c1: 'Low friction: no blank page, no need to name the feeling first',
      c2: 'Private and nonjudgmental',
      c3: 'Available right when it happens',
    }),
    moments: copy({
      eyebrow: 'One moment · 2:05 PM',
      title: 'A difficult meeting ends.',
      body: 'Maya walks back to her desk replaying something her manager said. Her body is still activated, but she has another meeting in 20 minutes and wouldn’t normally open a journaling app.',
    }),
  },
  /** 04 · What does the user actually do? */
  howItWorks: copy({
    eyebrow: 'Core experience',
    title: 'Notice. Talk it out. Prepare.',
    body: 'The Watch surfaces a moment worth checking in on. The phone gives you somewhere to say what happened. AI turns it into something useful for next time: the pattern, a counterfactual and an if–then plan. It learns your patterns over time.',
  }),
  /** 05 · How did this idea become a usable product? */
  moment: copy({ eyebrow: 'Product UI' }),
  notification: copy({ eyebrow: 'Get me at the right moment', title: 'Useful without feeling invasive.' }),
  dynamic: copy({
    eyebrow: 'Help me get it out',
    title: 'Less distance between feeling something and saying it.',
    body: 'Voice first, no blank page. As you talk, Unwind offers a follow-up at natural pauses. Tap to answer, or keep going.',
  }),
  flows: copy({ eyebrow: 'Product UI · core flows' }),
  guided: copy({ eyebrow: 'Product UI · guided' }),
  tracking: copy({
    eyebrow: 'Help me make sense of it',
    title: 'The conversation should leave you with something.',
    body: 'Entries become patterns, if–then plans and a timeline you can look back on.\n\nV1: a long AI conversation, people disengaged. V2: a short voice reflection, less friction. V3: an actionable plan, a clearer outcome.',
  }),
  /** 06 · How do you stop this from becoming an annoying stress alarm? */
  context: copy({
    eyebrow: 'Intelligent timing',
    title: 'Not every spike deserves a nudge.',
    body: 'A raised heart rate could be stress, exercise, caffeine or excitement. So a body signal only creates a candidate moment.\n\nbody: heart rate · HRV · breathing · movement\nsituation: calendar · recent activity · time\nbaseline: what is normal for you\n\nThen receptivity decides: nudge, wait or ignore. If Maya is mid-presentation, the right move is to wait until it ends.',
  }),
  /** 07 · How does this actually work, and can I trust it? */
  system: copy({
    eyebrow: 'Under the hood',
    title: 'Signal. Situation. Story.',
    body: 'The Watch reads what changed physically. The phone adds what was happening around it. Your voice says what it meant. AI connects the three without claiming to diagnose emotion: you give the meaning. Calendar and email are optional, and the mic is on only when you choose to reflect.',
  }),
  /** 08 · Did any of this actually work? */
  outcomes: copy({
    eyebrow: 'Validation',
    title: 'People didn’t just reflect more. They made more plans to act.',
    body: '15-day in-the-wild study, n = 20. Weekly action plans rose from 3.33 to 6.53, about one more enacted plan per 5-day cycle, and 11 participants asked to keep using it.\n\nThe study validated the reflection → action loop. The wearable-triggered nudge is the next hypothesis, not something the study proved.',
  }),
  _collapsed: true,
}

export const UNWIND_CONFIG = {
  page: pageDials,
  hero: heroDials({
    eyebrow: 'Unwind · RE:SELF · 2025',
    title: 'Unwind – Novel Multimodal AI Reflection System for Behavioral Change',
    video: 'dynamic',
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
    phoneHeight: [56, 30, 90, 1] as Tuple,
    /** Extra scale on the hero phone (1 = as sized). */
    phoneScale: [1, 0.5, 1.6, 0.01] as Tuple,
    /** Moves the hero phone up (−) or down (+), px. */
    phoneY: [0, -300, 300, 1] as Tuple,
    /** Under the title: the phone alone, or the Apple Watch (left) beside the phone (right). */
    devices: { type: 'select' as const, options: ['watch + phone', 'phone'], default: 'watch + phone' },
    /** Watch height as a share of the phone's height. */
    watchSize: [0.64, 0.4, 1.4, 0.01] as Tuple,
    /** Space between the watch and the phone (px). */
    devicesGap: [56, -80, 240, 1] as Tuple,
    /** Top of the watch + phone pair, % of the screen height; they run past the fold. */
    devicesTop: [56, 20, 90, 0.5] as Tuple,
    /** Drops the watch below the phone's top edge, % of the screen height. */
    watchY: [9, -30, 40, 0.5] as Tuple,
    /** Moves each hero element up (−) or down (+), px, without changing the layout around it. */
    y: {
      braid: [0, -200, 200, 1] as Tuple,
      title: [0, -200, 200, 1] as Tuple,
      meta: [0, -200, 200, 1] as Tuple,
      logos: [0, -200, 200, 1] as Tuple,
    },
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
    problemLabel: { type: 'text' as const, default: 'Problem' },
    opportunityLabel: { type: 'text' as const, default: 'Opportunity' },
    solutionLabel: { type: 'text' as const, default: 'Solution' },
    problemTitle: { type: 'text' as const, default: 'Insight alone doesn’t change what happens next.' },
    problemBody: { type: 'text' as const, default: 'People can name their trigger. Journals capture the moment after it has already passed.' },
    opportunityTitle: { type: 'text' as const, default: 'Catch the moment while it’s happening.' },
    opportunityBody: { type: 'text' as const, default: 'A wearable can notice physiological arousal in real time, and ask.' },
    solutionTitle: { type: 'text' as const, default: 'Reflect, then rehearse next time.' },
    solutionBody: { type: 'text' as const, default: 'A short voice reflection becomes a counterfactual and an if-then plan.' },
    /** Look presets set layout + art + motion together; 'custom' uses the dials below. */
    preset: { type: 'select' as const, options: ['calm cards', 'editorial', 'converge', 'outline', 'minimal', 'columns', 'custom'], default: 'calm cards' },
    layout: { type: 'select' as const, options: ['art left', 'art right', 'alternate', 'columns'], default: 'art left' },
    art: { type: 'select' as const, options: ['card', 'line', 'outline', 'none'], default: 'card' },
    /** three: a tile per technology · converge: all three flow into the moment · single: one row of icons */
    opportunityArt: { type: 'select' as const, options: ['three', 'converge', 'single'], default: 'three' },
    /** Only the blue marks move. */
    motion: { type: 'select' as const, options: ['draw', 'pulse', 'off'], default: 'draw' },
    artWidth: [300, 160, 480, 5] as Tuple,
    rowGap: [44, 8, 140, 1] as Tuple,
    titleScale: [0.62, 0.3, 0.9, 0.01] as Tuple,
    textWidth: [460, 280, 720, 10] as Tuple,
    _collapsed: true,
  },
  /** Persona sheet, reorganised to read top to bottom (rendered as `persona`). */
  persona: PERSONA_DIALS,
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
  /** Copy for the 8-part recruiter structure (order panel › structure). */
  recruiter: RECRUITER_COPY,
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
