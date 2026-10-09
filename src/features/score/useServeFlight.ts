import { useEffect, type RefObject } from 'react'
import type { Point } from './courtGeometry'

const FLIGHT_MS = 900
// Let player tokens finish sliding before the ball flies.
const START_DELAY_MS = 380
const BALL_RADIUS = 5.5

const quad = (a: number, b: number, c: number, t: number): number => (1 - t) ** 2 * a + 2 * (1 - t) * t * b + t ** 2 * c
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const easeInOutSine = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2

interface Flight {
  from: Point
  control: { x: number; y: number }
  to: Point
  // Ground point under the contact position, for the shadow.
  groundFrom: Point
}

// Animates the ball (and its ground shadow) along the serve arc every time `trigger` changes.
export function useServeFlight(
  ballRef: RefObject<SVGCircleElement | null>,
  shadowRef: RefObject<SVGEllipseElement | null>,
  flight: Flight,
  trigger: unknown,
): void {
  const { from, control, to, groundFrom } = flight

  useEffect(() => {
    const ball = ballRef.current
    const shadow = shadowRef.current
    if (!ball || !shadow) return

    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const startAt = performance.now() + (isReduced ? 0 : START_DELAY_MS)
    let frame = 0

    const render = (t: number) => {
      const e = easeInOutSine(t)
      const scale = lerp(from.scale, to.scale, e)
      ball.setAttribute('cx', String(quad(from.x, control.x, to.x, e)))
      ball.setAttribute('cy', String(quad(from.y, control.y, to.y, e)))
      ball.setAttribute('r', String(BALL_RADIUS * scale))
      shadow.setAttribute('cx', String(lerp(groundFrom.x, to.x, e)))
      shadow.setAttribute('cy', String(lerp(groundFrom.y, to.y, e)))
      shadow.setAttribute('rx', String(BALL_RADIUS * scale * (0.6 + 0.6 * e)))
      shadow.setAttribute('ry', String(BALL_RADIUS * scale * 0.35))
    }

    const tick = (now: number) => {
      const t = isReduced ? 1 : Math.min(1, Math.max(0, (now - startAt) / FLIGHT_MS))
      render(t)
      if (t < 1) frame = requestAnimationFrame(tick)
    }

    render(0)
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [ballRef, shadowRef, from.x, from.y, from.scale, control.x, control.y, to.x, to.y, to.scale, groundFrom.x, groundFrom.y, trigger])
}
