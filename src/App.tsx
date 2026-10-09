import { useState, type CSSProperties } from 'react'
import { RulesPage } from './features/rules/RulesPage'
import { ScorePage } from './features/score/ScorePage'
import './styles/app.css'

type Tab = 'score' | 'rules'

const TABS: readonly { id: Tab; label: string; en: string }[] = [
  { id: 'score', label: 'スコア', en: 'SCORE' },
  { id: 'rules', label: 'ルール', en: 'RULES' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('score')
  const activeIndex = TABS.findIndex((t) => t.id === tab)

  return (
    <div className="app" data-tab={tab}>
      <header className="masthead">
        <p className="wordmark" aria-label="PickleNote">
          <span className="wordmark-dot" aria-hidden="true" />
          PICKLE<em>NOTE</em>
        </p>
        <p className="masthead-tag">{tab === 'score' ? 'Side-out scoring' : 'Rulebook for beginners'}</p>
      </header>

      <main className="stage" key={tab}>
        {tab === 'score' ? <ScorePage /> : <RulesPage />}
      </main>

      <nav className="dock" aria-label="メニュー" style={{ '--active': activeIndex } as CSSProperties}>
        <span className="dock-thumb" aria-hidden="true" />
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => {
              setTab(t.id)
              window.scrollTo({ top: 0 })
            }}
          >
            <span className="dock-en">{t.en}</span>
            <span className="dock-ja">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
