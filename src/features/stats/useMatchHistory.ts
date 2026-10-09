import { useCallback, useState } from 'react'
import type { MatchRecord } from '../../domain/history'

const STORAGE_KEY = 'pickleball:history:v1'
// Keep storage bounded; oldest records are dropped first.
const MAX_RECORDS = 1000

function isRecord(value: unknown): value is MatchRecord {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Partial<MatchRecord>
  return (
    typeof v.id === 'string' &&
    typeof v.finishedAt === 'number' &&
    (v.winner === 'A' || v.winner === 'B') &&
    Array.isArray(v.games) &&
    Array.isArray(v.teams?.A?.players) &&
    Array.isArray(v.teams?.B?.players)
  )
}

export function loadRecords(): MatchRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isRecord) : []
  } catch {
    return []
  }
}

function saveRecords(records: readonly MatchRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {
    // Storage full or unavailable: history is best-effort.
  }
}

// Writes go straight to storage so that the score screen and the stats screen
// (mounted at different times) always see the same data.
export function upsertRecord(record: MatchRecord): void {
  const records = loadRecords()
  const existing = records.find((r) => r.id === record.id)
  // Keep the original finish time if the same match is recorded again.
  const next = existing ? { ...record, finishedAt: existing.finishedAt } : record
  const rest = records.filter((r) => r.id !== record.id)
  saveRecords([next, ...rest].sort((a, b) => b.finishedAt - a.finishedAt).slice(0, MAX_RECORDS))
}

export function removeRecord(id: string): void {
  const records = loadRecords()
  if (records.some((r) => r.id === id)) saveRecords(records.filter((r) => r.id !== id))
}

export interface UseMatchHistory {
  records: readonly MatchRecord[]
  remove: (id: string) => void
  clear: () => void
}

export function useMatchHistory(): UseMatchHistory {
  const [records, setRecords] = useState<readonly MatchRecord[]>(() => loadRecords().sort((a, b) => b.finishedAt - a.finishedAt))

  const remove = useCallback((id: string) => {
    removeRecord(id)
    setRecords((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const clear = useCallback(() => {
    saveRecords([])
    setRecords([])
  }, [])

  return { records, remove, clear }
}
