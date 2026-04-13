import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AlertTriangle, RefreshCw, Info, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'info' | 'success'
  onConfirm: () => void
  onCancel: () => void
  error?: string
}

const variantConfig = {
  danger: {
    icon: AlertTriangle,
    iconClass: 'text-destructive',
    buttonClass: 'border border-destructive/40 bg-transparent text-destructive hover:bg-destructive/10 hover:text-destructive shadow-none',
  },
  warning: {
    icon: RefreshCw,
    iconClass: 'text-yellow-500',
    buttonClass: 'bg-yellow-500 text-white hover:bg-yellow-600',
  },
  info: {
    icon: Info,
    iconClass: 'text-blue-500',
    buttonClass: 'bg-blue-500 text-white hover:bg-blue-600',
  },
  success: {
    icon: CheckCircle,
    iconClass: 'text-green-500',
    buttonClass: 'bg-green-500 text-white hover:bg-green-600',
  },
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
  error,
}: ConfirmDialogProps) {
  const config = variantConfig[variant]
  const Icon = config.icon

  return (
    <AlertDialog open onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="p-0 overflow-hidden rounded-lg border bg-card shadow-sm max-w-md">
        <AlertDialogHeader className="border-b px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className={cn('rounded-full bg-muted p-1.5', config.iconClass)}>
              <Icon className="h-4 w-4" />
            </div>
            <AlertDialogTitle className="text-base font-semibold">{title}</AlertDialogTitle>
          </div>
        </AlertDialogHeader>
        <div className="px-5 py-4">
          <AlertDialogDescription className="text-sm text-muted-foreground">
            {message}
          </AlertDialogDescription>
          {error && (
            <div className="mt-3 p-3 bg-destructive/10 border border-destructive/30 rounded text-sm text-destructive">
              {error}
            </div>
          )}
        </div>
        <AlertDialogFooter className="border-t px-5 py-3 flex justify-end gap-2">
          <AlertDialogCancel onClick={onCancel} className="h-8 px-4 text-sm">{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className={cn('h-8 px-4 text-sm', config.buttonClass)}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
