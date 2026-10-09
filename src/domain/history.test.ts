import { describe, expect, test } from 'vitest'
import { computeStats, filterByPeriod, toRecord, type MatchRecord } from './history'
import { createMatch, recordMatchRally, startNextGame, type MatchState } from './match'
import type { GameConfig, TeamId } from './scoring'

const doubles: GameConfig = {
  format: 'doubles',
  targetScore: 11,
  firstServingTeam: 'A',
  teams: {
    A: { name: 'たろう・はなこ', players: ['たろう', 'はなこ'] },
    B: { name: 'けん・ゆき', players: ['けん', 'ゆき'] },
  },
}

const winGame = (match: MatchState, team: TeamId): MatchState => {
  const sideOut: TeamId[] = match.game.servingTeam === team ? [] : [team]
  return [...sideOut, ...Array<TeamId>(11).fill(team)].reduce(recordMatchRally, match)
}

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.UTC(2026, 9, 9, 12)

function record(id: string, a: [string, string], b: [string, string], scores: [number, number][], finishedAt = NOW): MatchRecord {
  const games = scores.map(([sa, sb]) => ({ score: { A: sa, B: sb }, winner: (sa > sb ? 'A' : 'B') as TeamId }))
  const winsA = games.filter((g) => g.winner === 'A').length
  return {
    id,
    finishedAt,
    format: 'doubles',
    targetScore: 11,
    bestOf: scores.length > 1 ? 3 : 1,
    teams: { A: { name: a.join('・'), players: a }, B: { name: b.join('・'), players: b } },
    games,
    winner: winsA * 2 > games.length ? 'A' : 'B',
  }
}

describe('toRecord', () => {
  test('returns null while the match is undecided', () => {
    const match = createMatch(doubles, 3, 'm1')

    expect(toRecord(winGame(match, 'A'), NOW)).toBeNull()
  })

  test('captures every game of a finished best-of-three', () => {
    const g1 = winGame(createMatch(doubles, 3, 'm1'), 'A')
    const g2 = winGame(startNextGame(g1), 'B')
    const done = winGame(startNextGame(g2), 'A')

    const rec = toRecord(done, NOW)

    expect(rec).not.toBeNull()
    expect(rec!.id).toBe('m1')
    expect(rec!.winner).toBe('A')
    expect(rec!.games.map((g) => g.winner)).toEqual(['A', 'B', 'A'])
    expect(rec!.teams.A.players).toEqual(['たろう', 'はなこ'])
  })
})

describe('computeStats', () => {
  const records = [
    record('1', ['たろう', 'はなこ'], ['けん', 'ゆき'], [[11, 7]], NOW - 3000),
    record('2', ['たろう', 'けん'], ['はなこ', 'ゆき'], [[9, 11]], NOW - 2000),
    record('3', ['たろう', 'はなこ'], ['けん', 'ゆき'], [[11, 5], [8, 11], [11, 9]], NOW - 1000),
  ]

  test('counts wins, losses, games and points per player', () => {
    const taro = computeStats(records).find((s) => s.name === 'たろう')!

    expect(taro.matches).toBe(3)
    expect(taro.wins).toBe(2)
    expect(taro.losses).toBe(1)
    expect(taro.gamesWon).toBe(1 + 0 + 2)
    expect(taro.gamesLost).toBe(0 + 1 + 1)
    expect(taro.pointsFor).toBe(11 + 9 + (11 + 8 + 11))
    expect(taro.pointsAgainst).toBe(7 + 11 + (5 + 11 + 9))
  })

  test('recent form lists the newest result first and tracks the current streak', () => {
    const taro = computeStats(records).find((s) => s.name === 'たろう')!

    expect(taro.form).toEqual(['W', 'L', 'W'])
    expect(taro.streak).toEqual({ result: 'W', count: 1 })
  })

  test('aggregates partner records', () => {
    const taro = computeStats(records).find((s) => s.name === 'たろう')!

    expect(taro.partners).toEqual([
      { name: 'はなこ', matches: 2, wins: 2 },
      { name: 'けん', matches: 1, wins: 0 },
    ])
  })

  test('ranks by wins, then win rate, then point difference', () => {
    const ranking = computeStats(records).map((s) => s.name)

    // たろう 2-1, はなこ 3-0, けん 0-3, ゆき 1-2
    expect(ranking).toEqual(['はなこ', 'たろう', 'ゆき', 'けん'])
  })

  test('treats names that differ only by spacing or width as the same player', () => {
    const stats = computeStats([
      record('1', [' たろう', 'はなこ'], ['けん', 'ゆき'], [[11, 2]]),
      record('2', ['たろう ', 'はなこ'], ['けん', 'ゆき'], [[11, 2]]),
      record('3', ['ＡＢＣ', 'はなこ'], ['abc', 'ゆき'], [[11, 2]]),
    ])

    expect(stats.find((s) => s.name === 'たろう')?.matches).toBe(2)
    expect(stats.filter((s) => s.name.toLowerCase() === 'abc')).toHaveLength(1)
  })

  test('returns no players for no records', () => {
    expect(computeStats([])).toEqual([])
  })
})

describe('filterByPeriod', () => {
  const records = [
    record('today', ['a', 'b'], ['c', 'd'], [[11, 1]], NOW - 60 * 60 * 1000),
    record('3days', ['a', 'b'], ['c', 'd'], [[11, 1]], NOW - 3 * DAY),
    record('old', ['a', 'b'], ['c', 'd'], [[11, 1]], NOW - 30 * DAY),
  ]

  test('keeps everything for all time', () => {
    expect(filterByPeriod(records, 'all', NOW).map((r) => r.id)).toEqual(['today', '3days', 'old'])
  })

  test('keeps the last seven days', () => {
    expect(filterByPeriod(records, 'week', NOW).map((r) => r.id)).toEqual(['today', '3days'])
  })

  test('keeps only matches since local midnight for today', () => {
    expect(filterByPeriod(records, 'today', NOW).map((r) => r.id)).toEqual(['today'])
  })
})
