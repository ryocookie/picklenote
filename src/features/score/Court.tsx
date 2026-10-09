import { useRef } from 'react'
import { playerSide, serverSide, type GameState, type PlayerIndex, type Side, type TeamId } from '../../domain/scoring'
import {
  COURT_LENGTH,
  COURT_WIDTH,
  FAR_KITCHEN_Y,
  NEAR_KITCHEN_Y,
  NET_Y,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  line,
  project,
  rect,
  type Point,
} from './courtGeometry'
import { useServeFlight } from './useServeFlight'
import './court.css'

interface CourtProps {
  game: GameState
  turn: number
}

type Role = 'server' | 'receiver' | null

interface Token {
  key: string
  team: TeamId
  name: string
  role: Role
  at: Point
}

const BEHIND_BASELINE = 2.5
const NET_HEIGHT_PX = 15
const CONTACT_HEIGHT_PX = 14
const SERVE_ARC_LIFT_PX = 64
const MIN_LABEL_SCALE = 0.95
const LANDING_DEPTH = 7 // feet from the far/near baseline where the serve lands

// Team A plays the near half (facing up), Team B the far half (facing down),
// so Team B's right side is on the screen's left.
function courtX(team: TeamId, side: Side): number {
  const isScreenRight = (team === 'A') === (side === 'right')
  return isScreenRight ? COURT_WIDTH * 0.75 : COURT_WIDTH * 0.25
}

const courtY = (team: TeamId): number => (team === 'A' ? COURT_LENGTH + BEHIND_BASELINE : -BEHIND_BASELINE)

function buildTokens(game: GameState): Token[] {
  const active = serverSide(game)
  const roleOf = (team: TeamId): Role => (team === game.servingTeam ? 'server' : 'receiver')

  return (['A', 'B'] as const).flatMap((team) => {
    const { players } = game.config.teams[team]
    if (game.config.format === 'singles') {
      return [{ key: `${team}0`, team, name: players[0] ?? '', role: roleOf(team), at: project(courtX(team, active), courtY(team)) }]
    }
    return ([0, 1] as const).map((p: PlayerIndex) => {
      const side = playerSide(game, team, p)
      const isServer = team === game.servingTeam && p === game.server
      const isReceiver = team !== game.servingTeam && side === active
      return {
        key: `${team}${p}`,
        team,
        name: players[p] ?? '',
        role: isServer ? 'server' : isReceiver ? 'receiver' : null,
        at: project(courtX(team, side), courtY(team)),
      }
    })
  })
}

// Rough label width: full-width glyphs ≈ 1em, ASCII ≈ 0.6em.
const labelWidth = (text: string): number =>
  [...text].reduce((w, ch) => w + (ch.charCodeAt(0) > 0xff ? 12 : 7.2), 0) + 16

function PlayerToken({ token }: { token: Token }) {
  const { at, role, team, name } = token
  const width = labelWidth(name)
  return (
    <g className={`token team-${team} ${role ?? 'idle'}`} style={{ transform: `translate(${at.x}px, ${at.y}px)` }}>
      <ellipse className="token-shadow" rx={17 * at.scale} ry={5 * at.scale} />
      <g style={{ transform: `scale(${at.scale})` }}>
        {role === 'server' && <circle className="token-pulse" cy={-16} r={16} />}
        <circle className="token-body" cy={-16} r={15} />
        <text className="token-initial" y={-11}>
          {[...name][0] ?? '?'}
        </text>
      </g>
      {/* Labels keep a readable minimum size even on the far side. */}
      <g style={{ transform: `translateY(${-40 * at.scale}px) scale(${Math.max(at.scale, MIN_LABEL_SCALE)})` }}>
        <g className="token-label" transform="translate(0 -6)">
          <rect x={-width / 2} y={-11} width={width} height={20} rx={10} />
          <text y={4}>{name}</text>
        </g>
      </g>
    </g>
  )
}

function Net() {
  const left = project(0, NET_Y)
  const right = project(COURT_WIDTH, NET_Y)
  const h = NET_HEIGHT_PX * left.scale
  return (
    <g className="net">
      <polygon points={`${left.x - 6},${left.y} ${right.x + 6},${right.y} ${right.x + 6},${right.y - h} ${left.x - 6},${left.y - h}`} />
      <line className="net-tape" x1={left.x - 6} y1={left.y - h} x2={right.x + 6} y2={right.y - h} />
      <line className="net-post" x1={left.x - 6} y1={left.y + 1} x2={left.x - 6} y2={left.y - h - 2} />
      <line className="net-post" x1={right.x + 6} y1={right.y + 1} x2={right.x + 6} y2={right.y - h - 2} />
    </g>
  )
}

