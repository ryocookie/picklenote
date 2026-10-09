// Pickleball side-out scoring (USA Pickleball rules).
// Only the serving team can score. Doubles uses a 3-number call
// (serving score - receiving score - server number) and starts at 0-0-2.

export type TeamId = 'A' | 'B'
export type Format = 'singles' | 'doubles'
export type Side = 'right' | 'left'
export type PlayerIndex = 0 | 1
export type RallyEvent = 'point' | 'second-server' | 'side-out'

export const TARGET_SCORES = [11, 15, 21] as const
export type TargetScore = (typeof TARGET_SCORES)[number]

const WIN_BY = 2

export interface TeamConfig {
  name: string
  // players[0] starts on the right (even) side of the court.
  players: readonly string[]
}

export interface GameConfig {
  format: Format
  targetScore: TargetScore
  firstServingTeam: TeamId
  teams: Readonly<Record<TeamId, TeamConfig>>
}

export interface GameState {
  config: GameConfig
  score: Readonly<Record<TeamId, number>>
  servingTeam: TeamId
  serverNumber: 1 | 2
  // Player index (per team) currently standing on the right side. Doubles only.
  rightPlayer: Readonly<Record<TeamId, PlayerIndex>>
  // Player index within the serving team who is serving.
  server: PlayerIndex
  winner: TeamId | null
  lastEvent: RallyEvent | null
}

export const otherTeam = (team: TeamId): TeamId => (team === 'A' ? 'B' : 'A')

const otherPlayer = (p: PlayerIndex): PlayerIndex => (p === 0 ? 1 : 0)

export function createGame(config: GameConfig): GameState {
  return {
    config,
    score: { A: 0, B: 0 },
    servingTeam: config.firstServingTeam,
    // First service turn of a doubles game has only one server: "0-0-2".
    serverNumber: config.format === 'doubles' ? 2 : 1,
    rightPlayer: { A: 0, B: 0 },
    server: 0,
    winner: null,
    lastEvent: null,
  }
}

function isWinningScore(own: number, opponent: number, target: number): boolean {
  return own >= target && own - opponent >= WIN_BY
}

function scorePoint(state: GameState): GameState {
  const team = state.servingTeam
  const score = { ...state.score, [team]: state.score[team] + 1 }
  // Server switches sides with partner after each point won.
  const rightPlayer = { ...state.rightPlayer, [team]: otherPlayer(state.rightPlayer[team]) }
  const won = isWinningScore(score[team], score[otherTeam(team)], state.config.targetScore)
  return { ...state, score, rightPlayer, winner: won ? team : null, lastEvent: 'point' }
}

function sideOut(state: GameState): GameState {
  const next = otherTeam(state.servingTeam)
  const isDoubles = state.config.format === 'doubles'
  return {
    ...state,
    servingTeam: next,
    serverNumber: 1,
    // After a side out, the player on the right side serves first.
    server: isDoubles ? state.rightPlayer[next] : 0,
    lastEvent: 'side-out',
  }
}

function passToSecondServer(state: GameState): GameState {
  return { ...state, serverNumber: 2, server: otherPlayer(state.server), lastEvent: 'second-server' }
}

export function recordRally(state: GameState, rallyWinner: TeamId): GameState {
  if (state.winner) return state
  if (rallyWinner === state.servingTeam) return scorePoint(state)
  if (state.config.format === 'doubles' && state.serverNumber === 1) return passToSecondServer(state)
  return sideOut(state)
}

// Side of the court the server serves from.
export function serverSide(state: GameState): Side {
  if (state.config.format === 'singles') {
    return state.score[state.servingTeam] % 2 === 0 ? 'right' : 'left'
  }
  return state.rightPlayer[state.servingTeam] === state.server ? 'right' : 'left'
}

// Side each player of a team is standing on (doubles).
export function playerSide(state: GameState, team: TeamId, player: PlayerIndex): Side {
  return state.rightPlayer[team] === player ? 'right' : 'left'
}

export function scoreCall(state: GameState): string {
  const serving = state.score[state.servingTeam]
  const receiving = state.score[otherTeam(state.servingTeam)]
  if (state.config.format === 'singles') return `${serving}-${receiving}`
  return `${serving}-${receiving}-${state.serverNumber}`
}

export function serverName(state: GameState): string {
  return state.config.teams[state.servingTeam].players[state.server] ?? ''
}
