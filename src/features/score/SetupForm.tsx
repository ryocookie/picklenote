import { useState, type FormEvent, type ReactNode } from 'react'
import { BEST_OF_OPTIONS, type BestOf } from '../../domain/match'
import { TARGET_SCORES, type Format, type GameConfig, type TargetScore, type TeamId } from '../../domain/scoring'
import './setup.css'

interface SetupFormProps {
  initial?: { config: GameConfig; bestOf: BestOf }
  onStart: (config: GameConfig, bestOf: BestOf) => void
}

interface TeamDraft {
  name: string
  right: string
  left: string
}

const DEFAULT_TEAMS: Record<TeamId, TeamDraft> = {
  A: { name: 'チームA', right: 'Aさん', left: 'Bさん' },
  B: { name: 'チームB', right: 'Cさん', left: 'Dさん' },
}

const MAX_NAME_LENGTH = 12

const MATCH_OPTIONS: Record<BestOf, { en: string; ja: string; hint: string }> = {
  1: { en: '1 GAME', ja: '1ゲームで決着', hint: '練習・フリープレー向け' },
  3: { en: 'BEST OF 3', ja: '2ゲーム先取', hint: '試合・大会形式' },
}

const FORMATS: readonly { id: Format; en: string; ja: string; dots: number }[] = [
  { id: 'doubles', en: 'DOUBLES', ja: 'ダブルス 2対2', dots: 2 },
  { id: 'singles', en: 'SINGLES', ja: 'シングルス 1対1', dots: 1 },
]

function toDraft(config: GameConfig | undefined, team: TeamId): TeamDraft {
  if (!config) return DEFAULT_TEAMS[team]
  const t = config.teams[team]
  return { name: t.name, right: t.players[0] ?? '', left: t.players[1] ?? DEFAULT_TEAMS[team].left }
}

const orDefault = (value: string, fallback: string): string => value.trim() || fallback

function Step({ index, en, title, children }: { index: number; en: string; title: string; children: ReactNode }) {
  return (
    <fieldset className="step" style={{ animationDelay: `${index * 70}ms` }}>
      <legend className="step-head">
        <span className="step-index">{String(index).padStart(2, '0')}</span>
        <span className="step-en">{en}</span>
        <span className="step-title">{title}</span>
      </legend>
      {children}
    </fieldset>
  )
}

