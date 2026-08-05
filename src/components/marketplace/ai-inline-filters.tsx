import type { AiNlFilters } from '../../lib/api'

type AiInlineFiltersProps = {
  filters?: AiNlFilters | null
}

function chip(label: string, value: string) {
  return (
    <span
      key={`${label}-${value}`}
      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-700"
    >
      <span className="text-gray-400">{label}</span>
      {value}
    </span>
  )
}

export function AiInlineFilters({ filters }: AiInlineFiltersProps) {
  if (!filters) return null

  const chips: Array<{ label: string; value: string }> = []
  if (filters.category) chips.push({ label: 'Category', value: filters.category })
  if (filters.color) chips.push({ label: 'Color', value: filters.color })
  if (filters.maxPrice != null) {
    chips.push({
      label: 'Price',
      value:
        filters.minPrice != null
          ? `₹${filters.minPrice}–₹${filters.maxPrice}`
          : `Under ₹${filters.maxPrice}`,
    })
  } else if (filters.minPrice != null) {
    chips.push({ label: 'Price', value: `From ₹${filters.minPrice}` })
  }
  if (filters.useCase) chips.push({ label: 'Use', value: filters.useCase })
  if (filters.keywords?.length) {
    chips.push({ label: 'Keywords', value: filters.keywords.slice(0, 3).join(', ') })
  }
  if (filters.minGsm != null || filters.maxGsm != null) {
    chips.push({
      label: 'GSM',
      value: `${filters.minGsm ?? '—'}–${filters.maxGsm ?? '—'}`,
    })
  }

  if (!chips.length) return null

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {chips.map((item) => chip(item.label, item.value))}
    </div>
  )
}
