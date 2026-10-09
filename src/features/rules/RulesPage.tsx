import { useMemo, useState } from 'react'
import { RuleFigure } from './RuleFigures'
import { RULE_SECTIONS, type RuleSection } from './rulesData'
import './rules.css'

function filterSections(query: string): readonly RuleSection[] {
  const q = query.trim().toLowerCase()
  if (!q) return RULE_SECTIONS
  return RULE_SECTIONS.map((section) => ({
    ...section,
    items: `${section.title} ${section.en}`.toLowerCase().includes(q)
      ? section.items
      : section.items.filter((item) => `${item.title} ${item.body}`.toLowerCase().includes(q)),
  })).filter((section) => section.items.length > 0)
}

const chapterNumber = (id: string): string => String(RULE_SECTIONS.findIndex((s) => s.id === id) + 1).padStart(2, '0')

export function RulesPage() {
  const [query, setQuery] = useState('')
  const sections = useMemo(() => filterSections(query), [query])
  const isSearching = query.trim() !== ''

  return (
    <div className="rules">
      <header className="rules-hero">
        <h1 className="rules-title">
          <span>RULE</span>
          <span>BOOK</span>
        </h1>
        <p className="rules-lede">
          はじめての人が最初に覚えることを、
          <br />
          {RULE_SECTIONS.length}つの章にまとめました。<mark>まず覚える</mark>から読めばOK。
        </p>
      </header>

      <div className="rules-toolbar">
        <label className="rules-search">
          <span className="visually-hidden">ルールを検索</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4.5 4.5" />
          </svg>
          <input type="search" placeholder="キッチン、サーブ、フォルト…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        {!isSearching && (
          <nav className="rules-toc" aria-label="章">
            {RULE_SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`}>
                <span>{chapterNumber(s.id)}</span>
                {s.title}
              </a>
            ))}
          </nav>
        )}
      </div>

      {sections.length === 0 && (
        <p className="rules-empty">
          「{query}」に一致するルールはありません。
          <br />
          別の言葉で探してみてください。
        </p>
      )}

      {sections.map((section) => (
        <section key={section.id} id={section.id} className="chapter" aria-labelledby={`${section.id}-title`}>
          <header className="chapter-head">
            <span className="chapter-num" aria-hidden="true">
              {chapterNumber(section.id)}
            </span>
            <div>
              <p className="chapter-en">{section.en}</p>
              <h2 id={`${section.id}-title`} className="chapter-title">
                {section.title}
              </h2>
              <p className="chapter-lede">{section.lede}</p>
            </div>
          </header>

          {section.figure && !isSearching && <RuleFigure id={section.figure} />}

          <div className="chapter-items">
            {section.items.map((item) => (
              <details key={item.title} className="rule" open={isSearching || item.isEssential}>
                <summary>
                  <span className="rule-title">{item.title}</span>
                  {item.isEssential && <span className="rule-badge">まず覚える</span>}
                  <span className="rule-toggle" aria-hidden="true" />
                </summary>
                <p className="rule-body">{item.body}</p>
              </details>
            ))}
          </div>
        </section>
      ))}

      <p className="rules-note">
        USA Pickleball の公式ルールをもとに、初心者向けに要約しています。大会に出るときは最新の公式ルールブックを確認してください。
      </p>
    </div>
  )
}
