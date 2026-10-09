import type { MatchRecord } from '../../domain/history'

interface HistoryListProps {
  records: readonly MatchRecord[]
  onRemove: (id: string) => void
}

const dayFormat = new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' })
const timeFormat = new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit' })

function groupByDay(records: readonly MatchRecord[]): [string, MatchRecord[]][] {
  const groups = new Map<string, MatchRecord[]>()
  for (const r of records) {
    const day = dayFormat.format(r.finishedAt)
    groups.set(day, [...(groups.get(day) ?? []), r])
  }
  return [...groups.entries()]
}

function formatLabel(r: MatchRecord): string {
  const kind = r.format === 'doubles' ? 'ダブルス' : 'シングルス'
  return r.bestOf === 1 ? `${kind} · ${r.targetScore}点` : `${kind} · 3ゲームマッチ`
}

function HistoryCard({ record, onRemove }: { record: MatchRecord; onRemove: () => void }) {
  return (
    <article className={`hist-card win-${record.winner}`}>
      <header className="hist-head">
        <time dateTime={new Date(record.finishedAt).toISOString()}>{timeFormat.format(record.finishedAt)}</time>
        <span className="hist-kind">{formatLabel(record)}</span>
        <button
          type="button"
          className="hist-remove"
          aria-label="この試合の記録を削除"
          onClick={() => {
            if (confirm('この試合の記録を削除しますか？')) onRemove()
          }}
        >
          ×
        </button>
      </header>
      <div className="hist-body">
        {(['A', 'B'] as const).map((team) => (
          <div key={team} className={`hist-team team-${team} ${record.winner === team ? 'is-winner' : ''}`}>
            <span className="hist-names">{record.teams[team].players.join('・')}</span>
            <span className="hist-scores">
              {record.games.map((g, i) => (
                <b key={i} className={g.winner === team ? 'is-won' : ''}>
                  {g.score[team]}
                </b>
              ))}
            </span>
            <span className="hist-win-slot">{record.winner === team && <span className="hist-win">WIN</span>}</span>
          </div>
        ))}
      </div>
    </article>
  )
}

export function HistoryList({ records, onRemove }: HistoryListProps) {
  return (
    <div className="hist">
      {groupByDay(records).map(([day, items]) => (
        <section key={day} className="hist-day">
          <h3 className="hist-date">
            {day}
            <small>{items.length}試合</small>
          </h3>
          {items.map((r) => (
            <HistoryCard key={r.id} record={r} onRemove={() => onRemove(r.id)} />
          ))}
        </section>
      ))}
    </div>
  )
}
