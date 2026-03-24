import { Check, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  password: string
}

interface CriteriaItem {
  label: string
  test: (password: string) => boolean
}

const criteria: CriteriaItem[] = [
  { label: 'At least 8 characters', test: (pwd) => pwd.length >= 8 },
  { label: 'Contains uppercase letter', test: (pwd) => /[A-Z]/.test(pwd) },
  { label: 'Contains lowercase letter', test: (pwd) => /[a-z]/.test(pwd) },
  { label: 'Contains number', test: (pwd) => /\d/.test(pwd) },
  { label: 'Contains special character (!@#$%^&*)', test: (pwd) => /[!@#$%^&*]/.test(pwd) }
]

export default function PasswordCriteria(props: Props) {
  return (
    <div className="rounded-lg border bg-card p-4 text-card-foreground">
      <p className="mb-2 text-sm font-medium text-muted-foreground">Password must contain:</p>
      <ul className="space-y-1.5">
        {criteria.map((item, index) => {
          const isMet = item.test(props.password)
          return (
            <li
              key={index}
              className={cn(
                'flex items-center gap-2 text-sm transition-colors',
                isMet ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
              )}
            >
              {isMet ? (
                <Check className="h-4 w-4" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
              <span>{item.label}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
