import { useId, type CSSProperties, type ReactNode } from "react";
import { AlarmClock, Annoyed, BatteryWarning, BellRing, Blocks, Bomb, CloudHail, CloudRainWind, Database, FileStack, Gauge, HeartCrack, Layers, Layers2, LibraryBig, Megaphone, MessagesSquare, OctagonAlert, ThermometerSun, Wind, type LucideIcon } from "lucide-react";

/** Icon at the Problem curve's peak (DialKit story → peakIcon). `bolt` is the custom bolt with tension marks. */
export const PEAK_ICONS: Record<string, LucideIcon | null> = {
  bolt: null,
  "heart-crack": HeartCrack,
  bomb: Bomb,
  "cloud-hail": CloudHail,
  "cloud-rain-wind": CloudRainWind,
  "thermometer-sun": ThermometerSun,
  gauge: Gauge,
  "battery-warning": BatteryWarning,
  annoyed: Annoyed,
  "octagon-alert": OctagonAlert,
  "alarm-clock": AlarmClock,
  "bell-ring": BellRing,
  megaphone: Megaphone,
  wind: Wind,
  none: null,
};
/**
 * Graphics for the Problem · Opportunity · Solution rows on the Momo case study.
 * Same language as the Re:Self diagrams: ink line icons, Momo blue for the live signal.
 * Blue marks carry `sa-b` (and `sa-draw` for strokes that draw in), so only blue moves.
 */
const INK = "#171717";
const STONE = "#a6a09c";
const BLUE = "#53bffe";

/** Editable art captions (DialKit `story → artText`); an empty string removes that caption. */
export type StoryArtText = {
  problemMoment: string;
  problemOpened: string;
  opportunityMoment: string;
  solutionCheckIn: string;
};
export const STORY_ART_TEXT: StoryArtText = {
  problemMoment: "the moment",
  problemOpened: "app opened",
  opportunityMoment: "the moment",
  solutionCheckIn: "check-in, right then",
};

/**
 * Seconds each step of the three diagrams takes at row speed 1 (DialKit story → timing). Steps run
 * one after another, so lengthening one pushes every later step back. Row speed still scales all.
 */
export type StoryTiming = {
  /** `peakLead`: the peak icon shows this long before the curve finishes, as the line crests. */
  problem: { curve: number; peakLead: number; icon: number; line: number; phone: number };
  /** `stagger`: gap between the three converging lines starting. */
  opportunity: { lines: number; stagger: number; dot: number };
  /** `peakLead`: the peak dot (and the watch after it) start this long before the curve finishes ·
   *  `beat`: the watch's one heartbeat · `hold`: watch on screen before the phone's line starts. */
  solution: { curve: number; peakLead: number; dot: number; line: number; watch: number; beat: number; hold: number; phoneLine: number; phone: number };
};
export const STORY_TIMING: StoryTiming = {
  problem: { curve: 1.6, peakLead: 1, icon: 0.5, line: 0.6, phone: 0.7 },
  opportunity: { lines: 1.6, stagger: 0.35, dot: 0.5 },
  solution: { curve: 1.6, peakLead: 1, dot: 0.4, line: 0.5, watch: 0.5, beat: 1.6, hold: 0.78, phoneLine: 0.6, phone: 0.7 },
};

/** `--at` (start) and `--dur` for one step. */
const step = (at: number, dur: number) => ({ "--at": `${at}s`, "--dur": `${dur}s` }) as CSSProperties;

const label = (
  x: number,
  y: number,
  t: string,
  fill = STONE,
  anchor: "start" | "middle" | "end" = "middle",
) =>
  t.trim() ? (
    <text
      x={x}
      y={y}
      fontSize={11}
      fill={fill}
      textAnchor={anchor}
      letterSpacing="0.02em"
    >
      {t}
    </text>
  ) : null;

/** Emotional intensity over time: rises, peaks, fades. Shared by Problem and Solution. */
const CURVE = "M14 128 C60 128 72 34 104 34 C136 34 156 118 226 124";

