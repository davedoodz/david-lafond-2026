/**
 * Case-study copy and media dials. Every section is one full-screen snap stop:
 * an eyebrow (also its sidebar label), a title, a short body, and an optional
 * prototype video placed relative to the text. All copy is editable on the page
 * in dev and autosaves to tuning.json, like the About story.
 */
import { FLOAT_DIALS, PERSONA_DIALS } from './casePersona'
import { EVIDENCE_DIALS, PRINCIPLES_DIALS, REFRAME_DIALS } from './filoSections'

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
/** Filo has no recordings yet: a labelled block marks where each prototype loop will go. */
const PLACEHOLDER_OPTIONS = ['none', 'placeholder']

/** Media direction. `center` and `rise` remain available for project heroes. */
const LAYOUTS = ['bottom', 'top', 'right', 'left', 'center', 'rise']

type SectionDefaults = {
  eyebrow: string
  title: string
  body?: string
  align?: 'left' | 'center'
  video?: ProtoVideo | 'none' | 'placeholder'
  /** Label inside the placeholder block (Filo, until the prototype loops exist). */
  placeholder?: string
  /** Diagram shown instead of a video ('system': the animated Unwind system walkthrough). */
  figure?: 'none' | 'flow' | 'system' | 'notification' | 'vision' | 'signals'
  layout?: 'bottom' | 'top' | 'right' | 'left' | 'center' | 'rise'
  size?: number
  gap?: number
}

