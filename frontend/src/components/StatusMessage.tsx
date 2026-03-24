import { useEffect, useState, useRef } from 'react'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  message?: string | null
  type?: 'error' | 'success'
  className?: string
  children?: React.ReactNode
}

export default function StatusMessage(props: Props) {
  const type = props.type || 'error'
  const [visible, setVisible] = useState(false)
  const counterRef = useRef(0)

  useEffect(() => {
    if (props.message || props.children) {
      counterRef.current += 1
      setVisible(true)
      const timer = setTimeout(() => setVisible(false), 4000)
      return () => clearTimeout(timer)
    }
  }, [props.message, props.children])

  if (!props.message && !props.children) return null

  const Icon = type === 'success' ? CheckCircle : AlertCircle

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border px-4 py-3 text-sm transition-all duration-300',
        type === 'success'
          ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300'
          : 'border-destructive/50 bg-destructive/10 text-destructive',
        visible ? 'opacity-100' : 'opacity-0',
        props.className
      )}
      role="alert"
      aria-live="polite"
    >
      <Icon className="h-4 w-4 shrink-0" />
      {props.children ? props.children : <span>{props.message}</span>}
    </div>
  )
}
