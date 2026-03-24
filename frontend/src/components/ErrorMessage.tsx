import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  message?: string | null
  className?: string
}

export default function ErrorMessage(props: Props) {
  if (!props.message) return null

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive',
        props.className
      )}
      role="alert"
    >
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>{props.message}</span>
    </div>
  )
}
