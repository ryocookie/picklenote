import { otherTeam, serverName, serverSide, type GameState } from '../../domain/scoring'

interface ScoreCallProps {
  game: GameState
}

interface CallPart {
  value: number
  label: string
  tone: 'team-A' | 'team-B' | 'server'
}

function callParts(game: GameState): CallPart[] {
  const serving = game.servingTeam
  const receiving = otherTeam(serving)
  const { teams } = game.config
  const parts: CallPart[] = [
    { value: game.score[serving], label: teams[serving].name, tone: `team-${serving}` },
    { value: game.score[receiving], label: teams[receiving].name, tone: `team-${receiving}` },
  ]
  if (game.config.format === 'doubles') parts.push({ value: game.serverNumber, label: `${game.serverNumber}人目`, tone: 'server' })
  return parts
}

export function ScoreCall({ game }: ScoreCallProps) {
  const parts = callParts(game)
  const spoken = parts.map((p) => p.value).join('-')
  const sideLabel = serverSide(game) === 'right' ? '右' : '左'

  return (
    <section className="call" aria-label={`スコアコール ${spoken}`}>
      <p className="call-kicker">
        <span>SCORE CALL</span>
        <span className="call-kicker-rule" aria-hidden="true" />
        <span>声に出してからサーブ</span>
      </p>

      <ol className="call-numbers" aria-live="polite">
        {parts.map((part, i) => (
          <li key={part.tone} className={`call-part ${part.tone}`}>
            {i > 0 && <span className="call-dash" aria-hidden="true" />}
            <span className="call-figure">
              <span className="call-digit" key={part.value}>
                {part.value}
              </span>
            </span>
            <span className="call-label">{part.label}</span>
          </li>
        ))}
      </ol>

      <p className="call-server">
        <span className="call-server-name" key={serverName(game)}>
          {serverName(game)}
        </span>
        が
        <span className={`call-side side-${serverSide(game)}`} key={sideLabel}>
          {sideLabel}サイド
        </span>
        からサーブ
      </p>
    </section>
  )
}
