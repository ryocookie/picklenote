import { useCallback, useState } from 'react'

const PREFIX = 'pickleball:pref:'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw === null) return fallback
    const parsed: unknown = JSON.parse(raw)
    return typeof parsed === typeof fallback ? (parsed as T) : fallback
  } catch {
    return fallback
  }
}

// Per-device preference stored in localStorage. Falls back to in-memory when storage is unavailable.
export function usePersistentState<T extends string | number | boolean>(key: string, fallback: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => read(key, fallback))

  const update = useCallback(
    (next: T) => {
      setValue(next)
      try {
        localStorage.setItem(PREFIX + key, JSON.stringify(next))
      } catch {
        // Keep the in-memory value; nothing else to do.
      }
    },
    [key],
  )

  return [value, update]
}
