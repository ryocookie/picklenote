import { useCallback, useEffect, useRef, useState } from 'react'
import {
  addPlayers,
  createOpenPlay,
  fillCourts,
  finishCourt,
  removePlayer,
  setCourtCount,
  setMode,
  shuffleQueue,
  toggleRest,
  type OpenPlayState,
  type PlayerId,
  type RotationMode,
} from '../../domain/openPlay'

const STORAGE_KEY = 'pickleball:openplay:v1'
const MAX_HISTORY = 60
const DEFAULT_COURTS = 1

const rng = (): number => Math.random()

function isOpenPlayState(value: unknown): value is OpenPlayState {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Partial<OpenPlayState>
  return (
    (v.mode === 'order' || v.mode === 'random') &&
    Array.isArray(v.players) &&
    Array.isArray(v.queue) &&
    Array.isArray(v.courts) &&
    typeof v.partners === 'object' &&
    typeof v.nextId === 'number'
  )
}

function load(): OpenPlayState[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.every(isOpenPlayState) ? parsed : []
  } catch {
    return []
  }
}

function save(history: readonly OpenPlayState[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  } catch {
    // Storage unavailable: the session still works in memory.
  }
}

export interface UseOpenPlay {
  state: OpenPlayState
  // Changes on every update; used to replay entry animations.
  version: number
  canUndo: boolean
  add: (names: readonly string[]) => void
  remove: (id: PlayerId) => void
  rest: (id: PlayerId) => void
  mode: (mode: RotationMode) => void
  courts: (count: number) => void
  shuffle: () => void
  fill: () => void
  finish: (courtIndex: number) => void
  undo: () => void
  reset: () => void
}

export function useOpenPlay(): UseOpenPlay {
  const [history, setHistory] = useState<readonly OpenPlayState[]>(() => {
    const loaded = load()
    return loaded.length > 0 ? loaded : [createOpenPlay(DEFAULT_COURTS, 'order')]
  })
  const historyRef = useRef(history)

  useEffect(() => save(history), [history])

  const apply = useCallback((update: (s: OpenPlayState) => OpenPlayState) => {
    const prev = historyRef.current
    const current = prev[prev.length - 1]
    const next = update(current)
    if (next === current) return
    const updated = [...prev, next].slice(-MAX_HISTORY)
    historyRef.current = updated
    setHistory(updated)
  }, [])

  const undo = useCallback(() => {
    const prev = historyRef.current
    if (prev.length < 2) return
    const updated = prev.slice(0, -1)
    historyRef.current = updated
    setHistory(updated)
  }, [])

  const reset = useCallback(() => {
    const current = historyRef.current[historyRef.current.length - 1]
    const fresh = [createOpenPlay(current.courts.length, current.mode)]
    historyRef.current = fresh
    setHistory(fresh)
  }, [])

  return {
    state: history[history.length - 1],
    version: history.length,
    canUndo: history.length > 1,
    add: useCallback((names) => apply((s) => addPlayers(s, names)), [apply]),
    remove: useCallback((id) => apply((s) => removePlayer(s, id)), [apply]),
    rest: useCallback((id) => apply((s) => toggleRest(s, id)), [apply]),
    mode: useCallback((m) => apply((s) => setMode(s, m)), [apply]),
    courts: useCallback((n) => apply((s) => setCourtCount(s, n)), [apply]),
    shuffle: useCallback(() => apply((s) => shuffleQueue(s, rng)), [apply]),
    fill: useCallback(() => apply((s) => fillCourts(s, rng)), [apply]),
    finish: useCallback((i) => apply((s) => finishCourt(s, i, rng)), [apply]),
    undo,
    reset,
  }
}
