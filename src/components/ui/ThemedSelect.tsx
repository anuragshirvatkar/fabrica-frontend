import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

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
}

export function ThemedSelect({
  id,
  value,
  options,
  placeholder = 'Select an option',
  onChange,
  error = false,
  disabled = false,
}: ThemedSelectProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const selected = options.find((option) => option.value === value)

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div className="relative" ref={rootRef}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm rounded-lg border bg-white transition-colors ${
          error
            ? 'border-red-400'
            : open
              ? 'border-gray-400'
              : 'border-gray-200 hover:border-gray-300'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <span className={selected ? 'text-black' : 'text-gray-400'}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute z-30 mt-1.5 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden animate-fade-slide-in">
          <ul className="max-h-56 overflow-y-auto py-1">
            {options.map((option) => {
              const active = option.value === value
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(option.value)
                      setOpen(false)
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm text-left transition-colors ${
                      active ? 'bg-[#f5f3ef] text-black font-medium' : 'text-gray-700 hover:bg-[#fafafa]'
                    }`}
                  >
                    {option.label}
                    {active && <Check size={15} className="text-black" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
