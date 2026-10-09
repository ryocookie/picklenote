// Finished-match records and per-player statistics derived from them.

import { matchWinner, type BestOf, type GameResult, type MatchState } from './match'
import type { Format, TeamConfig, TeamId } from './scoring'

export type Result = 'W' | 'L'
export type Period = 'today' | 'week' | 'all'

const FORM_LENGTH = 5
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export interface MatchRecord {
  id: string
  finishedAt: number
  format: Format
  targetScore: number
  bestOf: BestOf
  teams: Readonly<Record<TeamId, TeamConfig>>
  games: readonly GameResult[]
  winner: TeamId
}

export interface PartnerStat {
  name: string
  matches: number
  wins: number
}

export interface PlayerStats {
  name: string
  matches: number
  wins: number
  losses: number
  gamesWon: number
  gamesLost: number
  pointsFor: number
  pointsAgainst: number
  // Newest first.
  form: readonly Result[]
  streak: { result: Result; count: number } | null
  partners: readonly PartnerStat[]
}

export function toRecord(match: MatchState, finishedAt: number): MatchRecord | null {
  const winner = matchWinner(match)
  if (!winner || !match.game.winner) return null
  const { config, score } = match.game
  return {
    id: match.id,
    finishedAt,
    format: config.format,
    targetScore: config.targetScore,
    bestOf: match.bestOf,
    teams: config.teams,
    games: [...match.results, { score, winner: match.game.winner }],
    winner,
  }
}

// "たろう " / " たろう" / full-width letters all refer to the same player.
const displayName = (raw: string): string => raw.normalize('NFKC').trim().replace(/\s+/g, ' ')
const playerKey = (raw: string): string => displayName(raw).toLowerCase()

interface Accumulator {
  name: string
  results: Result[]
  gamesWon: number
  gamesLost: number
  pointsFor: number
  pointsAgainst: number
  partners: Map<string, PartnerStat>
}

function emptyAccumulator(name: string): Accumulator {
  return { name, results: [], gamesWon: 0, gamesLost: 0, pointsFor: 0, pointsAgainst: 0, partners: new Map() }
}

function currentStreak(form: readonly Result[]): PlayerStats['streak'] {
  if (form.length === 0) return null
  const result = form[0]
  const count = form.findIndex((r) => r !== result)
  return { result, count: count === -1 ? form.length : count }
}

function toStats(acc: Accumulator): PlayerStats {
  const wins = acc.results.filter((r) => r === 'W').length
  return {
    name: acc.name,
    matches: acc.results.length,
    wins,
    losses: acc.results.length - wins,
    gamesWon: acc.gamesWon,
    gamesLost: acc.gamesLost,
    pointsFor: acc.pointsFor,
    pointsAgainst: acc.pointsAgainst,
    form: acc.results.slice(0, FORM_LENGTH),
    streak: currentStreak(acc.results),
    partners: [...acc.partners.values()].sort((a, b) => b.matches - a.matches || b.wins - a.wins),
  }
}

export const winRate = (s: Pick<PlayerStats, 'wins' | 'matches'>): number => (s.matches === 0 ? 0 : s.wins / s.matches)

function compareStats(a: PlayerStats, b: PlayerStats): number {
  return (
    b.wins - a.wins ||
    winRate(b) - winRate(a) ||
    b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst) ||
    a.name.localeCompare(b.name, 'ja')
  )
}

export function computeStats(records: readonly MatchRecord[]): PlayerStats[] {
  const byPlayer = new Map<string, Accumulator>()
  const newestFirst = [...records].sort((a, b) => b.finishedAt - a.finishedAt)

  for (const rec of newestFirst) {
    for (const team of ['A', 'B'] as const) {
      const opponent: TeamId = team === 'A' ? 'B' : 'A'
      const result: Result = rec.winner === team ? 'W' : 'L'
      const names = rec.teams[team].players.map(displayName).filter(Boolean)

      for (const name of names) {
        const key = playerKey(name)
        const acc = byPlayer.get(key) ?? emptyAccumulator(name)
        acc.results.push(result)
        for (const g of rec.games) {
          if (g.winner === team) acc.gamesWon += 1
          else acc.gamesLost += 1
          acc.pointsFor += g.score[team]
          acc.pointsAgainst += g.score[opponent]
        }
        for (const partner of names.filter((n) => playerKey(n) !== key)) {
          const pKey = playerKey(partner)
          const prev = acc.partners.get(pKey) ?? { name: partner, matches: 0, wins: 0 }
          acc.partners.set(pKey, { ...prev, matches: prev.matches + 1, wins: prev.wins + (result === 'W' ? 1 : 0) })
        }
        byPlayer.set(key, acc)
      }
    }
  }

  return [...byPlayer.values()].map(toStats).sort(compareStats)
}

function startOfLocalDay(now: number): number {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function filterByPeriod(records: readonly MatchRecord[], period: Period, now: number): MatchRecord[] {
  if (period === 'all') return [...records]
  const from = period === 'today' ? startOfLocalDay(now) : now - WEEK_MS
  return records.filter((r) => r.finishedAt >= from)
}
