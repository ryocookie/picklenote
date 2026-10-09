import { useCallback, useEffect, useRef, useState } from 'react'
import { createMatch, recordMatchRally, startNextGame, type BestOf, type MatchState } from '../../domain/match'
import type { GameConfig, TeamId } from '../../domain/scoring'

const STORAGE_KEY = 'pickleball:match:v2'
const LEGACY_STORAGE_KEY = 'pickleball:game:v1'

// history[history.length - 1] is the current state; earlier entries enable undo.
type History = readonly MatchState[]

function isMatchState(value: unknown): value is MatchState {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Partial<MatchState>
  return (
    (v.bestOf === 1 || v.bestOf === 3) &&
    Array.isArray(v.results) &&
    typeof v.game?.config === 'object' &&
    typeof v.game?.score?.A === 'number' &&
    typeof v.game?.score?.B === 'number'
  )
}

const newMatchId = (): string => `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

function loadHistory(): History {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY)
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed) || !parsed.every(isMatchState)) return []
    // Matches saved before ids existed: give the whole in-progress history one id.
    const fallbackId = newMatchId()
    return parsed.map((m) => (typeof m.id === 'string' && m.id ? m : { ...m, id: fallbackId }))
  } catch {
    // Corrupted or inaccessible storage: start fresh instead of crashing.
    return []
  }
}

function saveHistory(history: History): void {
  try {
    if (history.length === 0) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  } catch {
    // Storage unavailable (private mode etc.): the match still works in memory.
  }
}

export interface UseMatch {
  match: MatchState | null
  // Changes on every rally/undo; drives replaying animations.
  turn: number
  canUndo: boolean
  start: (config: GameConfig, bestOf: BestOf) => void
  // Returns the resulting state synchronously so callers can react inside the tap handler
  // (iOS only allows speech synthesis started from a user gesture).
  rally: (winner: TeamId) => MatchState | null
  nextGame: () => MatchState | null
  undo: () => void
  reset: () => void
}

export function useMatch(): UseMatch {
  const [history, setHistory] = useState<History>(loadHistory)
  const historyRef = useRef(history)

  const commit = useCallback((next: History) => {
    historyRef.current = next
    setHistory(next)
  }, [])

  useEffect(() => saveHistory(history), [history])

  const start = useCallback((config: GameConfig, bestOf: BestOf) => commit([createMatch(config, bestOf, newMatchId())]), [commit])

  const rally = useCallback(
    (winner: TeamId) => {
      const prev = historyRef.current
      const current = prev.at(-1)
      if (!current) return null
      const next = recordMatchRally(current, winner)
      if (next === current) return null
      commit([...prev, next])
      return next
    },
    [commit],
  )

  const nextGame = useCallback(() => {
    const prev = historyRef.current
    const current = prev.at(-1)
    if (!current) return null
    const next = startNextGame(current)
    if (next === current) return null
    commit([...prev, next])
    return next
  }, [commit])

  const undo = useCallback(() => {
    const prev = historyRef.current
    if (prev.length > 1) commit(prev.slice(0, -1))
  }, [commit])

  const reset = useCallback(() => commit([]), [commit])

  return { match: history.at(-1) ?? null, turn: history.length, canUndo: history.length > 1, start, rally, nextGame, undo, reset }
}
