import { describe, expect, test } from 'vitest'
import {
  createMatch,
  currentGameNumber,
  gamesWon,
  isDecidingGame,
  matchWinner,
  recordMatchRally,
  startNextGame,
  switchEndsAt,
  type MatchState,
} from './match'
import type { GameConfig, TeamId } from './scoring'

const config: GameConfig = {
  format: 'doubles',
  targetScore: 11,
  firstServingTeam: 'A',
  teams: {
    A: { name: 'A', players: ['A1', 'A2'] },
    B: { name: 'B', players: ['B1', 'B2'] },
  },
}

const rallies = (match: MatchState, winners: TeamId[]): MatchState => winners.reduce(recordMatchRally, match)

// `team` wins every rally of a fresh game: one side out if needed, then 11 straight points.
const winGame = (match: MatchState, team: TeamId): MatchState => {
  const sideOut: TeamId[] = match.game.servingTeam === team ? [] : [team]
  return rallies(match, [...sideOut, ...Array<TeamId>(11).fill(team)])
}
const winGameAsA = (match: MatchState): MatchState => winGame(match, 'A')
const winGameAsB = (match: MatchState): MatchState => winGame(match, 'B')

describe('switchEndsAt', () => {
  test('is the midpoint of the target score', () => {
    expect(switchEndsAt(11)).toBe(6)
    expect(switchEndsAt(15)).toBe(8)
    expect(switchEndsAt(21)).toBe(11)
  })
})

describe('single game match', () => {
  test('is decided by one game', () => {
    const match = winGameAsA(createMatch(config, 1))

    expect(matchWinner(match)).toBe('A')
  })

  test('announces an end switch when the first team reaches the midpoint', () => {
    const at5 = rallies(createMatch(config, 1), Array<TeamId>(5).fill('A'))
    expect(at5.notice).toBeNull()

    const at6 = recordMatchRally(at5, 'A')
    expect(at6.notice).toBe('switch-ends')
    expect(at6.hasSwitchedEnds).toBe(true)

    const at7 = recordMatchRally(at6, 'A')
    expect(at7.notice).toBeNull()
  })

  test('does not announce the end switch twice in the same game', () => {
    const at6 = rallies(createMatch(config, 1), Array<TeamId>(6).fill('A'))
    // A's only server loses (side out), then B climbs to 6 as well.
    const bAt6 = rallies(at6, ['B', ...Array<TeamId>(6).fill('B')])

    expect(bAt6.game.score.B).toBe(6)
    expect(bAt6.notice).toBeNull()
  })
})

describe('best of three', () => {
  test('a game win does not end the match', () => {
    const match = winGameAsA(createMatch(config, 3))

    expect(match.game.winner).toBe('A')
    expect(matchWinner(match)).toBeNull()
    expect(gamesWon(match, 'A')).toBe(1)
  })

  test('only the deciding game switches ends mid-game', () => {
    const game1 = createMatch(config, 3)
    expect(isDecidingGame(game1)).toBe(false)

    const at6 = rallies(game1, Array<TeamId>(6).fill('A'))
    expect(at6.notice).toBeNull()
  })

  test('next game resets the score and the other team serves first', () => {
    const next = startNextGame(winGameAsA(createMatch(config, 3)))

    expect(currentGameNumber(next)).toBe(2)
    expect(next.game.score).toEqual({ A: 0, B: 0 })
    expect(next.game.servingTeam).toBe('B')
    expect(next.results).toEqual([{ score: { A: 11, B: 0 }, winner: 'A' }])
  })

  test('rallies are ignored once the current game is won', () => {
    const won = winGameAsA(createMatch(config, 3))

    expect(recordMatchRally(won, 'B')).toBe(won)
  })

  test('cannot start a next game before the current one is finished', () => {
    const match = createMatch(config, 3)

    expect(startNextGame(match)).toBe(match)
  })

  test('game three is the deciding game and switches ends at 6', () => {
    const game2 = startNextGame(winGameAsA(createMatch(config, 3)))
    const game3 = startNextGame(winGameAsB(game2))

    expect(currentGameNumber(game3)).toBe(3)
    expect(isDecidingGame(game3)).toBe(true)
    expect(game3.game.servingTeam).toBe('A')

    const at6 = rallies(game3, Array<TeamId>(6).fill('A'))
    expect(at6.notice).toBe('switch-ends')
  })

  test('two game wins take the match and no further game can start', () => {
    const won = winGameAsA(startNextGame(winGameAsA(createMatch(config, 3))))

    expect(matchWinner(won)).toBe('A')
    expect(startNextGame(won)).toBe(won)
  })
})
