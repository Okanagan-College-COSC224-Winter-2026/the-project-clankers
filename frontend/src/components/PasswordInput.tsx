import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  value: string
  onInput: (value: string) => void
  placeholder?: string
  className?: string
  name?: string
  id?: string
  required?: boolean
}

export default function PasswordInput(props: Props) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="relative">
      <Input
        type={showPassword ? 'text' : 'password'}
        className={cn('pr-10', props.className)}
        placeholder={props.placeholder}
        value={props.value}
        name={props.name}
        id={props.id}
        required={props.required}
        onChange={(e) => props.onInput(e.target.value)}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
        onClick={() => setShowPassword(!showPassword)}
        disabled={!props.value}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
      >
        {showPassword ? (
          <EyeOff className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Eye className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>
    </div>
  )
}
