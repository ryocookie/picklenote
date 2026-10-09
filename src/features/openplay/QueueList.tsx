import { PLAYERS_PER_COURT, type OpenPlayer, type PlayerId, type RotationMode } from '../../domain/openPlay'

interface QueueListProps {
  players: readonly OpenPlayer[]
  mode: RotationMode
  shuffleVersion: number
  onRest: (id: PlayerId) => void
  onRemove: (id: PlayerId) => void
}

// In order mode the next four available players are known in advance.
function nextUpIds(players: readonly OpenPlayer[], mode: RotationMode): Set<PlayerId> {
  if (mode !== 'order') return new Set()
  return new Set(
    players
      .filter((p) => !p.isResting)
      .slice(0, PLAYERS_PER_COURT)
      .map((p) => p.id),
  )
}

export function QueueList({ players, mode, shuffleVersion, onRest, onRemove }: QueueListProps) {
  if (players.length === 0) {
    return <p className="queue-empty">待っている人はいません</p>
  }

  const nextUp = nextUpIds(players, mode)
  // Number only players who are actually in line; resting players keep their spot but get no number.
  const positions = new Map(
    players.filter((p) => !p.isResting).map((p, i) => [p.id, i + 1] as const),
  )
  const fewest = Math.min(...players.filter((p) => !p.isResting).map((p) => p.gamesPlayed))

  return (
    <ol className="queue" key={shuffleVersion}>
      {players.map((p, i) => {
        const isNext = nextUp.has(p.id)
        const isPriority = mode === 'random' && !p.isResting && p.gamesPlayed === fewest
        return (
          <li
            key={p.id}
            className={`queue-item ${isNext ? 'is-next' : ''} ${p.isResting ? 'is-resting' : ''}`}
            style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
          >
            <span className="queue-pos">{positions.get(p.id) ?? '–'}</span>
            <span className="queue-name">{p.name}</span>
            {isNext && <span className="queue-tag">NEXT</span>}
            {isPriority && <span className="queue-tag is-soft">優先</span>}
            {p.isResting && <span className="queue-tag is-rest">休憩中</span>}
            <span className="queue-games">{p.gamesPlayed}試合</span>
            <button type="button" className="queue-btn" onClick={() => onRest(p.id)} aria-label={`${p.name}を${p.isResting ? '復帰' : '休憩'}にする`}>
              {p.isResting ? '復帰' : '休憩'}
            </button>
            <button type="button" className="queue-btn is-remove" onClick={() => onRemove(p.id)} aria-label={`${p.name}を外す`}>
              ×
            </button>
          </li>
        )
      })}
    </ol>
  )
}