export function sectionDials(d: SectionDefaults, videos: string[] = VIDEO_OPTIONS) {
  return {
    eyebrow: { type: 'text' as const, default: d.eyebrow },
    title: { type: 'text' as const, default: d.title },
    body: { type: 'text' as const, default: d.body ?? '', placeholder: 'Blank lines = paragraph breaks' },
    align: { type: 'select' as const, options: ['left', 'center'], default: d.align ?? 'left' },
    media: {
      video: { type: 'select' as const, options: videos, default: d.video ?? 'none' },
      ...(d.placeholder !== undefined ? { placeholder: { type: 'text' as const, default: d.placeholder } } : {}),
      figure: { type: 'select' as const, options: ['none', 'flow', 'system', 'vision', 'signals', 'notification'], default: d.figure ?? 'none' },
      layout: { type: 'select' as const, options: LAYOUTS, default: d.layout ?? 'bottom' },
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

const heroDials = (d: SectionDefaults & { role: string; timeline: string; team: string }, videos?: string[]) => ({
  ...sectionDials(d, videos),
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
    art: { type: 'select' as const, options: ['card', 'line', 'outline', 'none'], default: 'card' },
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
    rowGap: [44, 8, 140, 1] as Tuple,
    titleScale: [0.62, 0.3, 0.9, 0.01] as Tuple,
    textWidth: [460, 280, 720, 10] as Tuple,
    _collapsed: true,
  },
  /** Persona sheet, reorganised to read top to bottom (rendered as `persona`); key contexts float around the portrait. */
  persona: { ...PERSONA_DIALS, float: FLOAT_DIALS },
  system: sectionDials({
    eyebrow: 'System',
    title: 'Watch, phone and AI, with therapists shaping the model.',
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
    align: { type: 'select' as const, options: ['left', 'center'], default: 'center' },
    notificationLabel: { type: 'text' as const, default: 'A gentle nudge' },
    voiceLabel: { type: 'text' as const, default: 'Say what happened' },
    entriesLabel: { type: 'text' as const, default: 'Your entries' },
    _collapsed: true,
  },
  /** Guided WOOP and Gross models side by side (rendered as `guided`). */
  guided: {
    eyebrow: { type: 'text' as const, default: 'Guided reflection' },
    title: { type: 'text' as const, default: 'Evidence-based models, spoken out loud.' },
    body: { type: 'text' as const, default: 'Pick a framework and answer one question at a time.' },
    align: { type: 'select' as const, options: ['left', 'center'], default: 'center' },
    woopLabel: { type: 'text' as const, default: 'WOOP · plan for next time' },
    modelsLabel: { type: 'text' as const, default: 'Gross model · unpack what happened' },
    _collapsed: true,
  },
  /** Keep the section key to preserve its saved position; the device demo replaces Dynamic Mode. */
  dynamic: {
    eyebrow: { type: 'text' as const, default: 'Connected insights' },
    title: { type: 'text' as const, default: 'Your body signals. Your story. A clearer picture.' },
    body: { type: 'text' as const, default: 'The Watch captures shifts in your body. Voice reflections add what those moments meant. Together, they reveal mood, stress and emotional patterns across days, weeks and months.' },
    align: { type: 'select' as const, options: ['left', 'center'], default: 'left' },
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
  outcomes: sectionDials({
    eyebrow: 'Outcomes',
    title: 'Coping flexibility improved significantly across a 15-day pilot with 20 participants.',
    body: 'Guided reflection produced nearly twice as many action plans, and participants put more of them into practice in daily life.',
    layout: 'bottom',
  }),
  /** Copy for the 8-part recruiter structure (order panel › structure). */
  recruiter: RECRUITER_COPY,
}

const txt = (d: string) => ({ type: 'text' as const, default: d })
/** A Filo section with a placeholder block where its prototype loop will go. */
const filoSection = (d: SectionDefaults) => sectionDials({ layout: 'bottom', gap: 40, size: 52, ...d }, PLACEHOLDER_OPTIONS)
const filoFlow = (eyebrow: string, title: string, body: string, placeholder: string) =>
  filoSection({ eyebrow, title, body, video: 'placeholder', placeholder })

/**
 * Filo (formerly EcoFabriq): the 2024 marketplace reframed, after 11 interviews, as an agent
 * that gets a chosen biomaterial through a brand's development process. Source of the copy:
 * textura-exchange/CASE-STUDY-SPINE.md. Prototype loops don't exist yet; each flow shows a
 * labelled placeholder until its recording is cut.
 */
export const FILO_CONFIG = {
  page: pageDials,
  hero: heroDials(
    {
      eyebrow: 'Filo · MIT × Polimi hackathon → 2026 redesign',
      title: 'Filo – Agentic Commerce for Biomaterial Adoption in Fashion',
      video: 'placeholder',
      placeholder: 'Hero loop · the Filo workspace',
      layout: 'bottom',
      size: 46,
      gap: 48,
      role: 'Product Designer\nUser research',
      timeline: 'Hackathon: late 2024\nInterviews: 2025\nRedesign: 2026',
      team: '1 engineer\n2 fashion designers\n1 product designer',
    },
    PLACEHOLDER_OPTIONS,
  ),
  /** Problem, Opportunity and Solution; each row supports art above, below, left or right. */
  story: {
    problemLabel: txt('Problem'),
    opportunityLabel: txt('Opportunity'),
    solutionLabel: txt('Solution'),
    problemTitle: txt('New materials die between the swatch and the line review.'),
    problemBody: txt(
      'Designers can find biomaterials. What they can’t do is prove one will sew, dye, pass QA and scale in time for the season. So brands stick with what they know, and the startups behind those materials run out of runway.',
    ),
    opportunityTitle: txt('AI can now act, not just answer.'),
    opportunityBody: txt(
      'Agents can request samples, compare quotes, book lab tests and draft briefs across many parties. That slow, repetitive, multi-party work is exactly what makes a new material too risky to try.',
    ),
    solutionTitle: txt('An agent that gets a chosen material to production.'),
    solutionBody: txt(
      'Filo runs sampling, testing and the factory handoff, then returns a go/no-go with evidence. The designer still picks the material. Filo makes it safe to say yes.',
    ),
    /** Look presets set art and motion; Layout stays independently adjustable. */
    preset: { type: 'select' as const, options: ['calm cards', 'editorial', 'outline', 'minimal', 'custom'], default: 'calm cards' },
    layout: { type: 'select' as const, options: ['bottom', 'top', 'right', 'left'], default: 'top' },
    art: { type: 'select' as const, options: ['card', 'line', 'outline', 'none'], default: 'card' },
    opportunityArt: { type: 'select' as const, options: ['three'], default: 'three' },
    motion: { type: 'select' as const, options: ['draw', 'pulse', 'off'], default: 'draw' },
    artWidth: [300, 160, 480, 5] as Tuple,
    rowGap: [44, 8, 140, 1] as Tuple,
    titleScale: [0.62, 0.3, 0.9, 0.01] as Tuple,
    textWidth: [460, 280, 720, 10] as Tuple,
    _collapsed: true,
  },
  origin: filoSection({
    eyebrow: 'Where it started',
    title: 'A 24-hour answer: a marketplace with a chatbot.',
    body: 'In late 2024, four of us built EcoFabriq at an MIT × Polimi hackathon. Biomaterial providers listed materials. Designers described their project to a chatbot and got matching materials, specs and locations to order from.\n\nIt demoed well. Then mentors asked who pays, why this beats a catalogue, and what happens if a mushroom coat sells 10,000 units. We had no answers.',
    video: 'placeholder',
    placeholder: '2024 demo · EcoFabriq chatbot',
    layout: 'bottom',
    size: 40,
    gap: 64,
  }),
  /** Quote wall from the interviews (rendered as `evidence`). */
  evidence: EVIDENCE_DIALS,
  insight: filoSection({
    eyebrow: 'Insight',
    title: 'Discovery wasn’t the bottleneck. Adoption was.',
    body: 'We had automated the one step designers enjoy. The pain sat after it: sampling with no spec sheet, lab tests, factory constraints, and a scale question that reaches the line review with no answer.\n\nThe material startups don’t fail because they can’t make the material. They fail because no brand will carry the risk of going first.',
    layout: 'bottom',
  }),
  /** Before → after table (rendered as `reframe`). */
  reframe: REFRAME_DIALS,
  /** Persona sheet (shared with Unwind), no portrait, one scenario card. */
  persona: {
    ...PERSONA_DIALS,
    eyebrow: txt('User persona'),
    title: txt('The technical designer handed a new material.'),
    body: txt(
      'She turns a designer’s sketch and fabric choice into a garment a factory can build. When a biomaterial lands on her desk, she becomes the project manager for every unknown.',
    ),
    tags: txt('Brand of 10–200 people, 2–4 collections a year, Lives in PLM and Excel, Fittings all afternoon, Emails Asia at 7 AM'),
    preset: { type: 'select' as const, options: ['custom'], default: 'custom' },
    image: { type: 'select' as const, options: ['none'], default: 'none' },
    contexts: { type: 'select' as const, options: ['scenario'], default: 'scenario' },
    driven: {
      title: txt('Driven by'),
      d1: txt('Ships the line on time, every season'),
      d2: txt('Protects fit, quality and the brand’s name'),
      d3: txt('Wants the new material to actually work'),
      _collapsed: true,
    },
    challenges: {
      title: txt('Challenges'),
      c1: txt('Weeks of back-and-forth with suppliers and factories'),
      c2: txt('Carries the risk personally if it fails'),
      c3: txt('Gets asked “can we make 10,000?” with no answer'),
      _collapsed: true,
    },
    moments: {
      ...PERSONA_DIALS.moments,
      eyebrow: txt('One moment · Monday, 9:12 AM'),
      title: txt('A bacterial-cellulose sheet lands on next season’s overshirt.'),
      body: txt(
        'The designer loved the swatch at a trade fair. There’s no spec sheet, the factory has never cut it, and line review is in six weeks. Today she would quietly swap it for the polyester she knows.',
      ),
    },
  },
  overview: filoSection({
    eyebrow: 'Product overview',
    title: 'Pick the material. Filo gets it to production.',
    body: 'Attach a material to a style. Filo proposes an adoption plan, runs it within a budget you set, and builds a technical file as results come in: how it sews, what it passed, how far it scales.',
    video: 'placeholder',
    placeholder: 'Product overview · 60 s loop',
  }),
  flowPlan: filoFlow(
    'Flow 1 · Adoption plan',
    'One material in. One plan out.',
    'Drop in a swatch photo, a supplier link or a recipe. Filo lists what it knows, what’s missing, the runs it would do, the total cost and the date of a go/no-go. One approval starts it.',
    'Prototype · Flow 1 — adoption plan',
  ),
  flowSamples: filoFlow(
    'Flow 2 · Sample run',
    'Three suppliers. One approval card.',
    'Filo requests swatches, compares lead time, price and sample size, then orders within your budget. You make one decision, not three email threads.',
    'Prototype · Flow 2 — sample run',
  ),
  flowFile: filoFlow(
    'Flow 3 · Technical file',
    'The file fills in as results arrive.',
    'Colorfastness, seam strength, pilling and dimensional stability land as lab reports. A heat limit clashes with the factory’s fusing step and gets flagged. Filo drafts the factory brief from the constraints.',
    'Prototype · Flow 3 — technical file',
  ),
  flowScale: filoFlow(
    'Flow 4 · Scale ladder',
    '“If it sells, can we make 10,000?”',
    'Capacity, lead time and price at 500, 2,000 and 10,000 units, the gap at each step, and a fallback material. One slide for the line review.',
    'Prototype · Flow 4 — scale ladder',
  ),
  /** Agent rules as four cards (rendered as `principles`). */
  principles: PRINCIPLES_DIALS,
  next: filoSection({
    eyebrow: 'What’s next',
    title: 'What I’d test next.',
    body: 'The prototypes are staged: supplier replies and test results are scripted; the 3D material is real. Next, I’d put Flow 1 in front of five technical designers, and ask one material startup whether they would answer a brand’s agent.\n\nOne open question: from 2027, EU Digital Product Passports could make a material’s technical file mandatory, not optional.',
  }),
}
