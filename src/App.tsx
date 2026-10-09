import { useState, type CSSProperties } from 'react'
import type { GameConfig } from './domain/scoring'
import { OpenPlayPage, type CourtLineup } from './features/openplay/OpenPlayPage'
import { RulesPage } from './features/rules/RulesPage'
import { ScorePage, type ScoreRequest } from './features/score/ScorePage'
import { StatsPage } from './features/stats/StatsPage'
import './styles/app.css'

type Tab = 'score' | 'openplay' | 'stats' | 'rules'

const TABS: readonly { id: Tab; label: string; en: string }[] = [
  { id: 'score', label: 'スコア', en: 'SCORE' },
  { id: 'openplay', label: '練習会', en: 'OPEN PLAY' },
  { id: 'stats', label: '成績', en: 'STATS' },
  { id: 'rules', label: 'ルール', en: 'RULES' },
]

const TAGLINES: Record<Tab, string> = {
  score: 'Side-out scoring',
  openplay: 'Court rotation',
  stats: 'Records & history',
  rules: 'Rulebook for beginners',
}

function lineupToConfig({ teamA, teamB }: CourtLineup): GameConfig {
  return {
    format: 'doubles',
    targetScore: 11,
    firstServingTeam: 'A',
    teams: {
      A: { name: teamA.join('・'), players: teamA },
      B: { name: teamB.join('・'), players: teamB },
    },
  }
}

export default function App() {
  const [tab, setTab] = useState<Tab>('score')
  const [scoreRequest, setScoreRequest] = useState<ScoreRequest | null>(null)
  const activeIndex = TABS.findIndex((t) => t.id === tab)

  const goTo = (next: Tab) => {
    setTab(next)
    window.scrollTo({ top: 0 })
  }

  const scoreCourt = (lineup: CourtLineup) => {
    setScoreRequest({ id: Date.now(), config: lineupToConfig(lineup), bestOf: 1 })
    goTo('score')
  }

  return (
    <div className="app" data-tab={tab}>
      <header className="masthead">
        <p className="wordmark" aria-label="PickleNote">
          <span className="wordmark-dot" aria-hidden="true" />
          PICKLE<em>NOTE</em>
        </p>
        <p className="masthead-tag">{TAGLINES[tab]}</p>
      </header>

      <main className="stage" key={tab}>
        {tab === 'score' && <ScorePage request={scoreRequest} onRequestHandled={() => setScoreRequest(null)} onOpenStats={() => goTo('stats')} />}
        {tab === 'openplay' && <OpenPlayPage onScore={scoreCourt} />}
        {tab === 'stats' && <StatsPage onGoScore={() => goTo('score')} />}
        {tab === 'rules' && <RulesPage />}
      </main>

      <nav className="dock" aria-label="メニュー" style={{ '--active': activeIndex } as CSSProperties}>
        <span className="dock-thumb" aria-hidden="true" />
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => goTo(t.id)}
          >
            <span className="dock-en">{t.en}</span>
            <span className="dock-ja">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
