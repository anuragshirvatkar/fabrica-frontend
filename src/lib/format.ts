/** Strip thousand separators / non-numeric junk for storage & parsing. */
export function sanitizeNumberInput(
  value: string,
  options?: { allowDecimal?: boolean },
) {
  let raw = String(value ?? '').replace(/,/g, '').trim()
  if (!raw) return ''

  if (options?.allowDecimal) {
    raw = raw.replace(/[^\d.]/g, '')
    const [intPart, ...rest] = raw.split('.')
    raw = rest.length ? `${intPart}.${rest.join('').replace(/\./g, '')}` : intPart
  } else {
    raw = raw.replace(/\D/g, '')
  }

  return raw
}

/** Format a numeric string/number with thousand separators (e.g. 6500 → "6,500"). */
export function formatNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return ''
  const raw = sanitizeNumberInput(String(value), { allowDecimal: true })
  if (!raw || raw === '.') return ''

  const negative = String(value).trim().startsWith('-')
  const unsigned = raw
  const [intPart, decPart] = unsigned.split('.')
  const formattedInt = Number(intPart || '0').toLocaleString('en-IN')
  const result = decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt
  return negative ? `-${result}` : result
}

export function toNumberOrNaN(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return NaN
  return Number(sanitizeNumberInput(String(value), { allowDecimal: true }))
}
