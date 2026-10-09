import { currentGameNumber, matchWinner, type MatchState } from '../../domain/match'
import { scoreCall, type RallyEvent } from '../../domain/scoring'

const EVENT_PREFIX: Record<RallyEvent, string> = {
  point: '',
  'second-server': 'セカンドサーバー。',
  'side-out': 'サイドアウト。',
}

// Text read aloud after each rally, e.g. "サイドアウト。0、1、1。"
export function announcement(match: MatchState): string {
  const { game } = match
  const { teams } = game.config

  const champion = matchWinner(match)
  if (champion) return `ゲームセット。${teams[champion].name}の勝ちです。`
  if (game.winner) return `ゲーム。第${currentGameNumber(match)}ゲームは${teams[game.winner].name}。`

  const prefix = game.lastEvent ? EVENT_PREFIX[game.lastEvent] : ''
  const call = scoreCall(game).split('-').join('、')
  const switchEnds = match.notice === 'switch-ends' ? 'コートチェンジです。' : ''
  return `${prefix}${call}。${switchEnds}`
}

export function startAnnouncement(match: MatchState): string {
  const call = scoreCall(match.game).split('-').join('、')
  return `第${currentGameNumber(match)}ゲーム。${call}。`
}
