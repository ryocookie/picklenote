import { useState } from 'react'
import {
  MAX_COURTS,
  MIN_COURTS,
  PLAYERS_PER_COURT,
  waitingPlayers,
  type CourtGame,
  type OpenPlayer,
  type PlayerId,
  type RotationMode,
} from '../../domain/openPlay'
import { AddPlayers } from './AddPlayers'
import { CourtCard } from './CourtCard'
import { QueueList } from './QueueList'
import { useOpenPlay } from './useOpenPlay'
import './openplay.css'

export interface CourtLineup {
  teamA: [string, string]
  teamB: [string, string]
}

interface OpenPlayPageProps {
  onScore: (lineup: CourtLineup) => void
}

const MODES: readonly { id: RotationMode; label: string; hint: string }[] = [
  { id: 'order', label: '順番', hint: '待ち列の先頭から4人が入ります' },
  { id: 'random', label: 'ランダム', hint: '試合数が少ない人を優先して、ランダムに選びます' },
]

export function OpenPlayPage({ onScore }: OpenPlayPageProps) {
  const op = useOpenPlay()
  const { state, version } = op
  const [shuffleVersion, setShuffleVersion] = useState(0)

  const playerOf = (id: PlayerId): OpenPlayer | undefined => state.players.find((p) => p.id === id)
  const waiting = waitingPlayers(state)
  const available = waiting.filter((p) => !p.isResting).length
  const emptyCourts = state.courts.filter((c) => c === null).length
  const canFill = emptyCourts > 0 && available >= PLAYERS_PER_COURT
  const onCourtCount = state.courts.reduce((n, c) => n + (c ? PLAYERS_PER_COURT : 0), 0)
  const isFirstTime = state.players.length === 0

  const toLineup = (game: CourtGame): CourtLineup => {
    const name = (id: PlayerId) => playerOf(id)?.name ?? '?'
    const [a1, a2] = game.teamA
    const [b1, b2] = game.teamB
    return { teamA: [name(a1), name(a2)], teamB: [name(b1), name(b2)] }
  }

  const shuffle = () => {
    op.shuffle()
    setShuffleVersion((v) => v + 1)
  }

  return (
    <div className="openplay">
      <header className="openplay-hero">
        <h1 className="openplay-title">
          <span>OPEN</span>
          <span>PLAY</span>
        </h1>
        <p className="openplay-lede">集まったメンバーでコートを回す、練習会の順番係。終わったら「試合終了」を押すだけで次の4人が決まります。</p>
      </header>

      <section className="op-panel" aria-label="設定">
        <div className="op-setting">
          <span className="op-setting-label">コート数</span>
          <div className="stepper">
            <button type="button" onClick={() => op.courts(state.courts.length - 1)} disabled={state.courts.length <= MIN_COURTS} aria-label="コートを減らす">
              −
            </button>
            <output aria-live="polite">{state.courts.length}</output>
            <button type="button" onClick={() => op.courts(state.courts.length + 1)} disabled={state.courts.length >= MAX_COURTS} aria-label="コートを増やす">
              +
            </button>
          </div>
        </div>
        <div className="op-setting">
          <span className="op-setting-label">決め方</span>
          <div className="op-modes" role="radiogroup" aria-label="組み合わせの決め方">
            {MODES.map((m) => (
              <button key={m.id} type="button" role="radio" aria-checked={state.mode === m.id} onClick={() => op.mode(m.id)}>
                {m.id === 'random' && <i className="dice" aria-hidden="true" />}
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <p className="op-mode-hint">{MODES.find((m) => m.id === state.mode)?.hint}。同じペアはなるべく続かないように組みます。</p>
      </section>

      <section className="op-section" aria-labelledby="op-courts">
        <h2 id="op-courts" className="op-heading">
          <span>ON COURT</span>
          <small>
            {state.players.length}人参加 · プレー中{onCourtCount}人
          </small>
        </h2>
        <div className="court-cards">
          {state.courts.map((game, i) => (
            <CourtCard
              key={i}
              index={i}
              game={game}
              version={version}
              playerOf={playerOf}
              playersNeeded={Math.max(0, PLAYERS_PER_COURT - available)}
              onFinish={() => op.finish(i)}
              onScore={() => game && onScore(toLineup(game))}
            />
          ))}
        </div>
        {canFill && (
          <button type="button" className="cta op-fill" onClick={op.fill}>
            {state.mode === 'random' ? 'ランダムで組み合わせる' : '組み合わせを決める'}
          </button>
        )}
      </section>

      <section className="op-section" aria-labelledby="op-queue">
        <h2 id="op-queue" className="op-heading">
          <span>NEXT UP</span>
          <small>待ち {waiting.length}人</small>
        </h2>
        {waiting.length > 1 && (
          <button type="button" className="op-shuffle" onClick={shuffle}>
            <i className="dice" aria-hidden="true" /> 待ち順をランダムに並べ替える
          </button>
        )}
        <QueueList players={waiting} mode={state.mode} shuffleVersion={shuffleVersion} onRest={op.rest} onRemove={op.remove} />
        <AddPlayers onAdd={op.add} isFirstTime={isFirstTime} />
      </section>

      <div className="toolbar">
        <button type="button" className="tool tool-undo" onClick={op.undo} disabled={!op.canUndo}>
          <span aria-hidden="true">↶</span> 1つ戻す
        </button>
        <button
          type="button"
          className="tool"
          onClick={() => {
            if (confirm('参加者と試合数をすべて消して、最初からやり直しますか？')) op.reset()
          }}
          disabled={isFirstTime}
        >
          リセット
        </button>
      </div>
    </div>
  )
}

