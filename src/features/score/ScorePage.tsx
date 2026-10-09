import { useEffect, useRef, useState } from 'react'
import type { BestOf } from '../../domain/match'
import type { GameConfig, TeamId } from '../../domain/scoring'
import { toRecord } from '../../domain/history'
import { useSpeech } from '../../lib/useSpeech'
import { removeRecord, upsertRecord } from '../stats/useMatchHistory'
import { useWakeLock, type WakeLockStatus } from '../../lib/useWakeLock'
import { announcement, startAnnouncement } from './announcement'
import { Court } from './Court'
import { MatchStrip } from './MatchStrip'
import { RallyNote, RallyStamp } from './RallyFeedback'
import { ScoreCall } from './ScoreCall'
import { SetupForm } from './SetupForm'
import { useMatch } from './useMatch'
import { WinnerOverlay } from './WinnerOverlay'
import './score.css'

const TAP_VIBRATION_MS = 12

function haptic(): void {
  if ('vibrate' in navigator) navigator.vibrate(TAP_VIBRATION_MS)
}

const WAKE_LOCK_LABEL: Record<WakeLockStatus, string | null> = {
  locked: '試合中は画面が消えません',
  failed: '画面の自動オフを止められませんでした（省電力モードなどが原因の場合があります）',
  unsupported: null,
  idle: null,
}

// A game handed over from another screen (e.g. a court in open play).
export interface ScoreRequest {
  id: number
  config: GameConfig
  bestOf: BestOf
}

interface ScorePageProps {
  request?: ScoreRequest | null
  onRequestHandled?: () => void
  onOpenStats?: () => void
}

export function ScorePage({ request = null, onRequestHandled, onOpenStats }: ScorePageProps) {
  const { match, turn, canUndo, start, rally, nextGame, undo, reset } = useMatch()
  const [isEditing, setIsEditing] = useState(false)
  const speech = useSpeech()
  const isPlaying = match !== null && !isEditing
  const wakeLock = useWakeLock(isPlaying)
  const handledRequestId = useRef<number | null>(null)

  const begin = (config: GameConfig, bestOf: BestOf) => {
    start(config, bestOf)
    setIsEditing(false)
    window.scrollTo({ top: 0 })
  }

  // Keep the history in sync: a decided match is recorded, and undoing the winning rally removes it again.
  useEffect(() => {
    if (!match?.id) return
    const record = toRecord(match, Date.now())
    if (record) upsertRecord(record)
    else removeRecord(match.id)
  }, [match])

  useEffect(() => {
    if (!request || handledRequestId.current === request.id) return
    handledRequestId.current = request.id
    const isInProgress = match !== null && match.game.winner === null && turn > 1
    if (!isInProgress || confirm('進行中の試合を終了して、このコートの試合を始めますか？')) {
      start(request.config, request.bestOf)
      setIsEditing(false)
    }
    onRequestHandled?.()
    // Only react to a new request; match/turn are read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.id])

  if (!match || isEditing) {
    return <SetupForm initial={match ? { config: match.game.config, bestOf: match.bestOf } : undefined} onStart={begin} />
  }

  const { game } = match
  const { teams } = game.config

  const openSettings = () => {
    setIsEditing(true)
    window.scrollTo({ top: 0 })
  }

  const handleRally = (team: TeamId) => {
    haptic()
    const next = rally(team)
    if (next) speech.speak(announcement(next))
  }

  const handleNextGame = () => {
    const next = nextGame()
    if (next) speech.speak(startAnnouncement(next))
  }

  const wakeLockLabel = WAKE_LOCK_LABEL[wakeLock]

  return (
    <div className="scoreboard">
      <MatchStrip match={match} />
      <ScoreCall game={game} />

      <div className="court-wrap">
        <Court game={game} turn={turn} />
        <RallyStamp match={match} turn={turn} />
      </div>

      <div className="rally" role="group" aria-labelledby="rally-q">
        <p id="rally-q" className="rally-q">
          ラリーを取ったのは？
        </p>
        {(['A', 'B'] as const).map((team) => (
          <button
            key={team}
            type="button"
            className={`rally-btn team-${team} ${game.servingTeam === team ? 'is-serving' : ''}`}
            onClick={() => handleRally(team)}
            disabled={game.winner !== null}
          >
            <span className="rally-btn-tag">{game.servingTeam === team ? 'SERVE' : 'RETURN'}</span>
            <span className="rally-btn-name">{teams[team].name}</span>
            <span className="rally-btn-score">{game.score[team]}</span>
          </button>
        ))}
      </div>

      <RallyNote match={match} turn={turn} />

      <div className="toolbar">
        <button type="button" className="tool tool-undo" onClick={undo} disabled={!canUndo}>
          <span aria-hidden="true">↶</span> 1つ戻す
        </button>
        {speech.isSupported && (
          <button type="button" className={`tool tool-speech ${speech.isEnabled ? 'is-on' : ''}`} aria-pressed={speech.isEnabled} onClick={speech.toggle}>
            <span className="tool-speech-icon" aria-hidden="true" />
            読み上げ {speech.isEnabled ? 'ON' : 'OFF'}
          </button>
        )}
        <button type="button" className="tool" onClick={openSettings}>
          設定
        </button>
        <button
          type="button"
          className="tool"
          onClick={() => {
            if (confirm('試合を終了して記録を消しますか？')) reset()
          }}
        >
          終了
        </button>
      </div>

      {wakeLockLabel && <p className={`wake-status is-${wakeLock}`}>{wakeLockLabel}</p>}

      {game.winner && (
        <WinnerOverlay
          match={match}
          winner={game.winner}
          onNextGame={handleNextGame}
          onRematch={() => begin(game.config, match.bestOf)}
          onUndo={undo}
          onSettings={openSettings}
          onOpenStats={onOpenStats}
        />
      )}
    </div>
  )
}