export function SetupForm({ initial, onStart }: SetupFormProps) {
  const base = initial?.config
  const [format, setFormat] = useState<Format>(base?.format ?? 'doubles')
  const [targetScore, setTargetScore] = useState<TargetScore>(base?.targetScore ?? 11)
  const [bestOf, setBestOf] = useState<BestOf>(initial?.bestOf ?? 1)
  const [firstServingTeam, setFirstServingTeam] = useState<TeamId>(base?.firstServingTeam ?? 'A')
  const [teams, setTeams] = useState<Record<TeamId, TeamDraft>>({ A: toDraft(base, 'A'), B: toDraft(base, 'B') })

  const isDoubles = format === 'doubles'

  const updateTeam = (team: TeamId, field: keyof TeamDraft, value: string) =>
    setTeams((prev) => ({ ...prev, [team]: { ...prev[team], [field]: value } }))

  const displayName = (team: TeamId): string =>
    isDoubles ? orDefault(teams[team].name, DEFAULT_TEAMS[team].name) : orDefault(teams[team].right, DEFAULT_TEAMS[team].right)

  const buildTeam = (team: TeamId) => {
    const draft = teams[team]
    const fallback = DEFAULT_TEAMS[team]
    const right = orDefault(draft.right, fallback.right)
    return {
      name: displayName(team),
      players: isDoubles ? [right, orDefault(draft.left, fallback.left)] : [right],
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onStart({ format, targetScore, firstServingTeam, teams: { A: buildTeam('A'), B: buildTeam('B') } }, bestOf)
  }

  return (
    <form className="setup" onSubmit={handleSubmit}>
      <header className="setup-hero">
        <h1 className="setup-title">
          <span>NEW</span>
          <span>
            GAME<i className="setup-ball" aria-hidden="true" />
          </span>
        </h1>
        <p className="setup-lede">
          5つ決めたら、コートへ。
          <br />
          得点もサーブ位置もアプリが案内します。
        </p>
      </header>

      <Step index={1} en="FORMAT" title="形式">
        <div className="format-grid">
          {FORMATS.map((f) => (
            <button key={f.id} type="button" className="format-tile" aria-pressed={format === f.id} onClick={() => setFormat(f.id)}>
              <span className="format-dots" aria-hidden="true">
                <span className="format-side">
                  {Array.from({ length: f.dots }, (_, i) => (
                    <i key={i} className="dot team-a" />
                  ))}
                </span>
                <span className="format-net" />
                <span className="format-side">
                  {Array.from({ length: f.dots }, (_, i) => (
                    <i key={i} className="dot team-b" />
                  ))}
                </span>
              </span>
              <span className="format-en">{f.en}</span>
              <span className="format-ja">{f.ja}</span>
            </button>
          ))}
        </div>
      </Step>

      <Step index={2} en="GAME POINT" title="何点先取？">
        <div className="points">
          {TARGET_SCORES.map((s) => (
            <button key={s} type="button" className="point-chip" aria-pressed={targetScore === s} onClick={() => setTargetScore(s)}>
              <span className="point-num">{s}</span>
              {s === 11 && <span className="point-tag">定番</span>}
            </button>
          ))}
        </div>
        <p className="step-hint">2点差がつくまで続きます（10-10なら12点まで）</p>
      </Step>

      <Step index={3} en="MATCH" title="試合の長さ">
        <div className="format-grid">
          {BEST_OF_OPTIONS.map((n) => (
            <button key={n} type="button" className="format-tile" aria-pressed={bestOf === n} onClick={() => setBestOf(n)}>
              <span className="match-pip-row" aria-hidden="true">
                {Array.from({ length: n }, (_, i) => (
                  <i key={i} />
                ))}
              </span>
              <span className="format-en">{MATCH_OPTIONS[n].en}</span>
              <span className="format-ja">
                {MATCH_OPTIONS[n].ja}・{MATCH_OPTIONS[n].hint}
              </span>
            </button>
          ))}
        </div>
        <p className="step-hint">ゲームの合間と、最終ゲームの折り返し（11点なら6点）でコートチェンジを知らせます</p>
      </Step>

      <Step index={4} en="PLAYERS" title={isDoubles ? 'チームと立ち位置' : 'プレイヤー'}>
        <div className="teams">
          {(['A', 'B'] as const).map((team) => (
            <div key={team} className={`team-panel team-${team}`}>
              <div className="team-panel-head">
                <span className="team-chip">{team === 'A' ? 'TEAM A' : 'TEAM B'}</span>
                {isDoubles && (
                  <input
                    className="team-name-input"
                    aria-label={`チーム${team}の名前`}
                    value={teams[team].name}
                    onChange={(e) => updateTeam(team, 'name', e.target.value)}
                    maxLength={MAX_NAME_LENGTH}
                  />
                )}
              </div>

              {isDoubles ? (
                <div className="half-court" aria-label="ベースライン側から見たスタート位置">
                  <span className="half-court-net" aria-hidden="true">
                    NET
                  </span>
                  <label className="slot">
                    <span className="slot-side">左</span>
                    <input value={teams[team].left} onChange={(e) => updateTeam(team, 'left', e.target.value)} maxLength={MAX_NAME_LENGTH} />
                  </label>
                  <label className="slot slot-right">
                    <span className="slot-side">
                      右 <em>ここから最初のサーブ</em>
                    </span>
                    <input value={teams[team].right} onChange={(e) => updateTeam(team, 'right', e.target.value)} maxLength={MAX_NAME_LENGTH} />
                  </label>
                </div>
              ) : (
                <label className="slot slot-solo">
                  <span className="slot-side">名前</span>
                  <input value={teams[team].right} onChange={(e) => updateTeam(team, 'right', e.target.value)} maxLength={MAX_NAME_LENGTH} />
                </label>
              )}
            </div>
          ))}
        </div>
        {isDoubles && <p className="step-hint">ネットに向かって立ったときの左右です</p>}
      </Step>

      <Step index={5} en="FIRST SERVE" title="最初にサーブするのは？">
        <div className="serve-pick">
          {(['A', 'B'] as const).map((team) => (
            <button
              key={team}
              type="button"
              className={`serve-option team-${team}`}
              aria-pressed={firstServingTeam === team}
              onClick={() => setFirstServingTeam(team)}
            >
              <i className="serve-ball" aria-hidden="true" />
              <span>{displayName(team)}</span>
            </button>
          ))}
        </div>
        <p className="step-hint">迷ったらじゃんけんやコイントスで決めましょう</p>
      </Step>

      <button type="submit" className="cta setup-cta">
        試合開始
      </button>
    </form>
  )
}
