import { KeepAwake } from '@capacitor-community/keep-awake'
import { useEffect, useState } from 'react'
import { isNativeApp } from './platform'

export type WakeLockStatus = 'unsupported' | 'idle' | 'locked' | 'failed'

const isSupported = (): boolean => isNativeApp() || (typeof navigator !== 'undefined' && 'wakeLock' in navigator)

// Native app: the OS keeps the screen on via a window flag, no re-acquire needed.
function useNativeKeepAwake(isActive: boolean, setStatus: (s: WakeLockStatus) => void): void {
  useEffect(() => {
    if (!isActive || !isNativeApp()) return
    KeepAwake.keepAwake()
      .then(() => setStatus('locked'))
      .catch(() => setStatus('failed'))
    return () => {
      KeepAwake.allowSleep().catch(() => undefined)
      setStatus('idle')
    }
  }, [isActive, setStatus])
}

// Keeps the screen awake while `isActive` is true, re-acquiring the lock when the tab becomes visible again
// (browsers release it automatically when the page is hidden).
export function useWakeLock(isActive: boolean): WakeLockStatus {
  const [status, setStatus] = useState<WakeLockStatus>(isSupported() ? 'idle' : 'unsupported')

  useNativeKeepAwake(isActive, setStatus)

  useEffect(() => {
    if (!isActive || isNativeApp() || !isSupported()) return

    let sentinel: WakeLockSentinel | null = null
    let isDisposed = false

    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (isDisposed) {
          await lock.release()
          return
        }
        sentinel = lock
        setStatus('locked')
        lock.addEventListener('release', () => {
          if (!isDisposed) setStatus('idle')
        })
      } catch {
        // Denied (e.g. low battery mode) — surfaced to the user via status.
        if (!isDisposed) setStatus('failed')
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && (!sentinel || sentinel.released)) void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      isDisposed = true
      document.removeEventListener('visibilitychange', handleVisibility)
      sentinel?.release().catch(() => undefined)
      setStatus('idle')
    }
  }, [isActive])

  return status
}
