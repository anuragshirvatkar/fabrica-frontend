import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'

export type ThemedSelectOption = {
  value: string
  label: string
}

type ThemedSelectProps = {
  id?: string
  value: string
  options: ThemedSelectOption[]
  placeholder?: string
  onChange: (value: string) => void
  error?: boolean
  disabled?: boolean
  /** When true, shows a search field inside the dropdown panel */
  searchable?: boolean
  searchPlaceholder?: string
  onBlur?: () => void
  /** Compact trigger for toolbars */
  size?: 'md' | 'sm'
  /** Shrink trigger to label width; panel can still expand wider */
  fitContent?: boolean
}

export function ThemedSelect({
  id,
  value,
  options,
  placeholder = 'Select an option',
  onChange,
  error = false,
  disabled = false,
  searchable = false,
  searchPlaceholder = 'Search…',
  onBlur,
  size = 'md',
  fitContent = false,
}: ThemedSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const selected = options.find((option) => option.value === value)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((option) => option.label.toLowerCase().includes(q))
  }, [options, query])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    if (open && searchable) {
      // Focus search after open so the panel stays downward-visible
      requestAnimationFrame(() => searchRef.current?.focus())
    }
  }, [open, searchable])

  const close = () => {
    setOpen(false)
    setQuery('')
    onBlur?.()
  }

  return (
    <div className={`relative z-20 ${fitContent ? 'inline-block' : 'w-full'}`} ref={rootRef}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          if (disabled) return
          setOpen((prev) => {
            const next = !prev
            if (!next) setQuery('')
            return next
          })
        }}
        className={`flex items-center justify-between border bg-white transition-colors ${
          fitContent ? 'w-auto' : 'w-full'
        } ${
          size === 'sm'
            ? 'h-8 gap-1.5 px-2.5 text-xs sm:text-sm rounded-md'
            : 'gap-3 px-3.5 py-2.5 text-sm rounded-lg'
        } ${
          error
            ? 'border-red-400'
            : open
              ? 'border-gray-400'
              : 'border-gray-200 hover:border-gray-300'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <span
          className={`${fitContent ? '' : 'truncate'} text-left ${
            selected ? 'text-black' : 'text-gray-400'
          }`}
        >
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          size={size === 'sm' ? 14 : 16}
          className={`text-gray-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className={`absolute left-0 top-full z-50 mt-1.5 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden animate-fade-slide-in ${
            fitContent ? 'min-w-[12.5rem] w-max' : 'right-0 min-w-[12.5rem]'
          }`}
        >
          {searchable && (
            <div className="p-2 border-b border-gray-100">
              <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[#f7f5f2] border border-transparent focus-within:border-gray-300 focus-within:bg-white transition-colors">
                <Search size={15} className="text-gray-400 shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') close()
                    if (e.key === 'Enter' && filtered[0]) {
                      e.preventDefault()
                      onChange(filtered[0].value)
                      close()
                    }
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none"
                />
              </div>
            </div>
          )}

          <ul className="max-h-56 overflow-y-auto py-1" role="listbox">
            {filtered.length === 0 ? (
              <li className="px-3.5 py-3 text-sm text-gray-500">No matches</li>
            ) : (
              filtered.map((option) => {
                const active = option.value === value
                return (
                  <li key={option.value} role="option" aria-selected={active}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(option.value)
                        close()
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm text-left transition-colors ${
                        active
                          ? 'bg-[#f5f3ef] text-black font-medium'
                          : 'text-gray-700 hover:bg-[#f5f3ef]/70'
                      }`}
                    >
                      <span className="truncate">{option.label}</span>
                      {active && <Check size={15} className="text-black shrink-0" />}
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
