import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'io.github.ryocookie.picklenote',
  appName: 'PickleNote',
  webDir: 'dist',
  backgroundColor: '#071a12',
  plugins: {
    // The app is always dark, so keep light status/navigation bar icons regardless of the OS theme.
    SystemBars: { style: 'DARK' },
  },
}

export default config
