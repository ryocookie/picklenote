import type { ReactNode } from 'react'
import type { RuleFigureId } from './rulesData'

// Hand-drawn style diagrams that explain the rules visually.

const FT = 7 // px per foot in the top-down court diagram

function CourtFigure() {
  const x0 = 18
  const y0 = 34
  const w = 44 * FT
  const h = 20 * FT
  const kitchen = 7 * FT
  const mid = x0 + w / 2
  return (
    <svg viewBox="0 0 344 226" role="img" aria-label="コートの寸法図：長さ44フィート、幅20フィート、キッチンはネットから7フィート">
      <rect className="fig-surface" x={x0} y={y0} width={w} height={h} rx="2" />
      <rect className="fig-kitchen" x={mid - kitchen} y={y0} width={kitchen * 2} height={h} />
      <g className="fig-lines">
        <rect x={x0} y={y0} width={w} height={h} />
        <line x1={mid - kitchen} y1={y0} x2={mid - kitchen} y2={y0 + h} />
        <line x1={mid + kitchen} y1={y0} x2={mid + kitchen} y2={y0 + h} />
        <line x1={x0} y1={y0 + h / 2} x2={mid - kitchen} y2={y0 + h / 2} />
        <line x1={mid + kitchen} y1={y0 + h / 2} x2={x0 + w} y2={y0 + h / 2} />
      </g>
      <line className="fig-net" x1={mid} y1={y0 - 6} x2={mid} y2={y0 + h + 6} />

      <g className="fig-dim">
        <line x1={x0} y1={18} x2={x0 + w} y2={18} />
        <line x1={x0} y1={13} x2={x0} y2={23} />
        <line x1={x0 + w} y1={13} x2={x0 + w} y2={23} />
        <text x={mid} y={14}>
          44ft · 13.41m
        </text>
        <line x1={mid + kitchen} y1={y0 + h + 14} x2={mid} y2={y0 + h + 14} />
        <text x={mid + kitchen / 2} y={y0 + h + 28}>
          7ft
        </text>
      </g>
      <text className="fig-dim-v" x={x0 + w + 6} y={y0 + h / 2} transform={`rotate(90 ${x0 + w + 6} ${y0 + h / 2})`}>
        20ft · 6.10m
      </text>

      <text className="fig-label fig-label-hi" x={mid} y={y0 + h / 2 + 4}>
        KITCHEN
      </text>
      <text className="fig-label" x={x0 + (w / 2 - kitchen) / 2} y={y0 + h / 4 + 4}>
        サービスコート
      </text>
      <text className="fig-label" x={x0 + (w / 2 - kitchen) / 2} y={y0 + (h * 3) / 4 + 4}>
        サービスコート
      </text>
      <text className="fig-label fig-label-net" x={mid} y={y0 + h + 28 + 14}>
        NET
      </text>
    </svg>
  )
}

function CallFigure() {
  const parts = [
    { n: '4', label: 'サーブ側の\n得点', tone: 'serve' },
    { n: '2', label: 'レシーブ側の\n得点', tone: 'return' },
    { n: '1', label: 'サーバー番号\n（1人目 / 2人目）', tone: 'server' },
  ]
  return (
    <div className="fig-call" role="img" aria-label="スコアコール 4-2-1 の意味：サーブ側の得点、レシーブ側の得点、サーバー番号">
      {parts.map((p, i) => (
        <div key={p.tone} className={`fig-call-part ${p.tone}`}>
          {i > 0 && <span className="fig-call-dash" aria-hidden="true" />}
          <span className="fig-call-num">{p.n}</span>
          <span className="fig-call-stem" aria-hidden="true" />
          <span className="fig-call-label">{p.label}</span>
        </div>
      ))}
    </div>
  )
}

interface BounceRowProps {
  step: string
  title: string
  direction: 'right' | 'left'
  isVolley?: boolean
}

