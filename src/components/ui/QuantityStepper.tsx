import { useEffect, useState } from 'react'
import { Minus, Plus } from 'lucide-react'

type QuantityStepperProps = {
  id?: string
  value: number
  min?: number
  max?: number | null
  disabled?: boolean
  onChange: (value: number) => void
  /** Optional: surface the current validation message to the parent */
  onErrorChange?: (error: string) => void
}

function clampQuantity(n: number, min: number, max?: number | null) {
  let next = Math.floor(n)
  if (!Number.isFinite(next)) next = min
  if (next < min) next = min
  if (max != null && Number.isFinite(max) && max >= 0 && next > max) next = max
  return next
}

export function QuantityStepper({
  id,
  value,
  min = 1,
  max = null,
  disabled = false,
  onChange,
  onErrorChange,
}: QuantityStepperProps) {
  const [draft, setDraft] = useState(String(value))
  const [error, setError] = useState('')
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setDraft(String(value))
  }, [value, focused])

  useEffect(() => {
    onErrorChange?.(error)
  }, [error, onErrorChange])

  const setErr = (message: string) => {
    setError(message)
  }

  const commit = (raw: string) => {
    const trimmed = raw.trim()
    if (trimmed === '' || !/^\d+$/.test(trimmed)) {
      const next = clampQuantity(min, min, max)
      setDraft(String(next))
      onChange(next)
      setErr(`Enter a whole number (min ${min})`)
      return
    }

    const parsed = Number(trimmed)
    if (parsed < min) {
      const next = clampQuantity(min, min, max)
      setDraft(String(next))
      onChange(next)
      setErr(`Minimum order is ${min}`)
      return
    }

    if (max != null && Number.isFinite(max) && parsed > max) {
      const next = clampQuantity(max, min, max)
      setDraft(String(next))
      onChange(next)
      setErr(max <= 0 ? 'Out of stock' : `Only ${max} available`)
      return
    }

    setErr('')
    const next = clampQuantity(parsed, min, max)
    setDraft(String(next))
    onChange(next)
  }

  const atMin = value <= min
  const atMax = max != null && Number.isFinite(max) && value >= max

  return (
    <div>
      <div
        className={`flex items-center border rounded-lg overflow-hidden bg-white ${
          error ? 'border-red-300' : 'border-gray-200'
        } ${disabled ? 'opacity-50' : ''}`}
      >
        <button
          type="button"
          disabled={disabled || atMin}
          className="px-3.5 py-2.5 hover:bg-gray-50 transition-colors text-gray-600 disabled:opacity-40 disabled:hover:bg-transparent"
          onClick={() => {
            const next = clampQuantity(value - 1, min, max)
            setDraft(String(next))
            onChange(next)
            setErr(next < min ? `Minimum order is ${min}` : '')
          }}
          aria-label="Decrease quantity"
        >
          <Minus size={15} />
        </button>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          disabled={disabled}
          value={draft}
          onFocus={() => setFocused(true)}
          onChange={(e) => {
            const next = e.target.value.replace(/[^\d]/g, '')
            setDraft(next)
            if (error) setErr('')
            // Live total: push numeric draft to parent immediately (no clamp while typing)
            if (next === '') return
            const parsed = Number(next)
            if (Number.isFinite(parsed)) onChange(parsed)
          }}
          onBlur={() => {
            setFocused(false)
            commit(draft)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur()
            }
          }}
          className="flex-1 w-full min-w-0 text-center py-2.5 focus:outline-none text-sm font-medium border-x border-gray-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id || 'qty'}-error` : undefined}
        />
        <button
          type="button"
          disabled={disabled || atMax}
          className="px-3.5 py-2.5 hover:bg-gray-50 transition-colors text-gray-600 disabled:opacity-40 disabled:hover:bg-transparent"
          onClick={() => {
            const next = clampQuantity(value + 1, min, max)
            setDraft(String(next))
            onChange(next)
            setErr(
              max != null && next >= max && value + 1 > max
                ? max <= 0
                  ? 'Out of stock'
                  : `Only ${max} available`
                : '',
            )
          }}
          aria-label="Increase quantity"
        >
          <Plus size={15} />
        </button>
      </div>
      {error && (
        <p id={`${id || 'qty'}-error`} className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
