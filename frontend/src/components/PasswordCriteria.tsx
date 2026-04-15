import { Check, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { passwordCriteria } from '../util/passwordValidation'

interface Props {
  password: string
}

export default function PasswordCriteria(props: Props) {
  return (
    <div className="rounded-lg border bg-card p-4 text-card-foreground">
      <p className="mb-2 text-sm font-medium text-muted-foreground">Password must contain:</p>
      <ul className="space-y-1.5">
        {passwordCriteria.map((item, index) => {
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
