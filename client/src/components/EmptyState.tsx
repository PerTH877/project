import type { ReactNode } from 'react'
import { PackageOpen, AlertTriangle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
    icon?: ReactNode
    title: string
    description?: string
    action?: ReactNode
    className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
    return (
        <div className={cn('flex flex-col items-center justify-center py-20 px-6 text-center', className)}>
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-5 text-muted-foreground">
                {icon ?? <PackageOpen className="w-8 h-8" />}
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>
            {description && <p className="text-sm text-muted-foreground mb-6 max-w-sm">{description}</p>}
            {action}
        </div>
    )
}

interface ErrorStateProps {
    title?: string
    description?: string
    onRetry?: () => void
    className?: string
}

export function ErrorState({ title = 'Something went wrong', description, onRetry, className }: ErrorStateProps) {
    return (
        <div className={cn('flex flex-col items-center justify-center py-20 px-6 text-center', className)}>
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-5">
                <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>
            {description && <p className="text-sm text-muted-foreground mb-6 max-w-sm">{description}</p>}
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-secondary transition-colors"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Try again
                </button>
            )}
        </div>
    )
}