function Watch({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${s})`}
      fill="none"
      stroke={INK}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Inner group carries the motion; the outer group's transform attribute places it. */}
      <g className="sa-icon sa-watch">
        <path d="M-9 -15 l2 -8 h14 l2 8 M-9 15 l2 8 h14 l2 -8" />
        <rect x={-14} y={-15} width={28} height={30} rx={8} />
        {/* Story → icons → heart x/y/scale: moves the line inside the face (origin = the face's centre). */}
        <g style={{ transform: "translate(calc(var(--hb-x, 0) * 1px), calc(var(--hb-y, 0) * 1px)) scale(var(--hb-s, 1))" }}>
          <path
            className="sa-b sa-draw sa-beat"
            pathLength={1}
            d="M-9 1 h5 l2 -5 l3 9 l3 -10 l2 5 h4"
            stroke={BLUE}
            strokeWidth={1.8}
          />
        </g>
      </g>
    </g>
  );
}
function Phone({ x, y, s = 1, children }: { x: number; y: number; s?: number; children?: ReactNode }) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${s})`}
      fill="none"
      stroke={INK}
      strokeWidth={2.2}
      strokeLinecap="round"
    >
      <g className="sa-icon sa-phone">
        <rect x={-12} y={-21} width={24} height={42} rx={6} />
        <path d="M-4 -16 h8" />
        {children}
      </g>
    </g>
  );
}
function Voice({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const bars = [6, 14, 22, 12, 18, 8, 4];
  return (
    <g
      transform={`translate(${x} ${y}) scale(${s})`}
      stroke={BLUE}
      strokeWidth={3}
      strokeLinecap="round"
      className="sa-b sa-bars"
    >
      {bars.map((h, i) => (
        <line
          key={i}
          x1={-18 + i * 6}
          x2={-18 + i * 6}
          y1={-h / 2}
          y2={h / 2}
          style={{ "--i": i } as CSSProperties}
        />
      ))}
    </g>
  );
}
/**
 * Context icons for the Opportunity row (DialKit story → icons → contextIcon). Each builds itself piece by
 * piece (CSS: .sa-context[data-icon] sets the pieces' build order), e.g. `layers` piles up from the bottom.
 * Preview: scripts/context-motion.html.
 */
export const CONTEXT_ICONS: Record<string, LucideIcon> = {
  layers: Layers,
  "layers-2": Layers2,
  "file-stack": FileStack,
  database: Database,
  "library-big": LibraryBig,
  "messages-square": MessagesSquare,
  blocks: Blocks,
};
function Context({ x, y, s = 1, icon = "layers" }: { x: number; y: number; s?: number; icon?: string }) {
  const Lucide = CONTEXT_ICONS[icon] ?? Layers;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {/* 40 units across, like the other technology icons; absoluteStrokeWidth keeps the stroke at 2.2 units. */}
      <g className="sa-context" data-icon={icon}>
        <Lucide x={-20} y={-20} size={40} color={BLUE} strokeWidth={2.2} absoluteStrokeWidth />
      </g>
    </g>
  );
}
/** Stress spike on the curve's peak: the custom bolt with tension marks, or a Lucide icon (24px grid). */
function Stress({ x, y, s = 1, icon = "bolt", color = INK }: { x: number; y: number; s?: number; icon?: string; color?: string }) {
  if (icon === "none") return null;
  const Lucide = PEAK_ICONS[icon];
  return (
    <g
      transform={`translate(${x} ${y}) scale(${s})`}
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g className="sa-icon sa-stress" data-icon={icon}>
        {Lucide ? (
          <Lucide x={-11} y={-11} width={22} height={22} color={color} strokeWidth={1.8} />
        ) : (
          <>
            <path d="M2 -10 L-5 1 H1 L-2 10 L6 -2 H0 Z" />
            <path d="M-10 -7 l-4 -3 M10 -7 l4 -3 M-12 1 h-5 M12 1 h5" />
          </>
        )}
      </g>
    </g>
  );
}

/**
 * Reveals its children by growing a mask rect (transform only): `up` from the box's bottom edge,
 * `right` from its left edge. Starts `at` seconds after the row's curve starts and takes `dur`
 * (motion: draw).
 */
