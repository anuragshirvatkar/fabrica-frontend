import { Search, Sparkles, X } from 'lucide-react'
import { Container } from '../container'

type MarketplaceSearchProps = {
  aiMode?: boolean
  query?: string
  onQueryChange?: (value: string) => void
  onAiSearch?: () => void
  onCloseAi?: () => void
}

export function MarketplaceSearch({
  aiMode = false,
  query = '',
  onQueryChange,
  onAiSearch,
  onCloseAi,
}: MarketplaceSearchProps) {
  return (
    <div className="bg-white border-b border-gray-100 pt-20 md:pt-24 pb-4 shrink-0">
      <Container>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-[#f5f5f5] rounded-full p-1 min-w-0">
            <div className="flex flex-col sm:flex-row gap-1">
              <div className="flex-1 relative flex items-center min-w-0">
                <Search className="absolute left-4 text-gray-400" size={18} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => onQueryChange?.(e.target.value)}
                  placeholder="Search fabrics by name, type, use case, or ask anything..."
                  className="w-full pl-11 pr-3 py-2.5 sm:py-3 bg-transparent rounded-full focus:outline-none text-sm text-gray-800 placeholder:text-gray-400"
                />
              </div>
              <button
                type="button"
                onClick={onAiSearch}
                className={`btn-pill-black px-5 py-2.5 sm:py-3 text-sm whitespace-nowrap sm:mr-0.5 ${
                  aiMode ? 'ring-2 ring-black/20' : ''
                }`}
              >
                <Sparkles size={15} />
                AI Search
              </button>
            </div>
          </div>
          {aiMode && onCloseAi && (
            <button
              type="button"
              onClick={onCloseAi}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500 shrink-0"
              aria-label="Exit AI search"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </Container>
    </div>
  )
}
