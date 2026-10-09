import { TextToSpeech } from '@capacitor-community/text-to-speech'
import { useCallback } from 'react'
import { isNativeApp } from './platform'
import { usePersistentState } from './usePersistentState'

const LANG = 'ja-JP'
const RATE = 1.05

// Android WebView has no Web Speech API, so the native app uses the OS text-to-speech engine instead.
const isSupported = (): boolean => isNativeApp() || (typeof window !== 'undefined' && 'speechSynthesis' in window)

function pickVoice(): SpeechSynthesisVoice | undefined {
  return window.speechSynthesis.getVoices().find((v) => v.lang.replace('_', '-').startsWith('ja'))
}

function sayNative(text: string): void {
  TextToSpeech.stop()
    .then(() => TextToSpeech.speak({ text, lang: LANG, rate: RATE }))
    .catch((error: unknown) => console.warn('Text-to-speech failed', error))
}

function stopSpeaking(): void {
  if (isNativeApp()) TextToSpeech.stop().catch(() => undefined)
  else window.speechSynthesis.cancel()
}

function say(text: string): void {
  if (isNativeApp()) {
    sayNative(text)
    return
  }
  const synth = window.speechSynthesis
  // Drop any queued call so the latest score is always what you hear.
  synth.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = LANG
  utterance.rate = RATE
  const voice = pickVoice()
  if (voice) utterance.voice = voice
  synth.speak(utterance)
}

export interface UseSpeech {
  isSupported: boolean
  isEnabled: boolean
  toggle: () => void
  speak: (text: string) => void
}

// Call `speak`/`toggle` from a tap handler: iOS Safari only starts speech from user gestures.
export function useSpeech(): UseSpeech {
  const [isEnabled, setEnabled] = usePersistentState<boolean>('speech', false)
  const supported = isSupported()

  const speak = useCallback(
    (text: string) => {
      if (supported && isEnabled) say(text)
    },
    [supported, isEnabled],
  )

  const toggle = useCallback(() => {
    if (!supported) return
    const next = !isEnabled
    setEnabled(next)
    if (next) say('読み上げをオンにしました')
    else stopSpeaking()
  }, [supported, isEnabled, setEnabled])

  return { isSupported: supported, isEnabled: supported && isEnabled, toggle, speak }
}
