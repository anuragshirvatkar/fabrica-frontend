import { Pipette } from 'lucide-react'

type ImageColorPickerProps = {
  colorHex: string
  picking: boolean
  disabled?: boolean
  hoverHex?: string | null
  onTogglePick: () => void
}

type SamplePoint = {
  clientX: number
  clientY: number
  rect: DOMRect
}

export function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`
}

const canvasCache = new Map<string, HTMLCanvasElement>()
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

async function blobFromUrl(src: string, authToken?: string | null) {
  if (src.startsWith('data:') || src.startsWith('blob:')) {
    const response = await fetch(src)
    if (!response.ok) throw new Error('Failed to read local image')
    return response.blob()
  }

  try {
    const direct = await fetch(src, { mode: 'cors', credentials: 'omit' })
    if (direct.ok) return direct.blob()
  } catch {
    // Fall through to authenticated proxy (Cloudinary often blocks canvas CORS).
  }

  if (!authToken) throw new Error('Auth required to sample remote image')

  const proxyUrl = `${API_BASE_URL}/api/products/image-proxy?url=${encodeURIComponent(src)}`
  const proxied = await fetch(proxyUrl, {
    headers: { Authorization: `Bearer ${authToken}` },
  })
  if (!proxied.ok) throw new Error('Failed to proxy image for color picking')
  return proxied.blob()
}

async function getCanvas(src: string, authToken?: string | null) {
  const cacheKey = src
  const cached = canvasCache.get(cacheKey)
  if (cached) return cached

  const blob = await blobFromUrl(src, authToken)
  const objectUrl = URL.createObjectURL(blob)
  const image = new Image()

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Failed to load image'))
      image.src = objectUrl
    })

    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth || image.width
    canvas.height = image.naturalHeight || image.height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('Canvas unavailable')
    ctx.drawImage(image, 0, 0)
    ctx.getImageData(0, 0, 1, 1)
    canvasCache.set(cacheKey, canvas)
    return canvas
  } catch (error) {
    canvasCache.delete(cacheKey)
    throw error
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

/** Maps a click on an object-cover image to source canvas coordinates. */
function coverSamplePoint(point: SamplePoint, canvas: HTMLCanvasElement) {
  const { rect, clientX, clientY } = point
  const elementRatio = rect.width / rect.height
  const imageRatio = canvas.width / canvas.height

  let renderedWidth = rect.width
  let renderedHeight = rect.height
  let offsetX = 0
  let offsetY = 0

  if (imageRatio > elementRatio) {
    renderedHeight = rect.height
    renderedWidth = rect.height * imageRatio
    offsetX = (renderedWidth - rect.width) / 2
  } else {
    renderedWidth = rect.width
    renderedHeight = rect.width / imageRatio
    offsetY = (renderedHeight - rect.height) / 2
  }

  const xInRendered = clientX - rect.left + offsetX
  const yInRendered = clientY - rect.top + offsetY
  const x = Math.min(
    canvas.width - 1,
    Math.max(0, Math.floor((xInRendered / renderedWidth) * canvas.width)),
  )
  const y = Math.min(
    canvas.height - 1,
    Math.max(0, Math.floor((yInRendered / renderedHeight) * canvas.height)),
  )
  return { x, y }
}

export function captureSamplePoint(event: React.MouseEvent<HTMLElement>): SamplePoint | null {
  const el = event.currentTarget
  const rect = el.getBoundingClientRect()
  if (!rect.width || !rect.height) return null
  return {
    clientX: event.clientX,
    clientY: event.clientY,
    rect,
  }
}

export async function sampleColorAtPoint(
  src: string,
  point: SamplePoint,
  authToken?: string | null,
) {
  try {
    const canvas = await getCanvas(src, authToken)
    const { x, y } = coverSamplePoint(point, canvas)
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    const [r, g, b] = ctx.getImageData(x, y, 1, 1).data
    return rgbToHex(r, g, b)
  } catch (error) {
    console.error('[color-picker] sample failed', error)
    return null
  }
}

export async function sampleColorFromImage(
  src: string,
  event: React.MouseEvent<HTMLElement>,
  authToken?: string | null,
) {
  const point = captureSamplePoint(event)
  if (!point) return null
  return sampleColorAtPoint(src, point, authToken)
}

export function ImageColorPicker({
  colorHex,
  picking,
  disabled = false,
  hoverHex = null,
  onTogglePick,
}: ImageColorPickerProps) {
  const displayHex = picking && hoverHex ? hoverHex : colorHex
  const hasColor = Boolean(displayHex)

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span
        className={`w-11 h-11 rounded-xl shrink-0 ${
          hasColor
            ? 'border border-gray-200 shadow-sm'
            : 'border border-dashed border-gray-300 bg-[#faf9f7]'
        }`}
        style={hasColor ? { backgroundColor: displayHex } : undefined}
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <p
            className={`text-sm tracking-wide ${
              hasColor ? 'font-medium text-black uppercase' : 'font-normal text-gray-400'
            }`}
          >
            {hasColor ? displayHex : 'No color selected'}
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={onTogglePick}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              picking
                ? 'bg-black text-white border-black'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-[#f5f3ef]'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Pipette size={13} />
            {picking ? 'Cancel' : 'Pick from image'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {disabled
            ? 'Upload an image first, then pick color with the marker'
            : picking
              ? 'Hover an uploaded image above and click to pick'
              : 'Use the marker to pick color from an uploaded image'}
        </p>
      </div>
    </div>
  )
}
