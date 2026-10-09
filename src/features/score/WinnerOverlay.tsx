import { useEffect, useRef } from 'react'
import { currentGameNumber, matchWinner, type MatchState } from '../../domain/match'
import { otherTeam, type TeamId } from '../../domain/scoring'

interface WinnerOverlayProps {
  match: MatchState
  winner: TeamId
  onNextGame: () => void
  onRematch: () => void
  onUndo: () => void
  onSettings: () => void
  onOpenStats?: () => void
}

export function WinnerOverlay({ match, winner, onNextGame, onRematch, onUndo, onSettings, onOpenStats }: WinnerOverlayProps) {
  const primaryRef = useRef<HTMLButtonElement>(null)
  const { game } = match
  const { teams } = game.config
  const loser = otherTeam(winner)
  const isMatchOver = matchWinner(match) !== null
  const gameNumber = currentGameNumber(match)
  const nextServer = teams[otherTeam(game.config.firstServingTeam)].name
  const allGames = [...match.results, { score: game.score, winner }]

  useEffect(() => primaryRef.current?.focus(), [])

  return (
    <div className={`winner team-${winner}`} role="dialog" aria-modal="true" aria-labelledby="winner-title">
      <div className="winner-rays" aria-hidden="true" />
      <p className="winner-kicker">
        {isMatchOver ? (match.bestOf === 1 ? `MATCH · ${game.config.targetScore}点ゲーム` : 'MATCH · 3ゲームマッチ') : `GAME ${gameNumber} 終了`}
      </p>
      <h2 id="winner-title" className="winner-title">
        <span className={`winner-word ${isMatchOver ? '' : 'is-game'}`} aria-hidden="true">
          {isMatchOver ? 'WIN' : 'GAME'}
        </span>
        <span className="winner-team">{teams[winner].name}</span>
        <span className="visually-hidden">{isMatchOver ? 'の勝ち' : `が第${gameNumber}ゲームを獲得`}</span>
      </h2>

      {isMatchOver && match.bestOf > 1 ? (
        <ol className="winner-games">
          {allGames.map((g, i) => (
            <li key={i}>
              <span>G{i + 1}</span>
              <b className={`team-${g.winner}`}>{g.score.A}</b>
              <i aria-hidden="true" />
              <b className={`team-${g.winner}`}>{g.score.B}</b>
            </li>
          ))}
        </ol>
      ) : (
        <p className="winner-score">
          <span>{game.score[winner]}</span>
          <span className="winner-score-sep" aria-hidden="true" />
          <span>{game.score[loser]}</span>
        </p>
      )}

      {!isMatchOver && (
        <p className="winner-next">
          エンドを交代して、第{gameNumber + 1}ゲームは<strong>{nextServer}</strong>のサーブから
        </p>
      )}

      {isMatchOver && (
        <p className="winner-saved">
          <span aria-hidden="true">✓</span> 成績に記録しました
          {onOpenStats && (
            <button type="button" className="winner-stats-link" onClick={onOpenStats}>
              成績を見る →
            </button>
          )}
        </p>
      )}

      <div className="winner-actions">
        {isMatchOver ? (
          <button ref={primaryRef} type="button" className="cta" onClick={onRematch}>
            同じメンバーで新しい試合
          </button>
        ) : (
          <button ref={primaryRef} type="button" className="cta" onClick={onNextGame}>
            第{gameNumber + 1}ゲームへ
          </button>
        )}
        <div className="winner-secondary">
          <button type="button" className="ghost" onClick={onUndo}>
            1つ戻す
          </button>
          <button type="button" className="ghost" onClick={onSettings}>
            設定を変える
          </button>
        </div>
      </div>
    </div>
  )
}
