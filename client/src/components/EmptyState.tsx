import type { ReactNode } from "react";
import { AlertTriangle, PackageOpen, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { ParuvoLogo } from "@/components/branding/ParuvoLogo";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "hud-panel flex flex-col items-center justify-center px-6 py-14 text-center",
        className
      )}
    >
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[20px] border border-primary/20 bg-[linear-gradient(180deg,rgba(105,246,255,0.2),rgba(105,246,255,0.05))] text-primary shadow-cyan">
        {icon ?? <PackageOpen className="h-8 w-8" />}
      </div>
      <ParuvoLogo showWordmark={false} compact className="mb-4" />
      <h3 className="display-font text-xl font-semibold text-white">{title}</h3>
      {description ? <p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "hud-panel flex flex-col items-center justify-center px-6 py-14 text-center",
        className
      )}
    >
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[20px] border border-rose-400/25 bg-[linear-gradient(180deg,rgba(255,120,148,0.18),rgba(255,120,148,0.05))] text-rose-300">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <ParuvoLogo showWordmark={false} compact className="mb-4" />
      <h3 className="display-font text-xl font-semibold text-white">{title}</h3>
      {description ? <p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">{description}</p> : null}
      {onRetry ? (
        <button onClick={onRetry} className="action-secondary mt-6">
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      ) : null}
    </div>
  );
}
