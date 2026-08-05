import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const iconPath = path.join(root, 'public/images/favicon-image.png')
const publicDir = path.join(root, 'public')

const THEME_CREAM = { r: 245, g: 243, b: 239, alpha: 1 }

async function removeBlackBackground(inputBuffer) {
  const { data, info } = await sharp(inputBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    if (r < 40 && g < 40 && b < 40) {
      data[i + 3] = 0
    }
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png()
}

async function createFavicon(size) {
  const padding = Math.round(size * 0.12)
  const logoSize = size - padding * 2

  const logo = await removeBlackBackground(fs.readFileSync(iconPath))
    .then((img) => img.resize(logoSize, logoSize, { fit: 'contain' }).png().toBuffer())

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: THEME_CREAM,
    },
  })
    .png()
    .composite([{ input: logo, gravity: 'centre' }])
    .toBuffer()
}

async function main() {
  const sizes = [16, 32, 180]

  for (const size of sizes) {
    const buffer = await createFavicon(size)
    const filename = size === 180 ? 'apple-touch-icon.png' : `favicon-${size}x${size}.png`
    fs.writeFileSync(path.join(publicDir, filename), buffer)
  }

  const favicon32 = fs.readFileSync(path.join(publicDir, 'favicon-32x32.png'))
  const b64 = favicon32.toString('base64')

  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">',
    `<image href="data:image/png;base64,${b64}" width="32" height="32"/>`,
    '</svg>',
  ].join('')

  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svg)
  console.log('Favicons generated with cream background')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
