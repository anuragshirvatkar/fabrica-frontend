export type PasswordRule = {
  id: 'length' | 'number' | 'special'
  label: string
  test: (password: string) => boolean
}

/** Special characters commonly accepted for account passwords. */
const SPECIAL_CHAR = /[^A-Za-z0-9]/

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: 'length',
    label: 'At least 6 characters',
    test: (password) => password.length >= 6,
  },
  {
    id: 'number',
    label: 'Use 1 number',
    test: (password) => /\d/.test(password),
  },
  {
    id: 'special',
    label: 'Use 1 special character',
    test: (password) => SPECIAL_CHAR.test(password),
  },
]

export function getPasswordRuleStatus(password: string) {
  return PASSWORD_RULES.map((rule) => ({
    ...rule,
    met: rule.test(password),
  }))
}

export function isPasswordValid(password: string) {
  return PASSWORD_RULES.every((rule) => rule.test(password))
}