function Wipe({ box: [x, y, w, h], from, at, dur, children }: { box: [number, number, number, number]; from: "up" | "right"; at: number; dur: number; children: ReactNode }) {
  const id = `sa-wipe-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <>
      <mask id={id} maskUnits="userSpaceOnUse" x={x} y={y} width={w} height={h}>
        <rect className={`sa-wipe sa-wipe--${from}`} x={x} y={y} width={w} height={h} fill="#fff" style={step(at, dur)} />
      </mask>
      <g mask={`url(#${id})`}>{children}</g>
    </>
  );
}

/** Problem: the feeling peaks, and the app only opens after it has faded. */
export function ProblemArt({ text = STORY_ART_TEXT, peakIcon = "bolt", peakColor = INK, peak = { x: 0, y: 0, scale: 1 }, timing = STORY_TIMING.problem }: { text?: StoryArtText; peakIcon?: string; peakColor?: string; peak?: { x: number; y: number; scale: number }; timing?: StoryTiming["problem"] }) {
  const t = timing;
  const iconAt = Math.max(0, t.curve - t.peakLead);
  const lineAt = t.curve + t.icon;
  const phoneAt = lineAt + t.line;
  return (
    <svg
      viewBox="0 0 240 160"
      role="img"
      aria-label="Emotional intensity peaks and fades before the app is opened"
    >
      <path d="M14 136 H226" stroke={STONE} strokeWidth={1} opacity={0.5} />
      <path
        className="sa-b sa-draw"
        style={step(0, t.curve)}
        pathLength={1}
        d={CURVE}
        fill="none"
        stroke={BLUE}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      {label(88, 20, text.problemMoment, STONE, "end")}
      {/* Urgent entrance (story → peakEntrance, CSS story-peak-*); the ring only shows for siren and ping. */}
      <g className="sa-after sa-peak" style={step(iconAt, t.icon)}>
        <circle className="sa-peak-ring" cx={104 + peak.x} cy={16 + peak.y} r={12 * peak.scale} fill="none" stroke={peakColor} strokeWidth={1.4} />
        <Stress x={104 + peak.x} y={16 + peak.y} s={peak.scale} icon={peakIcon} color={peakColor} />
      </g>
      {/* After the curve: the peak icon pops, then the dotted line draws up, then the phone appears. */}
      <Wipe box={[194, 58, 12, 74]} from="up" at={lineAt} dur={t.line}>
        <path
          d="M200 128 V62"
          stroke={INK}
          strokeWidth={1.4}
          strokeDasharray="2 4"
          strokeLinecap="round"
        />
      </Wipe>
      <g className="sa-after sa-after--rise" style={step(phoneAt, t.phone)}>
        <Phone x={200} y={38} s={0.8} />
      </g>
      {label(200, 154, text.problemOpened, INK)}
    </svg>
  );
}

/**
 * Solution: the same curve, met at its peak by a check-in on the wrist. The watch rises straight up from
 * the peak dot and stays, with its dotted line, once it appears; the phone follows to its right.
 */
