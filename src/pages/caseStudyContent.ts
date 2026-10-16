/**
 * Case-study copy and media dials. Every section is one full-screen snap stop:
 * an eyebrow (also its sidebar label), a title, a short body, and an optional
 * prototype video placed relative to the text. All copy is editable on the page
 * in dev and autosaves to tuning.json, like the About story.
 */
import { FLOAT_DIALS, PERSONA_DIALS } from './casePersona'
import { PEAK_ICONS, STORY_ART_TEXT, STORY_TIMING, type StoryArtText } from './storyArt'

type Tuple = [number, number, number, number]

/** Prototype recordings in public/work/momo/proto: the phone only, cropped to its frame (1080 px tall H.264 + first-frame poster). */
export const PROTO_VIDEOS = {
  'welcome-park': { w: 522, h: 1080, dir: 'proto' },
  'freeform-evening': { w: 522, h: 1080, dir: 'proto' },
  'guided-woop-pick': { w: 460, h: 810, dir: 'flows' },
  'guided-woop': { w: 530, h: 1080, dir: 'flows' },
  voice: { w: 530, h: 1080, dir: 'flows' },
  dynamic: { w: 530, h: 1080, dir: 'flows' },
  entries: { w: 530, h: 1080, dir: 'flows' },
} as const
export type ProtoVideo = keyof typeof PROTO_VIDEOS
const VIDEO_OPTIONS = ['none', ...Object.keys(PROTO_VIDEOS)]

/** Media direction. `center` and `rise` remain available for project heroes. */
const LAYOUTS = ['bottom', 'top', 'right', 'left', 'center', 'rise']

type SectionDefaults = {
  eyebrow: string
  title: string
  body?: string
  align?: 'left' | 'center'
  video?: ProtoVideo | 'none'
  /** Visual shown instead of a video; project-specific figures remain opt-in. */
  figure?: 'none' | 'flow' | 'system' | 'notification' | 'vision' | 'signals' | 'paper' | 'research' | 'next'
  layout?: 'bottom' | 'top' | 'right' | 'left' | 'center' | 'rise'
  size?: number
  gap?: number
}
export type SectionSpacing = { top: number; bottom: number; contentGap: number }

export type TextReveal = {
  preset: 'cascade' | 'rise together' | 'from sides' | 'focus' | 'wipe' | 'fade' | 'still'
  duration: number
  stagger: number
}

const textRevealDials = (preset: TextReveal['preset'] = 'cascade') => ({
  preset: { type: 'select' as const, options: ['cascade', 'rise together', 'from sides', 'focus', 'wipe', 'fade', 'still'], default: preset },
  duration: [0.7, 0.25, 1.8, 0.05] as Tuple,
  stagger: [0.1, 0, 0.5, 0.02] as Tuple,
  _collapsed: true,
})
/** Shared section rhythm: viewport edges plus the gap from copy to the main visual. */
const sectionSpacingDials = (top = 96, bottom = 64, contentGap = 72) => ({
  top: [top, 0, 240, 1] as Tuple,
  bottom: [bottom, 0, 240, 1] as Tuple,
  contentGap: [contentGap, 0, 600, 1] as Tuple,
  _collapsed: true,
})

