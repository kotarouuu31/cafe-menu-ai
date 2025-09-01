import { AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ErrorMessageProps {
  message: string
  onDismiss?: () => void
  className?: string
  variant?: 'error' | 'warning' | 'info'
}

export function ErrorMessage({ 
  message, 
  onDismiss, 
  className, 
  variant = 'error' 
}: ErrorMessageProps) {
  const variantClasses = {
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  }

  const iconClasses = {
    error: 'text-red-500',
    warning: 'text-yellow-500',
    info: 'text-blue-500'
  }

  return (
    <div className={cn(
      'flex items-start gap-3 p-4 border rounded-lg',
      variantClasses[variant],
      className
    )}>
      <AlertCircle className={cn('w-5 h-5 mt-0.5 flex-shrink-0', iconClasses[variant])} />
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={cn('p-1 rounded hover:bg-black/5', iconClasses[variant])}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
