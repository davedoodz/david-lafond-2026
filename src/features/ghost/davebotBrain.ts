/**
 * Davebot's brain: no model, no network. Every answer is prewritten in davebotBrain.data.ts and
 * picked here, so replies are instant, free, and always in David's voice.
 *
 * Matching, in order:
 *  1. Follow-ups ("tell me more", "why?") continue the last topic.
 *  2. Live answers the page can compute itself: arithmetic, coin flips, the time, the date.
 *  3. Intents: exact phrases, then contained phrases, then keywords; typos are forgiven in all
 *     three. Filler around the question ("hey", "lol", "please") is tried without first.
 *  4. Question-shape fallbacks (would / favourite / opinion / yes-no / how-to …), then a general
 *     pool. Nothing ever answers "I don't have access".
 *
 * Each intent has several answers; they rotate so asking twice gets a different reply.
 */
import { BRAIN_INTENTS, FALLBACKS, TRY_ASKING, type BrainIntent, type BrainLink } from './davebotBrain.data'

export type AnswerSegment = { text: string; emphasis?: boolean }

export type BrainReply = { id: string; segments: AnswerSegment[]; link?: BrainLink }

/** Below this, an intent is a coincidence, not an answer. */
const MIN_SCORE = 4

const memory = { lastId: null as string | null, moreIndex: 0 }
const rotation = new Map<string, number>()

/** Lowercase words only: accents, apostrophes and punctuation dropped ("What's Filo?" → "whats filo"). */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .replaceAll(/['\u2019]/g, '')
    .replaceAll(/[^a-z0-9]+/g, ' ')
    .trim()
}

function words(value: string): string[] {
  const text = normalize(value)
  return text ? text.split(' ') : []
}

/** Plural / -ing / -ed folded so "projects", "designing", "designed" meet their keys. */
function stem(token: string): string {
  if (token.length > 5 && token.endsWith('ing')) return token.slice(0, -3)
  if (token.length > 4 && token.endsWith('ed')) return token.slice(0, -2)
  if (token.length > 4 && token.endsWith('ies')) return `${token.slice(0, -3)}y`
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1)
  return token
}

/** Edit distance ≤ `max`, with an early exit once every path passes it. */
function within(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      best = Math.min(best, cur[j])
    }
    if (best > max) return false
    prev = cur
  }
  return prev[b.length] <= max
}

/** Same word, same stem, or a typo: one slip in 5+ letters, two in 8+ ("desinger", "archetecture"). */
function tokenMatches(query: string, key: string): boolean {
  if (query === key) return true
  const a = stem(query)
  const b = stem(key)
  if (a === b) return true
  const max = b.length >= 8 ? 2 : b.length >= 5 ? 1 : 0
  return max > 0 && query[0] === key[0] && within(a, b, max)
}

function sameWords(tokens: string[], phrase: string[]): boolean {
  return tokens.length === phrase.length && phrase.every((word, i) => tokenMatches(tokens[i], word))
}

function containsWords(tokens: string[], phrase: string[]): boolean {
  for (let start = 0; start + phrase.length <= tokens.length; start++) {
    if (phrase.every((word, i) => tokenMatches(tokens[start + i], word))) return true
  }
  return false
}

type Compiled = BrainIntent & { phraseWords: string[][]; exactWords: string[][]; keyWords: string[] }

const compiled: Compiled[] = BRAIN_INTENTS.map(intent => ({
  ...intent,
  phraseWords: (intent.phrases ?? []).map(words),
  exactWords: (intent.exact ?? []).map(words),
  keyWords: (intent.keys ?? []).map(normalize),
}))

const byId = new Map(compiled.map(intent => [intent.id, intent]))

function scoreIntent(intent: Compiled, tokens: string[]): number {
  let score = 0
  for (const phrase of intent.exactWords) if (sameWords(tokens, phrase)) score += 40
  for (const phrase of intent.phraseWords) {
    if (sameWords(tokens, phrase)) score += 40
    else if (containsWords(tokens, phrase)) score += 12 + phrase.length * 2
  }
  for (const key of intent.keyWords) {
    if (tokens.some(token => tokenMatches(token, key))) score += key.length >= 5 ? 4 : 3
  }
  return score * (intent.weight ?? 1)
}

function bestIntent(tokens: string[]): Compiled | null {
  let best: Compiled | null = null
  let bestScore = MIN_SCORE - 0.001
  for (const intent of compiled) {
    const score = scoreIntent(intent, tokens)
    if (score > bestScore) {
      best = intent
      bestScore = score
    }
  }
  return best
}

