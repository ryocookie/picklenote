// Match layer on top of a single game (USA Pickleball rule 5.B).
// - Teams change ends and initial service after each game.
// - Mid-game end change happens only at the midpoint of the last game
//   (or of the only game in a single-game match).

import { createGame, otherTeam, recordRally, type GameConfig, type GameState, type TeamId } from './scoring'

export const BEST_OF_OPTIONS = [1, 3] as const
export type BestOf = (typeof BEST_OF_OPTIONS)[number]

export type MatchNotice = 'switch-ends'

export interface GameResult {
  score: Readonly<Record<TeamId, number>>
  winner: TeamId
}

export interface MatchState {
  // Stable identity, used to link a finished match to its history record.
  id: string
  bestOf: BestOf
  // Games already closed with startNextGame.
  results: readonly GameResult[]
  game: GameState
  hasSwitchedEnds: boolean
  // Set only by the rally that triggered it.
  notice: MatchNotice | null
}

export const switchEndsAt = (targetScore: number): number => Math.ceil(targetScore / 2)

const gamesToWin = (bestOf: BestOf): number => Math.floor(bestOf / 2) + 1

export function createMatch(config: GameConfig, bestOf: BestOf, id = ''): MatchState {
  return { id, bestOf, results: [], game: createGame(config), hasSwitchedEnds: false, notice: null }
}

export const currentGameNumber = (match: MatchState): number => match.results.length + 1

export const isDecidingGame = (match: MatchState): boolean => currentGameNumber(match) === match.bestOf

export function gamesWon(match: MatchState, team: TeamId): number {
  const closed = match.results.filter((r) => r.winner === team).length
  return closed + (match.game.winner === team ? 1 : 0)
}

export function matchWinner(match: MatchState): TeamId | null {
  const needed = gamesToWin(match.bestOf)
  if (gamesWon(match, 'A') >= needed) return 'A'
  if (gamesWon(match, 'B') >= needed) return 'B'
  return null
}

export function recordMatchRally(match: MatchState, rallyWinner: TeamId): MatchState {
  if (match.game.winner) return match
  const game = recordRally(match.game, rallyWinner)
  const leadingScore = Math.max(game.score.A, game.score.B)
  const shouldSwitch =
    isDecidingGame(match) && !match.hasSwitchedEnds && !game.winner && leadingScore >= switchEndsAt(game.config.targetScore)
  return {
    ...match,
    game,
    hasSwitchedEnds: match.hasSwitchedEnds || shouldSwitch,
    notice: shouldSwitch ? 'switch-ends' : null,
  }
}

export function startNextGame(match: MatchState): MatchState {
  const { winner, score, config } = match.game
  if (!winner || matchWinner(match)) return match
  const nextConfig = { ...config, firstServingTeam: otherTeam(config.firstServingTeam) }
  return {
    ...match,
    results: [...match.results, { score, winner }],
    game: createGame(nextConfig),
    hasSwitchedEnds: false,
    notice: null,
  }
}
