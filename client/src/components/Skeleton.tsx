import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("skeleton h-4 w-full", className)} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="hud-panel overflow-hidden rounded-[24px]">
      <Skeleton className="h-44 w-full rounded-none" />
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-5 w-24 rounded-[12px]" />
          <Skeleton className="h-5 w-20 rounded-[12px]" />
        </div>
        <Skeleton className="h-7 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="flex items-end justify-between gap-3 pt-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-10 w-24 rounded-[14px]" />
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-14" />
          ))}
        </div>
      ))}
    </div>
  );
}
