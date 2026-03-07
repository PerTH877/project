import { cn } from '@/lib/utils'

interface SkeletonProps {
    className?: string
}

export function Skeleton({ className }: SkeletonProps) {
    return <div className={cn('skeleton h-4 w-full', className)} />
}

export function ProductCardSkeleton() {
    return (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Skeleton className="h-52 w-full rounded-none" />
            <div className="p-4 space-y-3">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex items-center justify-between pt-1">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-8 w-24 rounded-lg" />
                </div>
            </div>
        </div>
    )
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
    return (
        <div className="space-y-2">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex gap-4">
                    {Array.from({ length: cols }).map((_, j) => (
                        <Skeleton key={j} className="h-10 flex-1" />
                    ))}
                </div>
            ))}
        </div>
    )
}
