import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { MarketplaceFacets } from '../../lib/api'
import { formatNumber } from '../../lib/format'

function FilterSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-gray-100 py-4">
      <button
        type="button"
        className="flex items-center justify-between w-full text-sm font-semibold text-black mb-3"
        onClick={() => setOpen(!open)}
      >
        {title}
        {open ? (
          <ChevronUp size={16} className="text-gray-400" />
        ) : (
          <ChevronDown size={16} className="text-gray-400" />
        )}
      </button>
      {open && children}
    </div>
  )
}

const PRICE_THUMB =
  'pointer-events-none absolute inset-0 h-5 w-full appearance-none bg-transparent ' +
  '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none ' +
  '[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full ' +
  '[&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white ' +
  '[&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:cursor-pointer ' +
  '[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 ' +
  '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-black [&::-moz-range-thumb]:border-2 ' +
  '[&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:cursor-pointer'

function PriceRangeSlider({
  boundMin,
  boundMax,
  minPrice,
  maxPrice,
  onCommit,
}: {
  boundMin: number
  boundMax: number
  minPrice: string
  maxPrice: string
  onCommit: (min: string, max: string) => void
}) {
  const span = Math.max(boundMax - boundMin, 1)
  const [localMin, setLocalMin] = useState(
    minPrice !== '' ? Number(minPrice) : boundMin,
  )
  const [localMax, setLocalMax] = useState(
    maxPrice !== '' ? Number(maxPrice) : boundMax,
  )
  const localMinRef = useRef(localMin)
  const localMaxRef = useRef(localMax)

  useEffect(() => {
    const nextMin = minPrice !== '' ? Number(minPrice) : boundMin
    const nextMax = maxPrice !== '' ? Number(maxPrice) : boundMax
    setLocalMin(nextMin)
    setLocalMax(nextMax)
    localMinRef.current = nextMin
    localMaxRef.current = nextMax
  }, [minPrice, maxPrice, boundMin, boundMax])

  const clampedMin = Math.min(Math.max(localMin, boundMin), localMax)
  const clampedMax = Math.max(Math.min(localMax, boundMax), clampedMin)
  const leftPct = ((clampedMin - boundMin) / span) * 100
  const rightPct = ((clampedMax - boundMin) / span) * 100

  const commit = () => {
    const nextMin = localMinRef.current
    const nextMax = localMaxRef.current
    const atFloor = nextMin <= boundMin
    const atCeil = nextMax >= boundMax
    onCommit(atFloor ? '' : String(nextMin), atCeil ? '' : String(nextMax))
  }

  if (!Number.isFinite(boundMin) || !Number.isFinite(boundMax) || boundMax < boundMin) {
    return <p className="text-sm text-gray-400">Price range unavailable</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-600 mb-3 tabular-nums">
        <span>₹{formatNumber(clampedMin)}</span>
        <span>₹{formatNumber(clampedMax)}</span>
      </div>

      <div className="relative h-6 flex items-center touch-none">
        <div className="absolute inset-x-0 h-1 rounded-full bg-gray-200" />
        <div
          className="absolute h-1 rounded-full bg-black"
          style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
        />
        <input
          type="range"
          min={boundMin}
          max={boundMax}
          step={1}
          value={clampedMin}
          aria-label="Minimum price"
          className={`${PRICE_THUMB} z-[1]`}
          onChange={(e) => {
            const next = Math.min(Number(e.target.value), localMaxRef.current)
            localMinRef.current = next
            setLocalMin(next)
          }}
          onMouseUp={commit}
          onTouchEnd={commit}
          onKeyUp={commit}
        />
        <input
          type="range"
          min={boundMin}
          max={boundMax}
          step={1}
          value={clampedMax}
          aria-label="Maximum price"
          className={`${PRICE_THUMB} z-[2]`}
          onChange={(e) => {
            const next = Math.max(Number(e.target.value), localMinRef.current)
            localMaxRef.current = next
            setLocalMax(next)
          }}
          onMouseUp={commit}
          onTouchEnd={commit}
          onKeyUp={commit}
        />
      </div>
    </div>
  )
}

