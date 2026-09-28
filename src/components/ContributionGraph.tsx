/**
 * GitHub contribution graph (last N months) from the build-time snapshot in
 * src/data/contributions.json (`npm run contributions`, also run before every build).
 * Columns are weeks (Sunday first), rows are weekdays, like GitHub's own calendar.
 */
import { useMemo, type CSSProperties } from 'react'
import { SOCIAL } from '../data/contact'
import contributions from '../data/contributions.json'
import { useTuning } from '../tuning/useTuning'
import './ContributionGraph.css'

type Tuple = [number, number, number, number]

const CONFIG = {
  show: true,
  /** First day shown (most recent occurrence on or before the latest snapshot day). */
  startMonth: [7, 1, 12, 1] as Tuple,
  startDay: [1, 1, 31, 1] as Tuple,
  cell: [12, 6, 24, 1] as Tuple,
  gap: [3, 1, 8, 1] as Tuple,
  radius: [2, 0, 12, 0.5] as Tuple,
  /** Space above the graph (below the playground), px. */
  topGap: [120, 0, 400, 1] as Tuple,
  /** Graph to the contact block below it (replaces that block's own top gap), px. */
  bottomGap: [72, 0, 400, 1] as Tuple,
  palette: { type: 'select' as const, options: ['green', 'mono'], default: 'green' },
}

type Day = { date: string; level: number; count: number }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const parse = (iso: string) => new Date(`${iso}T00:00:00Z`)

export function ContributionGraph() {
  const t = useTuning('Contributions', CONFIG)
  const { startMonth, startDay } = t

  const { weeks, total, labels, since } = useMemo(() => {
    const days = contributions.days as Day[]
    const last = parse(days[days.length - 1].date)
    let year = last.getUTCFullYear()
    const startOf = (y: number) => new Date(Date.UTC(y, startMonth - 1, startDay))
    if (startOf(year) > last) year -= 1
    const from = startOf(year)
    const start = from.toISOString().slice(0, 10)
    const shown = days.filter((d) => d.date >= start)
    const since = `${from.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })} ${from.getUTCDate()}`

    // Days before the start in the first week stay as blank slots.
    const weeks: (Day | null)[][] = []
    for (const day of shown) {
      const dow = parse(day.date).getUTCDay()
      if (dow === 0 || weeks.length === 0) weeks.push(Array(7).fill(null))
      weeks[weeks.length - 1][dow] = day
    }
    // Month label on the first week that starts in a new month.
    const labels = weeks.map((week, i) => {
      const first = week.find(Boolean)
      if (!first) return ''
      const m = parse(first.date).getUTCMonth()
      const prev = i > 0 ? weeks[i - 1].find(Boolean) : null
      return !prev || parse(prev.date).getUTCMonth() !== m ? MONTHS[m] : ''
    })
    // A partial first month would crowd the next label (GitHub drops it too).
    const second = labels.findIndex((label, i) => i > 0 && label)
    if (second > 0 && second < 3) labels[0] = ''
    return { weeks, total: shown.reduce((n, d) => n + d.count, 0), labels, since }
  }, [startMonth, startDay])

  if (!t.show) return null

  const style = {
    '--cg-cell': `${t.cell}px`,
    '--cg-gap': `${t.gap}px`,
    '--cg-radius': `${t.radius}px`,
    '--cg-top': `${t.topGap}px`,
    '--cg-bottom': `${t.bottomGap}px`,
  } as CSSProperties

  return (
    <section className="cg" data-palette={t.palette} style={style} aria-labelledby="cg-title">
      <a id="cg-title" className="cg__title eyebrow" href={SOCIAL.github} target="_blank" rel="noopener">
        {total} contributions since {since}
      </a>
      <div className="cg__graph" role="img" aria-label={`${total} GitHub contributions since ${since}`}>
        <div className="cg__months" aria-hidden="true">
          {labels.map((label, i) => (
            <span key={i}>{label}</span>
          ))}
        </div>
        <div className="cg__weeks">
          {weeks.map((week, i) => (
            <div key={i} className="cg__week">
              {week.map((day, d) =>
                day ? (
                  <span
                    key={d}
                    className="cg__day"
                    data-level={day.level}
                    title={`${day.count || 'No'} contribution${day.count === 1 ? '' : 's'} on ${day.date}`}
                  />
                ) : (
                  <span key={d} className="cg__day" data-empty />
                ),
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
