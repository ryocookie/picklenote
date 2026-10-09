// Open play (drop-in session) rotation for doubles.
// Waiting players form a queue; when a game ends its four players go to the back
// and the freed court is refilled from the queue.
//
// - 'order':  the first four available players in the queue go on.
// - 'random': players with the fewest games go first; ties are broken randomly,
//             so nobody is left waiting indefinitely.
// In both modes the four are split into teams that repeat past partners as little as possible.

export type Rng = () => number
export type RotationMode = 'order' | 'random'
export type PlayerId = string

export const MIN_COURTS = 1
export const MAX_COURTS = 8
export const PLAYERS_PER_COURT = 4
export const MAX_PLAYER_NAME_LENGTH = 12

export interface OpenPlayer {
  id: PlayerId
  name: string
  gamesPlayed: number
  isResting: boolean
}

export interface CourtGame {
  teamA: readonly [PlayerId, PlayerId]
  teamB: readonly [PlayerId, PlayerId]
}

export interface OpenPlayState {
  mode: RotationMode
  players: readonly OpenPlayer[]
  // Waiting players in order (never includes players on court).
  queue: readonly PlayerId[]
  courts: readonly (CourtGame | null)[]
  // How many times each pair has partnered, keyed by sorted "id|id".
  partners: Readonly<Record<string, number>>
  nextId: number
}

const clampCourts = (n: number): number => Math.min(MAX_COURTS, Math.max(MIN_COURTS, Math.round(n)))

export function createOpenPlay(courtCount: number, mode: RotationMode): OpenPlayState {
  return {
    mode,
    players: [],
    queue: [],
    courts: Array.from({ length: clampCourts(courtCount) }, () => null),
    partners: {},
    nextId: 1,
  }
}

const pairKey = (a: PlayerId, b: PlayerId): string => (a < b ? `${a}|${b}` : `${b}|${a}`)

export const partnerCount = (state: OpenPlayState, a: PlayerId, b: PlayerId): number => state.partners[pairKey(a, b)] ?? 0

const playerById = (state: OpenPlayState, id: PlayerId): OpenPlayer | undefined => state.players.find((p) => p.id === id)

export function waitingPlayers(state: OpenPlayState): OpenPlayer[] {
  return state.queue.map((id) => playerById(state, id)).filter((p): p is OpenPlayer => p !== undefined)
}

export function playersOnCourt(court: CourtGame): PlayerId[] {
  return [...court.teamA, ...court.teamB]
}

// Fisher–Yates on a copy.
function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function addPlayers(state: OpenPlayState, names: readonly string[]): OpenPlayState {
  const existing = new Set(state.players.map((p) => p.name.toLowerCase()))
  let nextId = state.nextId
  const added: OpenPlayer[] = []
  for (const raw of names) {
    const name = raw.trim().slice(0, MAX_PLAYER_NAME_LENGTH)
    const key = name.toLowerCase()
    if (!name || existing.has(key)) continue
    existing.add(key)
    added.push({ id: `p${nextId}`, name, gamesPlayed: 0, isResting: false })
    nextId += 1
  }
  if (added.length === 0) return state
  return {
    ...state,
    players: [...state.players, ...added],
    queue: [...state.queue, ...added.map((p) => p.id)],
    nextId,
  }
}

export function removePlayer(state: OpenPlayState, id: PlayerId): OpenPlayState {
  if (!state.queue.includes(id)) return state
  return {
    ...state,
    players: state.players.filter((p) => p.id !== id),
    queue: state.queue.filter((q) => q !== id),
  }
}

export function toggleRest(state: OpenPlayState, id: PlayerId): OpenPlayState {
  if (!state.queue.includes(id)) return state
  return { ...state, players: state.players.map((p) => (p.id === id ? { ...p, isResting: !p.isResting } : p)) }
}

export const setMode = (state: OpenPlayState, mode: RotationMode): OpenPlayState => ({ ...state, mode })

export function shuffleQueue(state: OpenPlayState, rng: Rng): OpenPlayState {
  return { ...state, queue: shuffled(state.queue, rng) }
}

function pickFour(state: OpenPlayState, rng: Rng): PlayerId[] | null {
  const available = waitingPlayers(state).filter((p) => !p.isResting)
  if (available.length < PLAYERS_PER_COURT) return null
  if (state.mode === 'order') return available.slice(0, PLAYERS_PER_COURT).map((p) => p.id)

  const byGames = [...available].sort((a, b) => a.gamesPlayed - b.gamesPlayed)
  const threshold = byGames[PLAYERS_PER_COURT - 1].gamesPlayed
  const mustPlay = byGames.filter((p) => p.gamesPlayed < threshold)
  const tied = shuffled(
    byGames.filter((p) => p.gamesPlayed === threshold),
    rng,
  )
  return [...mustPlay, ...tied].slice(0, PLAYERS_PER_COURT).map((p) => p.id)
}

function splitTeams(state: OpenPlayState, [a, b, c, d]: PlayerId[], rng: Rng): CourtGame {
  const options: CourtGame[] = [
    { teamA: [a, b], teamB: [c, d] },
    { teamA: [a, c], teamB: [b, d] },
    { teamA: [a, d], teamB: [b, c] },
  ]
  const cost = (g: CourtGame) => partnerCount(state, ...g.teamA) + partnerCount(state, ...g.teamB)
  const best = Math.min(...options.map(cost))
  const candidates = options.filter((g) => cost(g) === best)
  if (state.mode === 'order') return candidates[0]
  return candidates[Math.floor(rng() * candidates.length)]
}

// Puts players on every empty court while at least four are available.
export function fillCourts(state: OpenPlayState, rng: Rng): OpenPlayState {
  return state.courts.reduce<OpenPlayState>((acc, court, index) => {
    if (court) return acc
    const four = pickFour(acc, rng)
    if (!four) return acc
    const game = splitTeams(acc, four, rng)
    return {
      ...acc,
      queue: acc.queue.filter((id) => !four.includes(id)),
      courts: acc.courts.map((c, i) => (i === index ? game : c)),
    }
  }, state)
}

export function finishCourt(state: OpenPlayState, courtIndex: number, rng: Rng): OpenPlayState {
  const court = state.courts[courtIndex]
  if (!court) return state
  const ids = playersOnCourt(court)
  const partners = { ...state.partners }
  for (const [x, y] of [court.teamA, court.teamB]) partners[pairKey(x, y)] = (partners[pairKey(x, y)] ?? 0) + 1

  const finished: OpenPlayState = {
    ...state,
    players: state.players.map((p) => (ids.includes(p.id) ? { ...p, gamesPlayed: p.gamesPlayed + 1 } : p)),
    queue: [...state.queue, ...ids],
    courts: state.courts.map((c, i) => (i === courtIndex ? null : c)),
    partners,
  }
  return fillCourts(finished, rng)
}

export function setCourtCount(state: OpenPlayState, count: number): OpenPlayState {
  const n = clampCourts(count)
  if (n >= state.courts.length) {
    return { ...state, courts: [...state.courts, ...Array.from({ length: n - state.courts.length }, () => null)] }
  }
  // Players on removed courts did not finish; put them back at the front.
  const returning = state.courts.slice(n).flatMap((c) => (c ? playersOnCourt(c) : []))
  return { ...state, courts: state.courts.slice(0, n), queue: [...returning, ...state.queue] }
}