/** Filler around a question: "hey", "lol", "ok so", "please", "davebot". */
const LEAD = new Set(['hi', 'hey', 'heyy', 'hello', 'yo', 'yoo', 'sup', 'ok', 'okay', 'so', 'um', 'umm', 'uh', 'hmm', 'well', 'lol', 'haha', 'ha', 'btw', 'also', 'and', 'but', 'davebot', 'dave', 'ghost', 'please', 'pls', 'plz', 'quick', 'question', 'thanks', 'thx', 'cool', 'nice', 'bro', 'man', 'dude', 'alright', 'salut', 'bonjour', 'allo'])
const TRAIL = new Set(['please', 'pls', 'plz', 'thanks', 'thx', 'davebot', 'dave', 'ghost', 'lol', 'haha', 'bro', 'man', 'dude', 'then', 'though', 'tho', 'again'])

function trimFiller(tokens: string[]): string[] {
  let start = 0
  let end = tokens.length
  while (start < end && LEAD.has(tokens[start])) start++
  while (end > start && TRAIL.has(tokens[end - 1])) end--
  return tokens.slice(start, end)
}

/** Parses `**bold**` spans into emphasis segments. */
function toSegments(text: string): AnswerSegment[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map(part => (part.startsWith('**') ? { text: part.slice(2, -2), emphasis: true } : { text: part }))
}

/** Next answer for `id` from `pool`, rotating from a random start so repeats come late. */
function pick(id: string, pool: string[]): string {
  const at = rotation.get(id) ?? Math.floor(Math.random() * pool.length)
  rotation.set(id, (at + 1) % pool.length)
  return pool[at % pool.length]
}

const FOLLOW_UP = new Set([
  'tell me more', 'more', 'go on', 'continue', 'keep going', 'and', 'and then', 'elaborate', 'explain', 'explain more',
  'why', 'how so', 'really', 'for real', 'example', 'give me an example', 'like what', 'what else', 'anything else',
  'and what else', 'details', 'more details', 'say more', 'then what', 'what do you mean', 'more please', 'tell me more about that',
  'go deeper', 'expand', 'and', 'what more',
])

