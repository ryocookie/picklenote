import { Capacitor } from '@capacitor/core'

// True inside the Capacitor native shell (Android APK); false in browsers and the installed PWA.
export const isNativeApp = (): boolean => Capacitor.isNativePlatform()
