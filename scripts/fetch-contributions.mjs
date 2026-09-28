/**
 * Snapshots the public GitHub contribution calendar into
 * src/data/contributions.json (no token needed). Runs before every build; if
 * GitHub is unreachable the last snapshot is kept and the build continues.
 *
 *   node scripts/fetch-contributions.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'

const USER = 'davedoodz'
const OUT = new URL('../src/data/contributions.json', import.meta.url)

try {
  const res = await fetch(`https://github.com/users/${USER}/contributions`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()

  // Each day cell: <td … data-date="YYYY-MM-DD" id="contribution-day-component-R-C" data-level="0-4" …>
  const days = new Map()
  for (const m of html.matchAll(/data-date="(\d{4}-\d{2}-\d{2})" id="(contribution-day-component-[\d-]+)" data-level="(\d)"/g)) {
    days.set(m[2], { date: m[1], level: Number(m[3]), count: 0 })
  }
  // Counts live in the matching tooltip: "14 contributions on August 10th."
  for (const m of html.matchAll(/for="(contribution-day-component-[\d-]+)"[^>]*>(\d+) contributions? on/g)) {
    const day = days.get(m[1])
    if (day) day.count = Number(m[2])
  }
  if (days.size < 300) throw new Error(`only ${days.size} days parsed; markup changed?`)

  const list = [...days.values()].sort((a, b) => a.date.localeCompare(b.date))
  const data = { user: USER, fetchedAt: new Date().toISOString(), days: list }
  await writeFile(OUT, JSON.stringify(data) + '\n')
  console.log(`contributions: ${list.length} days, ${list.reduce((n, d) => n + d.count, 0)} contributions`)
} catch (error) {
  const kept = await readFile(OUT, 'utf8').catch(() => null)
  if (!kept) throw error
  console.warn(`contributions: fetch failed (${error.message}); keeping the last snapshot`)
}
