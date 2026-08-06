import { INDIAN_STATES } from '../../lib/indianStates'
import { ThemedSelect } from './ThemedSelect'

type StateSelectProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  error?: boolean
  disabled?: boolean
  onBlur?: () => void
  placeholder?: string
}

export function StateSelect({
  id,
  value,
  onChange,
  error,
  disabled,
  onBlur,
  placeholder = 'Select state',
}: StateSelectProps) {
  const options = (() => {
    const base = INDIAN_STATES.map((state) => ({ value: state, label: state }))
    if (value && !(INDIAN_STATES as readonly string[]).includes(value)) {
      return [{ value, label: value }, ...base]
    }
    return base
  })()

  return (
    <ThemedSelect
      id={id}
      value={value}
      options={options}
      placeholder={placeholder}
      onChange={onChange}
      error={error}
      disabled={disabled}
      onBlur={onBlur}
      searchable
      searchPlaceholder="Search states…"
    />
  )
}