export function Court({ game, turn }: CourtProps) {
  const ballRef = useRef<SVGCircleElement>(null)
  const shadowRef = useRef<SVGEllipseElement>(null)

  const tokens = buildTokens(game)
  const server = tokens.find((t) => t.team === game.servingTeam && t.role === 'server')
  const serverAt = server?.at ?? project(COURT_WIDTH / 2, courtY(game.servingTeam))

  const isNearServing = game.servingTeam === 'A'
  const serverCourtX = courtX(game.servingTeam, serverSide(game))
  const landingX = COURT_WIDTH - serverCourtX
  const landingY = isNearServing ? LANDING_DEPTH : COURT_LENGTH - LANDING_DEPTH
  const landing = project(landingX, landingY)
  const from = { ...serverAt, y: serverAt.y - CONTACT_HEIGHT_PX * serverAt.scale }
  const control = { x: (from.x + landing.x) / 2, y: Math.min(from.y, landing.y) - SERVE_ARC_LIFT_PX }
  const arc = `M${from.x},${from.y} Q${control.x},${control.y} ${landing.x},${landing.y}`

  useServeFlight(ballRef, shadowRef, { from, control, to: landing, groundFrom: serverAt }, turn)

  // Diagonal service box the serve must land in.
  const targetBox = isNearServing
    ? rect(landingX < COURT_WIDTH / 2 ? 0 : COURT_WIDTH / 2, 0, landingX < COURT_WIDTH / 2 ? COURT_WIDTH / 2 : COURT_WIDTH, FAR_KITCHEN_Y)
    : rect(landingX < COURT_WIDTH / 2 ? 0 : COURT_WIDTH / 2, NEAR_KITCHEN_Y, landingX < COURT_WIDTH / 2 ? COURT_WIDTH / 2 : COURT_WIDTH, COURT_LENGTH)

  const far = tokens.filter((t) => t.team === 'B')
  const near = tokens.filter((t) => t.team === 'A')

  return (
    <figure className="court" aria-label="コート上の位置とサーブの方向">
      {/* Labelled by the figure; the drawing itself is decorative for screen readers. */}
      <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} aria-hidden="true">
        <defs>
          <linearGradient id="surface" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#174d36" />
            <stop offset="1" stopColor="#226b4b" />
          </linearGradient>
          <pattern id="mesh" width="4" height="4" patternUnits="userSpaceOnUse">
            <path d="M0 0L4 4M4 0L0 4" stroke="rgb(241 244 234 / 35%)" strokeWidth="0.6" />
          </pattern>
          <radialGradient id="ball-fill" cx="0.35" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#f9ffc2" />
            <stop offset="0.55" stopColor="#e4ff3a" />
            <stop offset="1" stopColor="#a9bf14" />
          </radialGradient>
        </defs>

        <polygon fill="url(#surface)" points={rect(0, 0, COURT_WIDTH, COURT_LENGTH)} />
        <polygon className="kitchen" points={rect(0, FAR_KITCHEN_Y, COURT_WIDTH, NEAR_KITCHEN_Y)} />
        <polygon className="target-box" key={`target-${turn}`} points={targetBox} />

        <g className="lines">
          <polygon points={rect(0, 0, COURT_WIDTH, COURT_LENGTH)} />
          <line {...line(0, FAR_KITCHEN_Y, COURT_WIDTH, FAR_KITCHEN_Y)} />
          <line {...line(0, NEAR_KITCHEN_Y, COURT_WIDTH, NEAR_KITCHEN_Y)} />
          <line {...line(COURT_WIDTH / 2, 0, COURT_WIDTH / 2, FAR_KITCHEN_Y)} />
          <line {...line(COURT_WIDTH / 2, NEAR_KITCHEN_Y, COURT_WIDTH / 2, COURT_LENGTH)} />
        </g>

        <text className="kitchen-label" x={VIEW_WIDTH / 2} y={project(0, (NET_Y + NEAR_KITCHEN_Y) / 2).y + 4}>
          KITCHEN
        </text>

        {far.map((t) => (
          <PlayerToken key={t.key} token={t} />
        ))}
        <Net />
        <path className="serve-arc" key={`arc-${turn}`} d={arc} pathLength={1} />
        <circle className="landing" key={`land-${turn}`} cx={landing.x} cy={landing.y} r={10 * landing.scale} />
        {near.map((t) => (
          <PlayerToken key={t.key} token={t} />
        ))}
        <ellipse ref={shadowRef} className="ball-shadow" />
        <circle ref={ballRef} className="ball" fill="url(#ball-fill)" />
      </svg>
      <figcaption className="court-legend">
        <span>
          <i className="swatch target" /> サーブを入れるエリア
        </span>
        <span>
          <i className="swatch kitchen" /> キッチン
        </span>
      </figcaption>
    </figure>
  )
}
