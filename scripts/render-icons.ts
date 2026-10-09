// Renders the source SVG into the PNGs @capacitor/assets expects (assets/*.png).
import sharp from 'sharp'

const SOURCE = 'public/app-icon.svg'
const BACKGROUND = '#071a12'
const SIZE = 1024
const SPLASH = 2732
const SPLASH_LOGO = Math.round(SPLASH / 3)

await sharp(SOURCE, { density: 400 }).resize(SIZE, SIZE).png().toFile('assets/icon-only.png')
await sharp(SOURCE, { density: 400 }).resize(SIZE, SIZE).png().toFile('assets/icon-foreground.png')
await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: BACKGROUND } }).png().toFile('assets/icon-background.png')

const logo = await sharp(SOURCE, { density: 400 }).resize(SPLASH_LOGO, SPLASH_LOGO).png().toBuffer()
for (const name of ['splash.png', 'splash-dark.png']) {
  await sharp({ create: { width: SPLASH, height: SPLASH, channels: 4, background: BACKGROUND } })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(`assets/${name}`)
}