/** Arithmetic like "2+2", "what is 12 * 7", "15% of 80". Null when it isn't a sum. */
function arithmetic(raw: string): string | null {
  const q = raw
    .toLowerCase()
    .trim()
    .replace(/^(what('?s| is)|how much is|calculate|compute|solve)\s+/, '')
    .replace(/[?=!.]+$/, '')
    .trim()
  const pct = q.match(/^(\d+(?:\.\d+)?)\s*%\s*of\s*(\d+(?:\.\d+)?)$/)
  if (pct) return format((Number(pct[1]) / 100) * Number(pct[2]))
  const expr = q
    .replaceAll(/\s+(times|x)\s+/g, '*')
    .replaceAll(/\s+plus\s+/g, '+')
    .replaceAll(/\s+minus\s+/g, '-')
    .replaceAll(/\s+(divided by|over)\s+/g, '/')
    .replaceAll('×', '*')
    .replaceAll('÷', '/')
    .replaceAll(/(\d)\s*x\s*(\d)/g, '$1*$2')
    .replaceAll('^', '**')
    .replaceAll(/\s+/g, '')
  if (!/^[\d.()+\-*/]+$/.test(expr) || !/\d[+\-*/]+[\d(]/.test(expr)) return null
  try {
    // Only digits, operators and brackets reach here, so this cannot run code.
    const value = Function(`"use strict";return (${expr})`)() as number
    return Number.isFinite(value) ? format(value) : null
  } catch {
    return null
  }
}

function format(n: number): string {
  return Number.isInteger(n) ? n.toLocaleString('en-US') : n.toLocaleString('en-US', { maximumFractionDigits: 4 })
}

const MATH_LINES = [
  'That’s **{n}**. David took structures courses in architecture school, so the math is load-bearing.',
  '**{n}**. Quick and clean. Now ask me something harder, like why David owns so many sketchbooks.',
  '**{n}**. Davebot: part ghost, part calculator, full-time hype man.',
]

function live(raw: string, text: string): BrainReply | null {
  const sum = arithmetic(raw)
  if (sum !== null) return { id: 'math', segments: toSegments(pick('math', MATH_LINES).replace('{n}', sum)) }
  if (/\b(flip a coin|coin flip|heads or tails|toss a coin)\b/.test(text)) {
    const side = Math.random() < 0.5 ? 'Heads' : 'Tails'
    return { id: 'coin', segments: toSegments(`**${side}.** The ghost has spoken. Whatever you were deciding, David would say prototype both.`) }
  }
  if (/\b(roll a (die|dice)|roll the dice|roll dice)\b/.test(text)) {
    const roll = 1 + Math.floor(Math.random() * 6)
    return { id: 'dice', segments: toSegments(`You rolled a **${roll}**. Lucky number for a design review.`) }
  }
  if (/\b(what time is it|whats the time|current time|time is it)\b/.test(text)) {
    const t = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    return { id: 'time', segments: toSegments(`It’s **${t}** where you are. Perfect time to read a case study. No pressure. Some pressure.`) }
  }
  if (/\b(what day is it|whats the date|todays date|what is the date|what is today|which day is it|whats today)\b/.test(text)) {
    const d = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    return { id: 'date', segments: toSegments(`It’s **${d}**. Historically a great day to hire a designer.`) }
  }
  return null
}

/** Question shape for fallbacks when no topic matched. */
function shape(text: string): keyof typeof FALLBACKS {
  if (/^(hi|hey|yo|sup|hello|bonjour|salut|allo|hola|wassup|wsg|gm)\b/.test(text)) return 'greeting'
  if (/\b(fav(ou?rite)?|best|top|go to|goto)\b/.test(text)) return 'favorite'
  if (/\b(would|will|could) (david|he|you)\b|\bwhat if\b/.test(text)) return 'hypothetical'
  if (/\b(what do(es)? (you|david|he) think|thoughts on|opinion|how do(es)? (you|david|he) feel|views? on|take on|is .* (good|bad|overrated|underrated))\b/.test(text)) return 'opinion'
  if (/\b(do(es)? (david|he|you) (like|love|hate|enjoy|play|watch|eat|drink|know|speak|have|own|use))\b/.test(text)) return 'likes'
  if (/\b(can you|could you|write|make me|generate|draw|translate|summarize|help me)\b/.test(text)) return 'task'
  if (/^(how (do|can|to|should)|whats the best way|tips?)\b/.test(text)) return 'howto'
  if (/^(is|are|am|do|does|did|was|were|has|have|can|should)\b/.test(text)) return 'yesno'
  if (/^why\b/.test(text)) return 'why'
  if (/^(who|what|whats|where|when|which|how)\b/.test(text)) return 'wh'
  return 'general'
}

function remember(reply: BrainReply): BrainReply {
  if (reply.id !== memory.lastId) memory.moreIndex = 0
  memory.lastId = reply.id
  return reply
}

/** "Tell me more": the topic's extra answers first, then its other answers. */
function followUp(): BrainReply | null {
  const last = memory.lastId ? byId.get(memory.lastId) : undefined
  if (!last) return null
  const pool = last.more?.length ? last.more : last.answers.length > 1 ? last.answers : null
  if (!pool) return null
  const text = last.more?.length ? pool[memory.moreIndex % pool.length] : pick(last.id, pool)
  memory.moreIndex += 1
  return { id: last.id, segments: toSegments(text), link: last.link }
}

export function think(query: string): BrainReply {
  const raw = query.trim()
  const tokens = words(raw)
  const text = tokens.join(' ')

  if (!text) return remember({ id: 'empty', segments: toSegments(pick('empty', FALLBACKS.empty)) })

  if (FOLLOW_UP.has(text)) {
    const more = followUp()
    if (more) return more
  }

  const computed = live(raw, text)
  if (computed) return remember(computed)

  // "hey, what's Momo?" → try "whats momo" first, so the greeting doesn't win.
  const core = trimFiller(tokens)
  const best = (core.length && core.length < tokens.length ? bestIntent(core) : null) ?? bestIntent(tokens)
  if (best) return remember({ id: best.id, segments: toSegments(pick(best.id, best.answers)), link: best.link })

  const kind = shape(core.length ? core.join(' ') : text)
  return remember({ id: `fallback-${kind}`, segments: toSegments(pick(`fallback-${kind}`, FALLBACKS[kind])) })
}

/** True when the intent has something new for "Tell me more". */
export function hasMore(id: string): boolean {
  const intent = byId.get(id)
  return Boolean(intent && (intent.more?.length || intent.answers.length > 1))
}

const offered = new Set<string>()

/** `count` questions to try next, not yet offered this visit, and not about `exceptId`. */
export function nextQuestions(count: number, exceptId?: string): string[] {
  const fresh = TRY_ASKING.filter(item => item.id !== exceptId && !offered.has(item.question))
  const source = fresh.length >= count ? fresh : TRY_ASKING.filter(item => item.id !== exceptId)
  const pool = [...source]
  const picked: string[] = []
  while (picked.length < count && pool.length) {
    const [item] = pool.splice(Math.floor(Math.random() * pool.length), 1)
    picked.push(item.question)
    offered.add(item.question)
  }
  return picked
}