// Side view: ground, net in the middle, ball arc with its bounce.
function BounceRow({ step, title, direction, isVolley = false }: BounceRowProps) {
  const flip = direction === 'left' ? 'scale(-1 1) translate(-300 0)' : undefined
  return (
    <div className={`fig-bounce-row ${isVolley ? 'is-volley' : ''}`}>
      <span className="fig-bounce-step">{step}</span>
      <svg viewBox="0 0 300 70" aria-hidden="true">
        <line className="fig-ground" x1="6" y1="58" x2="294" y2="58" />
        <line className="fig-net" x1="150" y1="58" x2="150" y2="34" />
        <g transform={flip}>
          {isVolley ? (
            <>
              <path className="fig-ball-path" d="M40 40 Q120 4 196 26" />
              <circle className="fig-ball" cx="196" cy="26" r="5" />
              <text className="fig-mark ok" x="214" y="22">
                VOLLEY OK
              </text>
            </>
          ) : (
            <>
              <path className="fig-ball-path" d="M24 46 Q120 -6 228 58" />
              <path className="fig-ball-path" d="M228 58 Q248 30 266 40" />
              <circle className="fig-bounce-dot" cx="228" cy="58" r="4" />
              <circle className="fig-ball" cx="266" cy="40" r="5" />
            </>
          )}
        </g>
      </svg>
      <span className="fig-bounce-title">{title}</span>
    </div>
  )
}

function TwoBounceFigure() {
  return (
    <div className="fig-bounce" role="img" aria-label="サーブとリターンはワンバウンドさせて打ち、3打目以降はボレーしてよい">
      <BounceRow step="1" title="サーブ → 相手はバウンド後に返す" direction="right" />
      <BounceRow step="2" title="リターン → サーブ側もバウンド後に打つ" direction="left" />
      <BounceRow step="3+" title="ここからノーバウンドで打ってOK" direction="right" isVolley />
    </div>
  )
}

function Player({ x, isFault }: { x: number; isFault: boolean }) {
  return (
    <g className={`fig-player ${isFault ? 'fault' : 'ok'}`} transform={`translate(${x} 0)`}>
      <rect x="-8" y="38" width="16" height="30" rx="8" />
      <circle cx="0" cy="28" r="8" />
      <rect className="fig-paddle" x="7" y="20" width="10" height="15" rx="5" transform="rotate(30 12 28)" />
    </g>
  )
}

function KitchenPanel({ isFault, caption, children }: { isFault: boolean; caption: string; children: ReactNode }) {
  return (
    <div className={`fig-kitchen-panel ${isFault ? 'fault' : 'ok'}`}>
      <svg viewBox="0 0 160 84" aria-hidden="true">
        <rect className="fig-kitchen-zone" x="56" y="14" width="70" height="54" />
        <text className="fig-zone-label" x="91" y="80">
          KITCHEN
        </text>
        <line className="fig-ground" x1="4" y1="68" x2="156" y2="68" />
        <line className="fig-net" x1="126" y1="68" x2="126" y2="40" />
        {children}
      </svg>
      <p>
        <span className="fig-verdict" aria-hidden="true">
          {isFault ? '✕' : '○'}
        </span>
        {caption}
      </p>
    </div>
  )
}

function KitchenFigure() {
  return (
    <div className="fig-kitchen-grid" role="img" aria-label="キッチンの中でのボレーは反則、バウンドした後ならキッチンに入って打ってよい">
      <KitchenPanel isFault caption="キッチン内でボレー">
        <Player x={86} isFault />
        <path className="fig-ball-path" d="M158 22 Q130 4 104 22" />
        <circle className="fig-ball" cx="104" cy="22" r="4.5" />
      </KitchenPanel>
      <KitchenPanel isFault={false} caption="バウンド後なら入ってOK">
        <Player x={86} isFault={false} />
        <path className="fig-ball-path" d="M158 16 Q132 4 114 68 Q110 40 104 26" />
        <circle className="fig-bounce-dot" cx="114" cy="68" r="3.5" />
        <circle className="fig-ball" cx="104" cy="24" r="4.5" />
      </KitchenPanel>
    </div>
  )
}

const FIGURES: Record<RuleFigureId, () => ReactNode> = {
  court: CourtFigure,
  call: CallFigure,
  'two-bounce': TwoBounceFigure,
  kitchen: KitchenFigure,
}

export function RuleFigure({ id }: { id: RuleFigureId }) {
  const Figure = FIGURES[id]
  return (
    <figure className={`rule-figure rule-figure--${id}`}>
      <Figure />
    </figure>
  )
}
