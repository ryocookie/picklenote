// Projects court coordinates (feet) into a pseudo-3D view.
// x: 0..20 (screen left → right), y: 0 (far baseline) .. 44 (near baseline).

export const COURT_WIDTH = 20
export const COURT_LENGTH = 44
export const KITCHEN_DEPTH = 7
export const NET_Y = COURT_LENGTH / 2
export const FAR_KITCHEN_Y = NET_Y - KITCHEN_DEPTH
export const NEAR_KITCHEN_Y = NET_Y + KITCHEN_DEPTH

export const VIEW_WIDTH = 360
export const VIEW_HEIGHT = 300

const DEPTH_FACTOR = 0.014
const NEAR_HALF_WIDTH_PX = 150
const NEAR_BASELINE_PX = 252
const FAR_BASELINE_PX = 70

const depthScale = (y: number): number => 1 / (1 + (COURT_LENGTH - y) * DEPTH_FACTOR)

const SCALE_AT_FAR = depthScale(0)
const Y_RANGE_PX = (NEAR_BASELINE_PX - FAR_BASELINE_PX) / (1 - SCALE_AT_FAR)
const HORIZON_PX = NEAR_BASELINE_PX - Y_RANGE_PX

export interface Point {
  x: number
  y: number
  scale: number
}

export function project(x: number, y: number): Point {
  const scale = depthScale(y)
  return {
    x: VIEW_WIDTH / 2 + (x - COURT_WIDTH / 2) * (NEAR_HALF_WIDTH_PX / (COURT_WIDTH / 2)) * scale,
    y: HORIZON_PX + Y_RANGE_PX * scale,
    scale,
  }
}

const fmt = (n: number): string => n.toFixed(1)

export function polygon(points: readonly (readonly [number, number])[]): string {
  return points
    .map(([x, y]) => project(x, y))
    .map((p) => `${fmt(p.x)},${fmt(p.y)}`)
    .join(' ')
}

export function rect(x1: number, y1: number, x2: number, y2: number): string {
  return polygon([
    [x1, y1],
    [x2, y1],
    [x2, y2],
    [x1, y2],
  ])
}

export function line(x1: number, y1: number, x2: number, y2: number) {
  const a = project(x1, y1)
  const b = project(x2, y2)
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y }
}
