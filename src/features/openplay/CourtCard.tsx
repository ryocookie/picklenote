import type { CourtGame, OpenPlayer, PlayerId } from '../../domain/openPlay'

interface CourtCardProps {
  index: number
  game: CourtGame | null
  version: number
  playerOf: (id: PlayerId) => OpenPlayer | undefined
  playersNeeded: number
  onFinish: () => void
  onScore: () => void
}

function Pair({ ids, team, playerOf }: { ids: readonly PlayerId[]; team: 'A' | 'B'; playerOf: CourtCardProps['playerOf'] }) {
  return (
    <ul className={`pair team-${team}`}>
      {ids.map((id, i) => {
        const p = playerOf(id)
        return (
          <li key={id} className="pair-player" style={{ animationDelay: `${(team === 'A' ? 0 : 2) * 70 + i * 70}ms` }}>
            <span className="pair-name">{p?.name ?? '?'}</span>
            <span className="pair-games">{p?.gamesPlayed ?? 0}試合</span>
          </li>
        )
      })}
    </ul>
  )
}

export function CourtCard({ index, game, version, playerOf, playersNeeded, onFinish, onScore }: CourtCardProps) {
  const label = String(index + 1).padStart(2, '0')

  if (!game) {
    return (
      <article className="court-card is-empty" aria-label={`コート${index + 1}（空き）`}>
        <header className="court-card-head">
          <span className="court-card-num">{label}</span>
          <span className="court-card-state">OPEN</span>
        </header>
        <p className="court-card-empty">{playersNeeded > 0 ? `あと${playersNeeded}人そろえば組めます` : '下のボタンで組み合わせを決めましょう'}</p>
      </article>
    )
  }

  return (
    <article className="court-card" aria-label={`コート${index + 1}`}>
      <header className="court-card-head">
        <span className="court-card-num">{label}</span>
        <span className="court-card-state is-live">
          <i aria-hidden="true" /> PLAYING
        </span>
      </header>
      <div className="court-card-match" key={version}>
        <Pair ids={game.teamA} team="A" playerOf={playerOf} />
        <span className="court-card-vs" aria-label="対">
          VS
        </span>
        <Pair ids={game.teamB} team="B" playerOf={playerOf} />
      </div>
      <div className="court-card-actions">
        <button type="button" className="court-card-finish" onClick={onFinish}>
          試合終了 →
        </button>
        <button type="button" className="court-card-score" onClick={onScore}>
          スコアをつける
        </button>
      </div>
    </article>
  )
}
