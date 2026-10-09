import { currentGameNumber, gamesWon, isDecidingGame, type MatchState } from '../../domain/match'

interface MatchStripProps {
  match: MatchState
}

// Game counter and per-team game wins. Hidden for single-game matches.
export function MatchStrip({ match }: MatchStripProps) {
  if (match.bestOf === 1) return null
  const { teams } = match.game.config
  const needed = Math.floor(match.bestOf / 2) + 1

  return (
    <section className="match-strip" aria-label="マッチの状況">
      <p className="match-game">
        <span className="match-game-label">GAME</span>
        <span className="match-game-num">{currentGameNumber(match)}</span>
        <span className="match-game-of">/ {match.bestOf}</span>
        {isDecidingGame(match) && <span className="match-final">FINAL</span>}
      </p>
      <ul className="match-teams">
        {(['A', 'B'] as const).map((team) => {
          const won = gamesWon(match, team) - (match.game.winner === team ? 1 : 0)
          return (
            <li key={team} className={`match-team team-${team}`}>
              <span className="match-team-name">{teams[team].name}</span>
              <span className="match-pips" aria-label={`${won}ゲーム獲得`}>
                {Array.from({ length: needed }, (_, i) => (
                  <i key={i} className={i < won ? 'is-won' : ''} />
                ))}
              </span>
            </li>
          )
        })}
      </ul>
      {match.results.length > 0 && (
        <ol className="match-history" aria-label="これまでのゲーム">
          {match.results.map((r, i) => (
            <li key={i}>
              <span>G{i + 1}</span>
              <b className={`team-${r.winner}`}>{r.score[r.winner]}</b>-{r.score[r.winner === 'A' ? 'B' : 'A']}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
