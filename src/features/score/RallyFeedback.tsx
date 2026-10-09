import { currentGameNumber, switchEndsAt, type MatchState } from '../../domain/match'
import type { Format, RallyEvent } from '../../domain/scoring'

interface Feedback {
  stamp: string
  title: string
  detail: string
}

const DOUBLES: Record<RallyEvent, Feedback> = {
  point: { stamp: 'POINT', title: '得点！', detail: 'サーバーはパートナーと左右を入れ替えて、続けてサーブします。' },
  'second-server': {
    stamp: '2ND SERVER',
    title: 'パートナーに交代',
    detail: 'サーブ側のミス。点は動かず、2人目のサーバーが今いる位置からサーブします。',
  },
  'side-out': { stamp: 'SIDE OUT', title: 'サイドアウト', detail: 'サーブ権が相手チームへ。右サイドにいる人からサーブします。' },
}

const SINGLES: Record<RallyEvent, Feedback> = {
  ...DOUBLES,
  point: { stamp: 'POINT', title: '得点！', detail: '自分の得点が偶数なら右、奇数なら左からサーブします。' },
  'side-out': { stamp: 'SIDE OUT', title: 'サイドアウト', detail: 'サーブ権が相手へ。点は動きません。' },
}

const FIRST_GAME: Record<Format, Feedback> = {
  doubles: {
    stamp: 'GAME ON',
    title: '「0-0-2」でスタート',
    detail: '最初にサーブするチームだけは1人目のミスで即サイドアウト。だから「2人目」から数えます。',
  },
  singles: { stamp: 'GAME ON', title: '「0-0」でスタート', detail: '得点できるのはサーブ側だけ。偶数なら右、奇数なら左からサーブ。' },
}

function feedbackFor(match: MatchState): Feedback {
  const { game } = match
  const gameNumber = currentGameNumber(match)

  if (match.notice === 'switch-ends') {
    return {
      stamp: 'SWITCH ENDS',
      title: 'コートチェンジ',
      detail: `どちらかが${switchEndsAt(game.config.targetScore)}点に到達。両チームとも反対側のコートへ移動します。サーブは今のサーバーのまま続けます。`,
    }
  }
  if (!game.lastEvent && gameNumber > 1) {
    const server = game.config.teams[game.servingTeam].name
    return {
      stamp: `GAME ${gameNumber}`,
      title: `第${gameNumber}ゲーム開始`,
      detail: `エンドを交代して、最初のサーブは${server}から。${game.config.format === 'doubles' ? 'また「0-0-2」から数えます。' : ''}`,
    }
  }
  if (!game.lastEvent) return FIRST_GAME[game.config.format]
  return (game.config.format === 'doubles' ? DOUBLES : SINGLES)[game.lastEvent]
}

interface Props {
  match: MatchState
  turn: number
}

// Big broadcast-style stamp that flashes over the court after each rally.
export function RallyStamp({ match, turn }: Props) {
  const { stamp } = feedbackFor(match)
  const tone = match.notice ?? match.game.lastEvent ?? 'start'
  return (
    <p className={`stamp stamp-${tone}`} key={turn} aria-hidden="true">
      {stamp}
    </p>
  )
}

export function RallyNote({ match, turn }: Props) {
  const { title, detail } = feedbackFor(match)
  return (
    <div className={`note ${match.notice ? 'note-alert' : ''}`} key={turn} role="status">
      <p className="note-title">{title}</p>
      <p className="note-detail">{detail}</p>
    </div>
  )
}