export type MarketplaceFilterState = {
  categories: string[]
  minPrice: string
  maxPrice: string
  gsm: string[]
  moqRanges: string[]
}

type FilterSidebarProps = {
  facets: MarketplaceFacets | null
  value: MarketplaceFilterState
  onChange: (next: MarketplaceFilterState) => void
  onClear: () => void
  showTitle?: boolean
}

function toggleValue<T>(list: T[], item: T) {
  return list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item]
}

export function FilterSidebar({
  facets,
  value,
  onChange,
  onClear,
  showTitle = true,
}: FilterSidebarProps) {
  const categories = facets?.categories || []
  const moqRanges = facets?.moqRanges || []
  const gsmRanges = facets?.gsmRanges || []
  const boundMin = Math.floor(facets?.price.min ?? 0)
  const boundMax = Math.ceil(facets?.price.max ?? 0)

  return (
    <div className="w-full min-w-0 overflow-hidden">
      <div className={`flex items-center ${showTitle ? 'justify-between' : 'justify-end'} mb-4`}>
        {showTitle && <h2 className="text-base font-semibold text-black">Filters</h2>}
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-gray-500 hover:text-black transition-colors"
        >
          Clear all
        </button>
      </div>

      <FilterSection title="Category">
        <div className="space-y-2.5">
          {categories.map((cat) => (
            <label key={cat.name} className="flex items-start gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={value.categories.some(
                  (entry) => entry.toLowerCase() === cat.name.toLowerCase(),
                )}
                onChange={() => {
                  const selected = value.categories.some(
                    (entry) => entry.toLowerCase() === cat.name.toLowerCase(),
                  )
                  onChange({
                    ...value,
                    categories: selected
                      ? value.categories.filter(
                          (entry) => entry.toLowerCase() !== cat.name.toLowerCase(),
                        )
                      : [...value.categories, cat.name],
                  })
                }}
                className="w-4 h-4 mt-0.5 rounded border-gray-300 accent-black flex-shrink-0"
              />
              <span className="text-sm text-gray-700 group-hover:text-black leading-snug">
                {cat.name}
                <span className="text-gray-400 ml-1">({cat.count})</span>
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Price Range (₹)">
        {facets ? (
          <PriceRangeSlider
            boundMin={boundMin}
            boundMax={boundMax}
            minPrice={value.minPrice}
            maxPrice={value.maxPrice}
            onCommit={(minPrice, maxPrice) => {
              if (minPrice === value.minPrice && maxPrice === value.maxPrice) return
              onChange({ ...value, minPrice, maxPrice })
            }}
          />
        ) : (
          <p className="text-sm text-gray-400">Loading…</p>
        )}
      </FilterSection>

      <FilterSection title="GSM">
        <div className="space-y-2.5">
          {gsmRanges.map((option) => (
            <label key={option.id} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={value.gsm.includes(option.id)}
                onChange={() =>
                  onChange({
                    ...value,
                    gsm: toggleValue(value.gsm, option.id),
                  })
                }
                className="w-4 h-4 rounded border-gray-300 accent-black flex-shrink-0"
              />
              <span className="text-sm text-gray-700 group-hover:text-black">
                {option.label}
                <span className="text-gray-400 ml-1">({option.count})</span>
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Minimum Order">
        <div className="space-y-2.5">
          {moqRanges.map((option) => (
            <label key={option.id} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={value.moqRanges.includes(option.id)}
                onChange={() =>
                  onChange({
                    ...value,
                    moqRanges: toggleValue(value.moqRanges, option.id),
                  })
                }
                className="w-4 h-4 rounded border-gray-300 accent-black flex-shrink-0"
              />
              <span className="text-sm text-gray-700 group-hover:text-black">
                {option.label}
                <span className="text-gray-400 ml-1">({option.count})</span>
              </span>
            </label>
          ))}
        </div>
      </FilterSection>
    </div>
  )
}

export const emptyMarketplaceFilters = (): MarketplaceFilterState => ({
  categories: [],
  minPrice: '',
  maxPrice: '',
  gsm: [],
  moqRanges: [],
})
