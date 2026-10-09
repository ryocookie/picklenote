import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

const BACKGROUND = '#071a12'

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: BACKGROUND } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: BACKGROUND } },
  },
  images: ['public/app-icon.svg'],
})
