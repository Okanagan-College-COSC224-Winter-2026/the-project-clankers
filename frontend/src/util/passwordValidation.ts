export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
}

export const passwordCriteria = [
  {
    label: 'At least 8 characters',
    test: (pwd: string) => pwd.length >= 8,
    error: 'Password must be at least 8 characters'
  },
  {
    label: 'Contains uppercase letter',
    test: (pwd: string) => /[A-Z]/.test(pwd),
    error: 'Password must contain at least one uppercase letter'
  },
  {
    label: 'Contains lowercase letter',
    test: (pwd: string) => /[a-z]/.test(pwd),
    error: 'Password must contain at least one lowercase letter'
  },
  {
    label: 'Contains number',
    test: (pwd: string) => /\d/.test(pwd),
    error: 'Password must contain at least one number'
  },
  {
    label: 'Contains special character (!@#$%^&*)',
    test: (pwd: string) => /[!@#$%^&*]/.test(pwd),
    error: 'Password must contain at least one special character (!@#$%^&*)'
  }
]

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = []

  for (const criterion of passwordCriteria) {
    if (!criterion.test(password)) {
      errors.push(criterion.error)
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}
