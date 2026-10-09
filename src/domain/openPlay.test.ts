import { describe, expect, test } from 'vitest'
import {
  addPlayers,
  createOpenPlay,
  fillCourts,
  finishCourt,
  partnerCount,
  setCourtCount,
  shuffleQueue,
  toggleRest,
  removePlayer,
  waitingPlayers,
  type OpenPlayState,
  type Rng,
} from './openPlay'

// Deterministic RNG (mulberry32) so random behaviour is reproducible in tests.
function seeded(seed: number): Rng {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

function session(count: number, mode: 'order' | 'random' = 'order', courts = 1): OpenPlayState {
  return addPlayers(createOpenPlay(courts, mode), NAMES.slice(0, count))
}

const nameOf = (s: OpenPlayState, id: string): string => s.players.find((p) => p.id === id)?.name ?? '?'
const courtNames = (s: OpenPlayState, i: number): string[] => {
  const c = s.courts[i]
  return c ? [...c.teamA, ...c.teamB].map((id) => nameOf(s, id)).sort() : []
}

describe('adding players', () => {
  test('adds trimmed names to the end of the queue and skips blanks and duplicates', () => {
    const s = addPlayers(createOpenPlay(1, 'order'), [' A ', '', 'B', 'a', 'C'])

    expect(s.players.map((p) => p.name)).toEqual(['A', 'B', 'C'])
    expect(waitingPlayers(s).map((p) => p.name)).toEqual(['A', 'B', 'C'])
  })

  test('does not put anyone on court until courts are filled explicitly', () => {
    const s = session(4)

    expect(s.courts).toEqual([null])
  })
})

describe('order mode', () => {
  test('fills a court with the first four waiting players', () => {
    const s = fillCourts(session(6), Math.random)

    expect(courtNames(s, 0)).toEqual(['A', 'B', 'C', 'D'])
    expect(waitingPlayers(s).map((p) => p.name)).toEqual(['E', 'F'])
  })

  test('leaves a court empty when fewer than four players are available', () => {
    const s = fillCourts(session(3), Math.random)

    expect(s.courts).toEqual([null])
  })

  test('skips resting players but keeps their place in line', () => {
    const base = session(6)
    const rested = toggleRest(base, base.players[0].id)
    const s = fillCourts(rested, Math.random)

    expect(courtNames(s, 0)).toEqual(['B', 'C', 'D', 'E'])
    expect(waitingPlayers(s).map((p) => p.name)).toEqual(['A', 'F'])
  })

  test('finishing a game counts it, sends players to the back and refills the court', () => {
    const playing = fillCourts(session(6), Math.random)
    const s = finishCourt(playing, 0, Math.random)

    expect(s.players.filter((p) => p.gamesPlayed === 1).map((p) => p.name)).toEqual(['A', 'B', 'C', 'D'])
    // E and F were waiting first, then two of the finishers come back in.
    expect(courtNames(s, 0)).toEqual(expect.arrayContaining(['E', 'F']))
    expect(waitingPlayers(s)).toHaveLength(2)
  })

  test('fills several courts at once', () => {
    const s = fillCourts(session(8, 'order', 2), Math.random)

    expect(courtNames(s, 0)).toEqual(['A', 'B', 'C', 'D'])
    expect(courtNames(s, 1)).toEqual(['E', 'F', 'G', 'H'])
  })
})

describe('random mode', () => {
  test('always picks the players with the fewest games first', () => {
    // 4 players already played once, 4 have not played.
    const first = fillCourts(session(8, 'random'), seeded(1))
    const afterOne = finishCourt(first, 0, seeded(2))

    const onCourt = afterOne.courts[0]
    expect(onCourt).not.toBeNull()
    const ids = [...onCourt!.teamA, ...onCourt!.teamB]
    expect(ids.every((id) => afterOne.players.find((p) => p.id === id)?.gamesPlayed === 0)).toBe(true)
  })

  test('different seeds can produce different line-ups from the same queue', () => {
    const lineups = new Set([1, 2, 3, 4, 5, 6].map((seed) => courtNames(fillCourts(session(8, 'random'), seeded(seed)), 0).join('')))

    expect(lineups.size).toBeGreaterThan(1)
  })
})

describe('pairing', () => {
  test('avoids repeating the same partners when another split is possible', () => {
    // Exactly four players: they play twice in a row on one court.
    const g1 = fillCourts(session(4), Math.random)
    const g2 = finishCourt(g1, 0, Math.random)

    const c1 = g1.courts[0]!
    const c2 = g2.courts[0]!
    expect(partnerCount(g2, c2.teamA[0], c2.teamA[1])).toBe(0)
    expect(partnerCount(g2, c2.teamB[0], c2.teamB[1])).toBe(0)
    expect(partnerCount(g2, c1.teamA[0], c1.teamA[1])).toBe(1)
  })
})

describe('queue management', () => {
  test('shuffle keeps the same waiting players', () => {
    const s = session(8)
    const shuffled = shuffleQueue(s, seeded(7))

    expect([...shuffled.queue].sort()).toEqual([...s.queue].sort())
    expect(shuffled.queue).not.toEqual(s.queue)
  })

  test('players on court cannot be removed; waiting players can', () => {
    const s = fillCourts(session(5), Math.random)
    const onCourt = s.courts[0]!.teamA[0]
    const waiting = s.queue[0]

    expect(removePlayer(s, onCourt)).toBe(s)
    const removed = removePlayer(s, waiting)
    expect(removed.players.map((p) => p.id)).not.toContain(waiting)
    expect(removed.queue).not.toContain(waiting)
  })

  test('reducing courts returns those players to the front of the queue without counting a game', () => {
    const s = fillCourts(session(8, 'order', 2), Math.random)
    const reduced = setCourtCount(s, 1)

    expect(reduced.courts).toHaveLength(1)
    expect(waitingPlayers(reduced).map((p) => p.name).sort()).toEqual(['E', 'F', 'G', 'H'])
    expect(reduced.players.every((p) => p.gamesPlayed === 0)).toBe(true)
  })

  test('court count stays within the allowed range', () => {
    const s = session(4)

    expect(setCourtCount(s, 0).courts).toHaveLength(1)
    expect(setCourtCount(s, 99).courts.length).toBeLessThanOrEqual(8)
  })
})
