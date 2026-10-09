import { useMemo, useState } from 'react'
import { computeStats, filterByPeriod, type Period } from '../../domain/history'
import { usePersistentState } from '../../lib/usePersistentState'
import { HistoryList } from './HistoryList'
import { Leaderboard } from './Leaderboard'
import { useMatchHistory } from './useMatchHistory'
import './stats.css'

type View = 'ranking' | 'history'

const PERIODS: readonly { id: Period; label: string }[] = [
  { id: 'today', label: '今日' },
  { id: 'week', label: '7日間' },
  { id: 'all', label: '全期間' },
]

const VIEWS: readonly { id: View; label: string }[] = [
  { id: 'ranking', label: '成績' },
  { id: 'history', label: '試合履歴' },
]

interface StatsPageProps {
  onGoScore: () => void
}

export function StatsPage({ onGoScore }: StatsPageProps) {
  const { records, remove, clear } = useMatchHistory()
  const [storedPeriod, setPeriod] = usePersistentState<Period>('stats-period', 'all')
  // Stored preferences are untrusted: fall back if the value is not a known period.
  const period: Period = PERIODS.some((p) => p.id === storedPeriod) ? storedPeriod : 'all'
  const [view, setView] = useState<View>('ranking')
  // Captured once per visit so "today" does not shift while the page is open.
  const [now] = useState(() => Date.now())

  const filtered = useMemo(() => filterByPeriod(records, period, now), [records, period, now])
  const stats = useMemo(() => computeStats(filtered), [filtered])
  const leader = stats[0]

  return (
    <div className="stats">
      <header className="stats-hero">
        <h1 className="stats-title">
          <span>STATS</span>
          <span>&amp; LOG</span>
        </h1>
        <p className="stats-lede">スコア画面で最後までつけた試合は、ここに自動で記録されます。データはこの端末の中だけに保存されます。</p>
      </header>

      {records.length === 0 ? (
        <div className="stats-empty">
          <p className="stats-empty-title">まだ記録がありません</p>
          <p>試合の勝敗が決まると、成績と履歴がここに貯まっていきます。練習会のコートから「スコアをつける」で始めた試合も記録されます。</p>
          <button type="button" className="cta" onClick={onGoScore}>
            スコアをつけに行く
          </button>
        </div>
      ) : (
        <>
          <div className="stats-controls">
            <div className="chips" role="radiogroup" aria-label="期間">
              {PERIODS.map((p) => (
                <button key={p.id} type="button" role="radio" aria-checked={period === p.id} onClick={() => setPeriod(p.id)}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="stats-tabs" role="tablist" aria-label="表示">
              {VIEWS.map((v) => (
                <button key={v.id} type="button" role="tab" aria-selected={view === v.id} onClick={() => setView(v.id)}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <dl className="stats-summary">
            <div>
              <dt>試合</dt>
              <dd>{filtered.length}</dd>
            </div>
            <div>
              <dt>プレイヤー</dt>
              <dd>{stats.length}</dd>
            </div>
            <div className="is-leader">
              <dt>トップ</dt>
              <dd>{leader ? leader.name : '—'}</dd>
            </div>
          </dl>

          {filtered.length === 0 ? (
            <p className="stats-none">この期間の試合はありません</p>
          ) : view === 'ranking' ? (
            <>
              <Leaderboard key={period} stats={stats} />
              <p className="stats-note">勝ち数 → 勝率 → 得失点差の順に並べています。名前をタップすると詳細を表示します。</p>
            </>
          ) : (
            <HistoryList records={filtered} onRemove={remove} />
          )}

          <div className="toolbar">
            <button
              type="button"
              className="tool"
              onClick={() => {
                if (confirm(`すべての試合記録（${records.length}件）を削除しますか？元に戻せません。`)) clear()
              }}
            >
              記録をすべて削除
            </button>
          </div>
        </>
      )}
    </div>
  )
}
