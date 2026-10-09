import { winRate, type PlayerStats } from '../../domain/history'

interface LeaderboardProps {
  stats: readonly PlayerStats[]
}

const PARTNER_LIMIT = 5

const percent = (s: PlayerStats): string => `${Math.round(winRate(s) * 100)}%`

function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n)
}

function streakLabel(s: PlayerStats): string | null {
  if (!s.streak || s.streak.count < 2) return null
  return s.streak.result === 'W' ? `${s.streak.count}連勝中` : `${s.streak.count}連敗中`
}

function PlayerDetail({ s }: { s: PlayerStats }) {
  const avgFor = s.matches ? (s.pointsFor / s.matches).toFixed(1) : '0'
  const avgAgainst = s.matches ? (s.pointsAgainst / s.matches).toFixed(1) : '0'
  return (
    <div className="lb-detail">
      <dl className="lb-facts">
        <div>
          <dt>ゲーム</dt>
          <dd>
            {s.gamesWon}-{s.gamesLost}
          </dd>
        </div>
        <div>
          <dt>総得点 / 失点</dt>
          <dd>
            {s.pointsFor} / {s.pointsAgainst}
          </dd>
        </div>
        <div>
          <dt>1試合平均</dt>
          <dd>
            {avgFor} - {avgAgainst}
          </dd>
        </div>
      </dl>

      <div className="lb-form" aria-label="直近の結果（新しい順）">
        <span className="lb-sub">直近</span>
        {s.form.map((r, i) => (
          <i key={i} className={r === 'W' ? 'is-win' : 'is-loss'}>
            {r}
          </i>
        ))}
      </div>

      {s.partners.length > 0 && (
        <div className="lb-partners">
          <span className="lb-sub">パートナー別</span>
          <ul>
            {s.partners.slice(0, PARTNER_LIMIT).map((p) => (
              <li key={p.name}>
                <span className="lb-partner-name">{p.name}</span>
                <span className="lb-partner-rec">
                  {p.wins}勝{p.matches - p.wins}敗
                </span>
                <span className="lb-partner-bar" aria-hidden="true">
                  <i style={{ width: `${(p.wins / p.matches) * 100}%` }} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function Leaderboard({ stats }: LeaderboardProps) {
  return (
    <ol className="lb">
      {stats.map((s, i) => {
        const streak = streakLabel(s)
        const diff = s.pointsFor - s.pointsAgainst
        return (
          <li key={s.name} className="lb-row" style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}>
            <details>
              <summary>
                <span className={`lb-rank ${i < 3 ? `is-top is-top-${i + 1}` : ''}`}>{i + 1}</span>
                <span className="lb-main">
                  <span className="lb-name">
                    {s.name}
                    {streak && <em className={s.streak?.result === 'W' ? 'is-hot' : ''}>{streak}</em>}
                  </span>
                  <span className="lb-bar" aria-hidden="true">
                    <i style={{ width: percent(s) }} />
                  </span>
                </span>
                <span className="lb-record">
                  <span className="lb-wl">
                    <b>{s.wins}</b>勝<b>{s.losses}</b>敗
                  </span>
                  <small>
                    {percent(s)} · {signed(diff)}
                  </small>
                </span>
              </summary>
              <PlayerDetail s={s} />
            </details>
          </li>
        )
      })}
    </ol>
  )
}
