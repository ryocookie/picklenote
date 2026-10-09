import { describe, expect, test } from 'vitest'
import {
  createGame,
  playerSide,
  recordRally,
  scoreCall,
  serverName,
  serverSide,
  type GameConfig,
  type GameState,
  type TeamId,
} from './scoring'

const doublesConfig: GameConfig = {
  format: 'doubles',
  targetScore: 11,
  firstServingTeam: 'A',
  teams: {
    A: { name: 'A', players: ['A1', 'A2'] },
    B: { name: 'B', players: ['B1', 'B2'] },
  },
}

const singlesConfig: GameConfig = {
  format: 'singles',
  targetScore: 11,
  firstServingTeam: 'A',
  teams: {
    A: { name: 'A', players: ['Alice'] },
    B: { name: 'B', players: ['Bob'] },
  },
}

const play = (state: GameState, winners: TeamId[]): GameState => winners.reduce(recordRally, state)

describe('doubles', () => {
  test('starts at 0-0-2 with the right-side player of the first team serving from the right', () => {
    const game = createGame(doublesConfig)

    expect(scoreCall(game)).toBe('0-0-2')
    expect(serverName(game)).toBe('A1')
    expect(serverSide(game)).toBe('right')
  })

  test('first service turn ends in a side out after one lost rally', () => {
    const game = play(createGame(doublesConfig), ['B'])

    expect(game.servingTeam).toBe('B')
    expect(scoreCall(game)).toBe('0-0-1')
    expect(serverName(game)).toBe('B1')
    expect(game.lastEvent).toBe('side-out')
  })

  test('winning a rally scores a point and the server switches sides with partner', () => {
    const game = play(createGame(doublesConfig), ['A'])

    expect(scoreCall(game)).toBe('1-0-2')
    expect(serverName(game)).toBe('A1')
    expect(serverSide(game)).toBe('left')
    expect(playerSide(game, 'A', 1)).toBe('right')
    expect(playerSide(game, 'B', 0)).toBe('right')
  })

  test('losing a rally as server 1 passes the serve to the partner without changing positions', () => {
    // A side out → B serving 0-0-1, then B loses a rally.
    const game = play(createGame(doublesConfig), ['B', 'A'])

    expect(game.servingTeam).toBe('B')
    expect(scoreCall(game)).toBe('0-0-2')
    expect(serverName(game)).toBe('B2')
    expect(serverSide(game)).toBe('left')
    expect(game.lastEvent).toBe('second-server')
  })

  test('after a side out the player currently on the right serves first', () => {
    // A scores once (A2 moves to right), then A loses → side out to B,
    // B scores once (B2 moves right), B loses twice → side out to A.
    const game = play(createGame(doublesConfig), ['A', 'B', 'B', 'A', 'A'])

    expect(game.servingTeam).toBe('A')
    expect(scoreCall(game)).toBe('1-1-1')
    expect(serverName(game)).toBe('A2')
    expect(serverSide(game)).toBe('right')
  })

  test('receiving team never scores', () => {
    const game = play(createGame(doublesConfig), ['B', 'A', 'A'])

    expect(game.score).toEqual({ A: 0, B: 0 })
    expect(game.servingTeam).toBe('A')
  })

  test('game ends at 11 when leading by 2', () => {
    const game = play(createGame(doublesConfig), Array<TeamId>(11).fill('A'))

    expect(game.score.A).toBe(11)
    expect(game.winner).toBe('A')
  })

  test('game continues past 11 until a 2-point lead', () => {
    const base = createGame(doublesConfig)
    const tied: GameState = { ...base, score: { A: 10, B: 10 } }

    const at11 = recordRally(tied, 'A')
    expect(at11.winner).toBeNull()

    const at12 = recordRally(at11, 'A')
    expect(at12.winner).toBe('A')
  })

  test('rallies after the game is over are ignored', () => {
    const finished = play(createGame(doublesConfig), Array<TeamId>(11).fill('A'))

    expect(recordRally(finished, 'B')).toBe(finished)
  })

  test('respects a target score of 15', () => {
    const game = play(createGame({ ...doublesConfig, targetScore: 15 }), Array<TeamId>(11).fill('A'))

    expect(game.winner).toBeNull()
  })
})

describe('singles', () => {
  test('call has two numbers and the server serves from the right on an even score', () => {
    const game = createGame(singlesConfig)

    expect(scoreCall(game)).toBe('0-0')
    expect(serverSide(game)).toBe('right')
  })

  test('server serves from the left on an odd score', () => {
    const game = play(createGame(singlesConfig), ['A'])

    expect(scoreCall(game)).toBe('1-0')
    expect(serverSide(game)).toBe('left')
  })

  test('losing a rally is an immediate side out', () => {
    const game = play(createGame(singlesConfig), ['A', 'B'])

    expect(game.servingTeam).toBe('B')
    expect(scoreCall(game)).toBe('0-1')
    expect(serverName(game)).toBe('Bob')
    expect(serverSide(game)).toBe('right')
  })
})
