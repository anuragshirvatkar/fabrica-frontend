import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { MarketplaceFacets } from '../../lib/api'

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
  const [minPrice, setMinPrice] = useState(value.minPrice)
  const [maxPrice, setMaxPrice] = useState(value.maxPrice)

  useEffect(() => {
    setMinPrice(value.minPrice)
    setMaxPrice(value.maxPrice)
  }, [value.minPrice, value.maxPrice])

  const commitPrice = () => {
    if (minPrice === value.minPrice && maxPrice === value.maxPrice) return
    onChange({ ...value, minPrice, maxPrice })
  }

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
        <div className="flex gap-2 min-w-0">
          <input
            type="number"
            min={0}
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            onBlur={commitPrice}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
            }}
            placeholder={facets ? String(Math.floor(facets.price.min || 0)) : 'Min'}
            className="flex-1 min-w-0 px-2.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
          />
          <input
            type="number"
            min={0}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            onBlur={commitPrice}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
            }}
            placeholder={facets ? String(Math.ceil(facets.price.max || 0)) : 'Max'}
            className="flex-1 min-w-0 px-2.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
          />
        </div>
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
