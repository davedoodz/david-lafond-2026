import { useId, type CSSProperties, type ReactNode } from "react";
import { AlarmClock, Annoyed, BatteryWarning, BellRing, Bomb, CloudHail, CloudRainWind, Gauge, HeartCrack, Megaphone, OctagonAlert, ThermometerSun, Wind, type LucideIcon } from "lucide-react";

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
 * Graphics for the Problem · Opportunity · Solution rows on the Unwind case study.
 * Same language as the Re:Self diagrams: ink line icons, Unwind blue for the live signal.
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
        <path
          className="sa-b sa-draw sa-beat"
          pathLength={1}
          d="M-9 1 h5 l2 -5 l3 9 l3 -10 l2 5 h4"
          stroke={BLUE}
          strokeWidth={1.8}
        />
      </g>
    </g>
  );
}
function Phone({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
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
function Spark({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    // Transform on a wrapper: the pulse animation sets `transform` on the path itself.
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path
        className="sa-b sa-spark"
        d="M0 -20C0.6 -7 2 -1.4 20 0C2 1.4 0.6 7 0 20C-0.6 7 -2 1.4 -20 0C-2 -1.4 -0.6 -7 0 -20Z"
        fill="none"
        stroke={BLUE}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
      {/* Small companion star, top right: sparkles in as the main star grows. */}
      <g transform="translate(17 -17) scale(0.38)">
        <path
          className="sa-b sa-spark-mini"
          d="M0 -20C0.6 -7 2 -1.4 20 0C2 1.4 0.6 7 0 20C-0.6 7 -2 1.4 -20 0C-2 -1.4 -0.6 -7 0 -20Z"
          fill="none"
          stroke={BLUE}
          strokeWidth={4}
          strokeLinejoin="round"
        />
      </g>
    </g>
  );
}
/** Stress spike on the curve's peak: the custom bolt with tension marks, or a Lucide icon (24px grid). */
function Stress({ x, y, s = 1, icon = "bolt" }: { x: number; y: number; s?: number; icon?: string }) {
  if (icon === "none") return null;
  const Lucide = PEAK_ICONS[icon];
  return (
    <g
      transform={`translate(${x} ${y}) scale(${s})`}
      fill="none"
      stroke={INK}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g className="sa-icon sa-stress">
        {Lucide ? (
          <Lucide x={-11} y={-11} width={22} height={22} color={INK} strokeWidth={1.8} />
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
 * `right` from its left edge. Starts `at` seconds after the row's curve starts (motion: draw).
 */
function Wipe({ box: [x, y, w, h], from, at, children }: { box: [number, number, number, number]; from: "up" | "right"; at: number; children: ReactNode }) {
  const id = `sa-wipe-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <>
      <mask id={id} maskUnits="userSpaceOnUse" x={x} y={y} width={w} height={h}>
        <rect className={`sa-wipe sa-wipe--${from}`} x={x} y={y} width={w} height={h} fill="#fff" style={{ "--at": `${at}s` } as CSSProperties} />
      </mask>
      <g mask={`url(#${id})`}>{children}</g>
    </>
  );
}

/** Problem: the feeling peaks, and the app only opens after it has faded. */
export function ProblemArt({ text = STORY_ART_TEXT, peakIcon = "bolt" }: { text?: StoryArtText; peakIcon?: string }) {
  return (
    <svg
      viewBox="0 0 240 160"
      role="img"
      aria-label="Emotional intensity peaks and fades before the app is opened"
    >
      <path d="M14 136 H226" stroke={STONE} strokeWidth={1} opacity={0.5} />
      <path
        className="sa-b sa-draw"
        pathLength={1}
        d={CURVE}
        fill="none"
        stroke={BLUE}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      {label(88, 20, text.problemMoment, STONE, "end")}
      <Stress x={104} y={16} icon={peakIcon} />
      {/* After the curve: the dotted line draws up from the curve, then the phone appears. */}
      <Wipe box={[194, 58, 12, 74]} from="up" at={1.6}>
        <path
          d="M200 128 V62"
          stroke={INK}
          strokeWidth={1.4}
          strokeDasharray="2 4"
          strokeLinecap="round"
        />
      </Wipe>
      <g className="sa-after sa-after--rise" style={{ "--at": "2.2s" } as CSSProperties}>
        <Phone x={200} y={38} s={0.8} />
      </g>
      {label(200, 154, text.problemOpened, INK)}
    </svg>
  );
}

/** Solution: the same curve, met at its peak by a check-in on the wrist. */
export function SolutionArt({ text = STORY_ART_TEXT }: { text?: StoryArtText }) {
  return (
    <svg
      viewBox="0 0 240 160"
      role="img"
      aria-label="A check-in arrives at the peak of the moment"
    >
      <path d="M14 136 H226" stroke={STONE} strokeWidth={1} opacity={0.5} />
      <path
        className="sa-b sa-draw"
        pathLength={1}
        d={CURVE}
        fill="none"
        stroke={BLUE}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      {/* After the curve: the peak dot, then the dotted line draws left to right, then the watch. */}
      <g className="sa-after" style={{ "--at": "1.6s" } as CSSProperties}>
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
      <Wipe box={[110, 32, 44, 30]} from="right" at={2}>
        <path
          d="M150 58 Q128 44 114 38"
          fill="none"
          stroke={INK}
          strokeWidth={1.4}
          strokeDasharray="2 4"
          strokeLinecap="round"
        />
      </Wipe>
      <g className="sa-after" style={{ "--at": "2.5s" } as CSSProperties}>
        <Watch x={164} y={64} s={1} />
      </g>
      {label(104, 154, text.solutionCheckIn, INK)}
    </svg>
  );
}

/** Opportunity: the three technologies, either as three tiles or converging on the moment. */
export function OpportunityArt({ variant, text = STORY_ART_TEXT }: { variant: string; text?: StoryArtText }) {
  if (variant === "converge")
    return (
      <svg
        viewBox="0 0 240 160"
        role="img"
        aria-label="Wearables, voice and realtime AI converge on the moment"
      >
        <Watch x={30} y={30} s={0.85} />
        <Voice x={30} y={80} s={0.85} />
        <Spark x={30} y={130} s={0.85} />
        {[30, 80, 130].map((y, i) => (
          <path
            key={y}
            className="sa-b sa-draw"
            pathLength={1}
            style={{ "--i": i } as CSSProperties}
            d={`M58 ${y} C130 ${y} 140 80 196 80`}
            fill="none"
            stroke={BLUE}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        ))}
        {/* The moment appears once all three lines have converged. Lines end at 0.7s + 1.6s;
            the last line (--i 2) ends at 0.7s + 1.6s. */}
        <g className="sa-after" style={{ "--at": "2.3s" } as CSSProperties}>
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
        <Spark x={180} y={70} s={1.2} />
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
          <Spark key="s" x={40} y={40} s={1.15} />,
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