export function SolutionArt({ text = STORY_ART_TEXT, timing = STORY_TIMING.solution }: { text?: StoryArtText; timing?: StoryTiming["solution"] }) {
  const t = timing;
  const dotAt = Math.max(0, t.curve - t.peakLead);
  const lineAt = dotAt + t.dot;
  const watchAt = lineAt + t.line;
  const beatAt = watchAt + t.watch;
  const phoneLineAt = beatAt + t.hold;
  const phoneAt = phoneLineAt + t.phoneLine;
  return (
    <svg
      viewBox="0 0 240 160"
      role="img"
      aria-label="A watch check-in at the peak leads to voice reflection on the phone just after the peak"
    >
      <path d="M14 136 H226" stroke={STONE} strokeWidth={1} opacity={0.5} />
      <path
        className="sa-b sa-draw"
        style={step(0, t.curve)}
        pathLength={1}
        d={CURVE}
        fill="none"
        stroke={BLUE}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      {/* After the curve: the peak dot, then the dotted line draws straight up, then the watch above it. */}
      <g className="sa-after" style={step(dotAt, t.dot)}>
        <circle
          className="sa-b sa-ping"
          cx={104}
          cy={34}
          r={12}
          fill={BLUE}
          opacity={0.18}
        />
        <circle className="sa-b" cx={104} cy={34} r={5} fill={BLUE} />
      </g>
      <g className="sa-solution-watch" style={{ "--beat-at": `${beatAt}s`, "--beat": `${t.beat}s` } as CSSProperties}>
      <Wipe box={[98, 6, 12, 18]} from="up" at={lineAt} dur={t.line}>
        <path d="M104 21 V9" stroke={INK} strokeWidth={1.4} strokeDasharray="2 4" strokeLinecap="round" />
      </Wipe>
      <g className="sa-after sa-after--rise" style={step(watchAt, t.watch)}>
        <Watch x={104} y={-12} s={0.75} />
      </g>
      </g>
      <g className="sa-solution-phone" style={{ "--show-at": `${phoneLineAt}s` } as CSSProperties}>
        <Wipe box={[136, 43, 12, 47]} from="up" at={phoneLineAt} dur={t.phoneLine}>
          <path d="M142 88 V46" stroke={INK} strokeWidth={1.4} strokeDasharray="2 4" strokeLinecap="round" />
        </Wipe>
        <g className="sa-after sa-after--rise" style={step(phoneAt, t.phone)}>
          <Phone x={142} y={24} s={0.8}>
            <Voice x={0} y={2} s={0.42} />
          </Phone>
        </g>
      </g>
      {label(104, 154, text.solutionCheckIn, INK)}
    </svg>
  );
}

/** Opportunity: the three technologies, either as three tiles or converging on the moment. */
export function OpportunityArt({ variant, contextIcon = "layers", text = STORY_ART_TEXT, timing = STORY_TIMING.opportunity }: { variant: string; contextIcon?: string; text?: StoryArtText; timing?: StoryTiming["opportunity"] }) {
  const t = timing;
  if (variant === "converge")
    return (
      <svg
        viewBox="0 0 240 160"
        role="img"
        aria-label="Wearables, voice and realtime AI converge on the moment"
      >
        <Watch x={30} y={30} s={0.85} />
        <Voice x={30} y={80} s={0.85} />
        <Context x={30} y={130} s={0.85} icon={contextIcon} />
        {[30, 80, 130].map((y, i) => (
          <path
            key={y}
            className="sa-b sa-draw"
            pathLength={1}
            style={step(i * t.stagger, t.lines)}
            d={`M58 ${y} C130 ${y} 140 80 196 80`}
            fill="none"
            stroke={BLUE}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        ))}
        {/* The moment appears once all three lines have converged: the last starts two staggers in. */}
        <g className="sa-after" style={step(2 * t.stagger + t.lines, t.dot)}>
          <circle
            className="sa-b sa-ping"
            cx={206}
            cy={80}
            r={14}
            fill={BLUE}
            opacity={0.18}
          />
          <circle className="sa-b" cx={206} cy={80} r={6} fill={BLUE} />
        </g>
        {label(206, 110, text.opportunityMoment, INK)}
      </svg>
    );
  if (variant === "single")
    return (
      <svg
        viewBox="0 0 240 160"
        role="img"
        aria-label="Wearables, voice and realtime AI"
      >
        <Watch x={60} y={70} s={1.3} />
        <Voice x={120} y={70} s={1.1} />
        <Context x={180} y={70} s={1.2} icon={contextIcon} />
        {label(60, 130, "wearables", INK)}
        {label(120, 130, "voice", INK)}
        {label(180, 130, "realtime AI", INK)}
      </svg>
    );
  // three: one small tile per technology
  return (
    <div className="story-art__tiles">
      {[
        ["wearables", "sense change", <Watch key="w" x={40} y={40} s={1.2} />],
        ["voice", "carries feeling", <Voice key="v" x={40} y={40} s={1.15} />],
        [
          "realtime AI",
          "connects both",
          <Context key="c" x={40} y={40} s={1.15} icon={contextIcon} />,
        ],
      ].map(([name, line, art]) => (
        <figure key={name as string} className="story-art__tile">
          <svg viewBox="0 0 80 80" aria-hidden="true">
            {art}
          </svg>
          <figcaption>
            <b>{name}</b>
            <span>{line}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