export function sectionDials(d: SectionDefaults, videos: string[] = VIDEO_OPTIONS) {
  return {
    eyebrow: { type: 'text' as const, default: d.eyebrow },
    title: { type: 'text' as const, default: d.title },
    body: { type: 'text' as const, default: d.body ?? '', placeholder: 'Blank lines = paragraph breaks' },
    align: { type: 'select' as const, options: ['left', 'center'], default: d.align ?? 'left' },
    spacing: sectionSpacingDials(96, 64, d.gap ?? 72),
    media: {
      video: { type: 'select' as const, options: videos, default: d.video ?? 'none' },
      figure: { type: 'select' as const, options: ['none', 'flow', 'system', 'vision', 'signals', 'notification', 'paper', 'research', 'next'], default: d.figure ?? 'none' },
      layout: { type: 'select' as const, options: LAYOUTS, default: d.layout ?? 'bottom' },
      /** Video height, % of the screen height. */
      size: [d.size ?? 72, 20, 95, 1] as Tuple,
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
  /** Section list in the sidebar (Problem · Solution, Persona, …). Off: only Back shows. */
  showSections: false,
  textSize: { type: 'select' as const, options: ['compact', 'balanced', 'display'], default: 'compact' },
  /** How each case-study section enters and re-enters the viewport. */
  sectionReveal: {
    type: 'select' as const,
    options: ['float up', 'drift in', 'float from sides', 'soft bloom', 'still'],
    default: 'float up',
  },
  /** Widest the content column gets (px). */
  contentWidth: [1040, 600, 1400, 10] as Tuple,
  /** Text column width when the video sits beside it (px). */
  textWidth: [520, 280, 760, 10] as Tuple,
  _collapsed: false,
}

type HeroMeta = { role: string; timeline: string; team: string; extra?: string; extraLabel?: string }
const heroDials = (d: SectionDefaults & HeroMeta, videos?: string[]) => ({
  ...sectionDials(d, videos),
  spacing: sectionSpacingDials(118, 0, d.gap ?? 44),
  /** Meta row under the title: role · timeline · extra · team. Eyebrows are editable; an empty extra hides its column. */
  roleLabel: { type: 'text' as const, default: 'Role' },
  role: { type: 'text' as const, default: d.role },
  timelineLabel: { type: 'text' as const, default: 'Timeline' },
  timeline: { type: 'text' as const, default: d.timeline },
  extraLabel: { type: 'text' as const, default: d.extraLabel ?? '' },
  extra: { type: 'text' as const, default: d.extra ?? '' },
  teamLabel: { type: 'text' as const, default: 'Team' },
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
    body: 'Momo pairs Apple Watch sensing with voice reflection to surface moments worth checking in on. It combines body signals, situational context and what you say to turn a stressful moment into understanding, and a plan for next time.',
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
    eyebrow: 'Connected insights',
    title: 'Your body signals. Your story. A clearer picture.',
    body: 'The Watch captures shifts in your body. Voice reflections add what those moments meant. Together, they reveal mood, stress and emotional patterns across days, weeks and months.',
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

export const MOMO_CONFIG = {
  page: pageDials,
  hero: heroDials({
    eyebrow: 'Momo · RE:SELF · 2025',
    title: 'Momo – Novel Multimodal AI Reflection System for Behavioral Change',
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
    /** Moves each hero element up (−) or down (+), px, without changing the layout around it. */
    y: {
      braid: [0, -200, 200, 1] as Tuple,
      title: [0, -200, 200, 1] as Tuple,
      meta: [0, -200, 200, 1] as Tuple,
      logos: [0, -200, 200, 1] as Tuple,
      phone: [0, -400, 400, 1] as Tuple,
      _collapsed: false,
    },
    _collapsed: false,
  },
  /** Partner logos in the hero (public/work/momo/logos). Rendered by the hero, not as a section. */
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
    hoverColor: { type: 'color' as const, default: '#53bffe' },
    hoverOpacity: [0.85, 0, 1, 0.05] as Tuple,
    /** Harvard's shield reads smaller; scale it against the others. */
    harvardScale: [1, 0.5, 2, 0.05] as Tuple,
    _collapsed: false,
  },
  overview: sectionDials({
    eyebrow: 'Overview',
    title: 'A journal that notices before you do.',
    body: 'Momo pairs an Apple Watch that senses when your body shifts for no physical reason with a 30-second voice reflection. Over time it learns what stress looks like for you, and turns each moment into a plan for next time.',
    figure: 'vision',
    layout: 'bottom',
  }),
  /** Problem, Opportunity and Solution; each row supports art above, below, left or right. */
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
    /** Look presets set art and motion; Layout stays independently adjustable. */
    preset: { type: 'select' as const, options: ['calm cards', 'editorial', 'converge', 'outline', 'minimal', 'columns', 'custom'], default: 'calm cards' },
    layout: { type: 'select' as const, options: ['bottom', 'top', 'right', 'left'], default: 'top' },
    /** left: art and text share a left edge · center: centred · stretch: art spans the text width, edges aligned both sides. */
    align: { type: 'select' as const, options: ['left', 'center', 'stretch'], default: 'left' },
    /** Align only the number, label, title and body; the art keeps the `align` layout above. */
    textAlign: { type: 'select' as const, options: ['left', 'center'], default: 'left' },
    /** glass: the system card's fill + gradient with the glass dials below (story → glass). */
    art: { type: 'select' as const, options: ['glass', 'card', 'line', 'outline', 'none'], default: 'glass' },
    /** Icon on the Problem curve's peak: the custom bolt, a Lucide icon, or none. */
    peakIcon: { type: 'select' as const, options: Object.keys(PEAK_ICONS), default: 'bolt' },
    /**
     * Glass for the three art cards. Colours come from the system card (Momo system sequence →
     * card fill / gradient); these dials start from the system card's glass, scaled to the cards'
     * size (≈⅓ of the system card): blur, radius and glow blur shrink, the 1px rim stays crisp.
     */
    glass: {
      tint: [1, 0.05, 1, 0.01] as Tuple,
      blur: [5, 0, 40, 0.5] as Tuple,
      saturate: [1.7, 1, 3, 0.05] as Tuple,
      /** White rim: opacity, width and top highlight (px). */
      edge: [1, 0, 1, 0.01] as Tuple,
      edgeWidth: [1, 0, 4, 0.25] as Tuple,
      highlight: [1.5, 0, 6, 0.25] as Tuple,
      sheen: [1, 0, 1, 0.01] as Tuple,
      sheenAngle: [232, 0, 360, 1] as Tuple,
      glow: [0.21, 0, 1, 0.01] as Tuple,
      glowBlur: [16, 0, 80, 1] as Tuple,
      radius: [12, 0, 48, 1] as Tuple,
      padding: [18, 0, 48, 1] as Tuple,
      _collapsed: false,
    },
    /** three: a tile per technology · converge: all three flow into the moment · single: one row of icons */
    opportunityArt: { type: 'select' as const, options: ['three', 'converge', 'single'], default: 'three' },
    motion: { type: 'select' as const, options: ['draw', 'pulse', 'off'], default: 'draw' },
    /** Entrance animation replayed whenever the story re-enters the viewport. */
    reveal: {
      type: 'select' as const,
      options: ['soft rise', 'cascade', 'from sides', 'scale in', 'still'],
      default: 'soft rise',
    },
    artWidth: [300, 160, 480, 5] as Tuple,
    /** Playback speed of each row's art and text animation (1 = as designed, 2 = twice as fast). */
    speed: {
      problem: [1, 0.25, 10, 0.05] as Tuple,
      opportunity: [1, 0.25, 10, 0.05] as Tuple,
      solution: [1, 0.25, 10, 0.05] as Tuple,
      _collapsed: false,
    },
    /** Seconds per step of each diagram at speed 1; steps run in order, so a longer step pushes the
     * rest back. Row speed above still scales them all. */
    timing: Object.fromEntries(Object.entries(STORY_TIMING).map(([row, steps]) => [row, {
      ...Object.fromEntries(Object.entries(steps).map(([k, v]) => [k, [v, 0.05, 8, 0.01] as Tuple])),
      _collapsed: true,
    }])) as { [Row in keyof typeof STORY_TIMING]: Record<keyof (typeof STORY_TIMING)[Row], Tuple> & { _collapsed: boolean } },
    spacing: sectionSpacingDials(96, 96, 44),
    titleScale: [0.62, 0.3, 0.9, 0.01] as Tuple,
    textWidth: [460, 280, 720, 10] as Tuple,
    /** Captions inside the art cards; clear a field to remove that caption. */
    artText: {
      ...Object.fromEntries(Object.entries(STORY_ART_TEXT).map(([k, v]) => [k, { type: 'text' as const, default: v }])) as Record<keyof StoryArtText, { type: 'text'; default: string }>,
      _collapsed: false,
    },
    _collapsed: true,
  },
  /** Persona sheet, reorganised to read top to bottom (rendered as `persona`); key contexts float around the portrait. */
  persona: { ...PERSONA_DIALS, spacing: sectionSpacingDials(110, 110, 32), float: FLOAT_DIALS },
  system: sectionDials({
    eyebrow: 'System design',
    title: 'Watch, phone and Momo, with clinical experts shaping the model.',
    body: 'The watch notices physiological changes; the phone holds voice reflections and journal context. Momo turns both into timely nudges and personal insights, on an evidence-based framework from clinical experts.',
    figure: 'system',
    layout: 'bottom',
    gap: 24,
  }),
  notification: sectionDials({
    eyebrow: 'The notification',
    title: 'A gentle tap, only when something changes.',
    figure: 'notification',
    layout: 'bottom',
    size: 78,
    gap: 16,
  }),
  howItWorks: sectionDials({
    eyebrow: 'How it works',
    title: 'Your body notices first. You name what it was.',
    figure: 'flow',
    layout: 'bottom',
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
    body: { type: 'text' as const, default: 'Your reflections become a record of your experiences and a way to turn insight into action.' },
    align: { type: 'select' as const, options: ['left', 'center'], default: 'center' },
    phoneScale: [1, 0.6, 1.25, 0.01] as Tuple,
    entriesLabel: { type: 'text' as const, default: 'Your entries' },
    voiceLabel: { type: 'text' as const, default: 'Say what happened' },
    trackerLabel: { type: 'text' as const, default: 'Keep yourself on track' },
    spacing: sectionSpacingDials(82, 42, 110),
    textReveal: textRevealDials(),
    _collapsed: true,
  },
  /** Guided WOOP and Gross models side by side (rendered as `guided`). */
  guided: {
    eyebrow: { type: 'text' as const, default: 'Guided reflection' },
    title: { type: 'text' as const, default: 'Evidence-based models, spoken out loud.' },
    body: { type: 'text' as const, default: 'Pick a framework and answer one question at a time.' },
    align: { type: 'select' as const, options: ['left', 'center'], default: 'center' },
    /** Entrance for the header copy and both videos: `rise` keeps the copy still and slides the videos up. */
    reveal: { type: 'select' as const, options: ['rise', 'cascade', 'focus', 'from sides', 'wipe', 'still'], default: 'rise' },
    woopLabel: { type: 'text' as const, default: 'WOOP · plan for next time' },
    modelsLabel: { type: 'text' as const, default: 'Gross model · unpack what happened' },
    spacing: sectionSpacingDials(96, 64, 72),
    textReveal: textRevealDials('focus'),
    _collapsed: true,
  },
  /** Keep the section key to preserve its saved position; the device demo replaces Dynamic Mode. */
  dynamic: {
    eyebrow: { type: 'text' as const, default: 'Connected insights' },
    title: { type: 'text' as const, default: 'Your body signals. Your story. A clearer picture.' },
    body: { type: 'text' as const, default: 'The Watch captures shifts in your body. Voice reflections add what those moments meant. Together, they reveal mood, stress and emotional patterns across days, weeks and months.' },
    align: { type: 'select' as const, options: ['left', 'center'], default: 'left' },
    watch: {
      strapColor: { type: 'color' as const, default: '#d6ccc4' },
      _collapsed: true,
    },
    spacing: sectionSpacingDials(110, 72, 36),
    deviceEntrance: {
      preset: { type: 'select' as const, options: ['handoff', 'rise together', 'split sides', 'scale in', 'focus', 'still'], default: 'handoff' },
      duration: [0.8, 0.25, 1.8, 0.05] as Tuple,
      stagger: [0.18, 0, 0.6, 0.02] as Tuple,
      _collapsed: true,
    },
    textReveal: textRevealDials(),
    _collapsed: true,
  },
  context: sectionDials({
    eyebrow: 'Context',
    title: 'It learns what stress looks like for you.',
    body: 'It doesn’t guess emotions. It learns your baseline, flags unusual arousal, and lets you name what it was.\n\nheart rate · HRV · motion\nrespiratory rate · sleep · time of day\nyour voice, only when you choose to reflect',
    figure: 'signals',
    layout: 'bottom',
  }),
  tracking: sectionDials({
    eyebrow: 'Tracking change',
    title: 'Tracking Behavioral Change',
    body: 'A daily calendar tracks shifts, obstacles and habit formation over time.\n\nWeekly, user-driven goals turn into “if-then” plans.',
    video: 'entries',
  }),
  outcomes: {
    ...sectionDials({
      eyebrow: 'Outcomes',
      title: 'Coping flexibility improved significantly across a 15-day pilot with 20 participants.',
      body: 'Guided reflection produced nearly twice as many action plans, and participants put more of them into practice in daily life.',
      layout: 'bottom',
      figure: 'paper',
      gap: 48,
    }),
    textReveal: textRevealDials(),
  },
  /** Copy for the 8-part recruiter structure (order panel › structure). */
  recruiter: RECRUITER_COPY,
}

const txt = (d: string) => ({ type: 'text' as const, default: d })
/** Filo's film groups own their media; do not offer Momo recordings in these panels. */
const NO_VIDEO = ['none']

/**
 * Filo: the 2024 EcoFabriq marketplace reframed, after 11 interviews, as a sample-room agent.
 * Five film showcases (including the hero) carry the studio flows; research and the product story stay distinct.
 * Copy source: textura-exchange/CASE-STUDY-SPINE.md and the interview notes.
 */
export const FILO_CONFIG = {
  page: pageDials,
  hero: heroDials({
    eyebrow: '',
    title: 'An Agentic Sample Room for Biomaterial Adoption in Fashion',
    layout: 'rise',
    size: 78,
    gap: 44,
    role: 'Product Designer & Researcher',
    timeline: 'Hackathon 2024 · Redesign 2026',
    extraLabel: 'Platform',
    extra: 'iOS app',
    team: '1 engineer, 2 fashion designers, 1 product designer',
  }, NO_VIDEO),
  heroSpacing: MOMO_CONFIG.heroSpacing,
  /** Partner logos in the hero (public/work/filo/logos). */
  logos: { ...MOMO_CONFIG.logos, hoverColor: { type: 'color' as const, default: '#6f8f69' } },
  /** Physical sample → connected evidence → product in action. */
  story: {
    problemLabel: txt('Market gap'),
    opportunityLabel: txt('Opportunity'),
    solutionLabel: txt('Solution'),
    problemTitle: txt('Tagged swatches can open data.\nThey still don’t move the work forward.'),
    problemBody: txt('Material data, test evidence and supplier decisions still split across physical samples, inboxes, spreadsheets and PLMs. A tag can identify the material—but the work around it remains fragmented.'),
    opportunityTitle: txt('Turn the swatch into an active material record.'),
    opportunityBody: txt('One tap can connect the material in your hand to its evidence, constraints and next actions.'),
    solutionTitle: txt('Meet Filo'),
    solutionBody: txt('A sample-room agent that turns each material into a living Technical File—and moves it from first swatch to production.'),
    animationPreset: { type: 'select' as const, options: ['quiet dissolve', 'material drift', 'exploded assembly'], default: 'material drift' },
    loopSeconds: [18, 10, 30, 1] as Tuple,
    playbackSpeed: [1, 0.5, 2, 0.1] as Tuple,
    toteSpin: [1, 0.1, 3, 0.05] as Tuple,
    parkaSpin: [1, 0.1, 3, 0.05] as Tuple,
    blouseSpin: [1, 0.1, 3, 0.05] as Tuple,
    windbreakerSpin: [1, 0.1, 3, 0.05] as Tuple,
    spacing: sectionSpacingDials(90, 70, 100),
    textWidth: [590, 280, 720, 10] as Tuple,
    _collapsed: true,
  },
  research: {
    ...sectionDials({
      eyebrow: 'Research',
      title: 'Eleven interviews changed the question.',
      body: 'We mapped the market, competitors and regulation. Then primary research showed that discovery was not the bottleneck: technical designers needed evidence that a material could survive development and scale.',
      align: 'center',
      layout: 'bottom',
      figure: 'research',
      gap: 36,
    }, NO_VIDEO),
    spacing: sectionSpacingDials(88, 64, 36),
    textReveal: textRevealDials('fade'),
    primaryVisual: { type: 'select' as const, options: ['image', 'video'], default: 'image' },
    miroVideo: {
      speed: [1, 0.25, 4, 0.05] as Tuple,
      scale: [1, 0.6, 1.4, 0.01] as Tuple,
      cropRight: [0, 0, 45, 0.01] as Tuple,
      cropTop: [0, 0, 45, 0.01] as Tuple,
      radius: [18, 0, 60, 1] as Tuple,
    },
    interviewVideo: {
      speed: [1, 0.25, 4, 0.05] as Tuple,
      scale: [1, 0.6, 1.4, 0.01] as Tuple,
      radius: [18, 0, 60, 1] as Tuple,
    },
  },
  /** Persona with the technical designer's desk loop; interview quotes float around it. */
  persona: {
    ...PERSONA_DIALS,
    eyebrow: txt('User persona'),
    title: txt('The technical designer handed an unfamiliar material.'),
    body: txt('She turns a design and material choice into something a factory can reliably make.\nWith an unfamiliar material, every new constraint has to be understood before production.'),
    tags: txt('Brand of 10–200 people, 2–4 collections a year, Lives in PLM and Excel, Fittings all afternoon, Emails Asia at 7 AM, Carries the technical risk if it fails'),
    align: { type: 'select' as const, options: ['left', 'center'], default: 'center' },
    image: { type: 'select' as const, options: ['bottom', 'top', 'none'], default: 'bottom' },
    blockGap: [100, 32, 200, 1] as Tuple,
    moments: {
      ...PERSONA_DIALS.moments,
      // Interviewees from textura-exchange/CASE-STUDY-SPINE.md, kept anonymous: common role + company, one line.
      // m2's label is invented (her real label isn't on record); m4 is a mentor's question — David to confirm.
      m1Quote: txt('“How does it sew? What happens when we fuse, press or wash it?”'),
      m1Role: txt('Technical designer, BlueSTEM'),
      m1Tag: txt('Know before you cut'),
      m2Quote: txt('“We can’t use heat or solvent on this.”'),
      m2Role: txt('Designer, Stella McCartney'),
      m2Tag: txt('Catch it at the bench'),
      m3Quote: txt('“First we look at performance, then at how to do it in the most responsible way.”'),
      m3Role: txt('Product lead, O’Neill'),
      m3Tag: txt('Performance first'),
      m4Quote: txt('“Can this construction still work at 10,000 units?”'),
      m4Role: txt('Merchandiser, Calvin Klein'),
      m4Tag: txt('Answer the line review'),
    },
    spacing: sectionSpacingDials(110, 0, 32),
    float: {
      ...FLOAT_DIALS,
      preset: { type: 'select' as const, options: ['one at a time', 'two at a time', 'pop', 'drift', 'still'], default: 'drift' },
      content: { ...FLOAT_DIALS.content, default: 'quote + role' },
      pace: [4.9, 1.5, 8, 0.1] as Tuple,
      cardWidth: [330, 160, 360, 5] as Tuple,
      spread: [169, -40, 200, 1] as Tuple,
      bob: [20, 0, 20, 1] as Tuple,
      eyebrowGap: [17, 0, 80, 1] as Tuple,
      bodyGap: [22, 0, 120, 1] as Tuple,
      tagsGap: [40, 0, 100, 1] as Tuple,
    },
  },
  source: sectionDials({
    eyebrow: 'Source → approve',
    title: 'The work is prepared.\nThe decision stays yours.',
    body: 'Compare suppliers, approve samples, and review what changes.',
    align: 'center', layout: 'bottom', gap: 64,
  }, NO_VIDEO),
  evidence: sectionDials({
    eyebrow: 'Observe → resolve',
    title: 'Evidence belongs\nwhere the work happens.',
    body: 'Capture the test. Surface the conflict. Keep what is still unknown in view.',
    align: 'center', layout: 'bottom', gap: 64,
  }, NO_VIDEO),
  scale: sectionDials({
    eyebrow: 'Scale → decide',
    title: 'The same material.\nA bigger question.',
    body: 'Can we make 10,000? Confirm the capacity, see the gap, then choose the next move.',
    align: 'center', layout: 'bottom', gap: 64,
  }, NO_VIDEO),
  handoff: sectionDials({
    eyebrow: 'Share → reuse',
    title: 'The record moves forward.\nThe context stays with it.',
    body: 'Share the evidence, export a traceable file, and carry the learning into the next collection.',
    align: 'center', layout: 'bottom', gap: 64,
  }, NO_VIDEO),
  outcomes: {
    ...sectionDials({
      eyebrow: 'What’s next',
      title: 'Next, a real sample room.',
      body: 'The prototype answers the mentors’ questions on screen. The next test is whether technical designers and one supplier trust it with a real run.',
      align: 'center',
      layout: 'bottom',
      figure: 'next',
      gap: 48,
    }, NO_VIDEO),
    textReveal: textRevealDials(),
  },
}
