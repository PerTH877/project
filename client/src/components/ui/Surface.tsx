import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { cn, formatCompactNumber } from "@/lib/utils";
import { AnimatedCounter } from "./AnimatedCounter";

export function PageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("tactical-grid shell-width pb-16 pt-7 sm:pt-9", className)}>{children}</div>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  className,
}: {
  eyebrow: string;
  title: ReactNode | string;
  description?: string;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end",
        className
      )}
    >
      <div className="space-y-3">
        <div className="inline-flex items-center gap-3">
          <p className="hud-kicker">{eyebrow}</p>
          <span className="h-px w-16 bg-gradient-to-r from-cyan-300/70 to-transparent" />
        </div>
        <h1 className="display-font max-w-4xl text-3xl font-bold leading-tight bg-gradient-to-r from-fuchsia-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-sm sm:text-4xl xl:text-5xl">
          {title}
        </h1>
        {description ? <p className="max-w-3xl text-sm leading-7 text-muted-foreground">{description}</p> : null}
      </div>
      {actions || meta ? (
        <div className="flex flex-col items-start gap-3 lg:items-end">
          {meta}
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  icon: Icon,
  actions,
  children,
  className,
  contentClassName,
  titleClassName,
}: {
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  titleClassName?: string;
}) {
  return (
    <section className={cn("hud-panel hud-blur p-5 sm:p-6", className)}>
      <div className="scanning-layer">
        <div className="scanning-line" />
      </div>
      {title ? (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {Icon ? (
                <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-primary/25 bg-[linear-gradient(180deg,rgba(105,246,255,0.18),rgba(105,246,255,0.04))] text-primary shadow-cyan">
                  <Icon className="h-5 w-5" />
                </div>
              ) : null}
              <div>
                <h2 className={cn("display-font text-xl font-semibold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent sm:text-2xl", titleClassName)}>{title}</h2>
                {subtitle ? <p className="text-sm leading-7 text-muted-foreground">{subtitle}</p> : null}
              </div>
            </div>
          </div>
          {actions}
        </div>
      ) : null}
      <div className={contentClassName}>{children}</div>
    </section>
  );
}

const accentClasses = {
  cyan: "from-cyan-300/24 via-cyan-300/8 to-transparent shadow-cyan",
  violet: "from-violet-300/24 via-violet-300/8 to-transparent",
  magenta: "from-pink-300/24 via-pink-300/8 to-transparent shadow-magenta",
  emerald: "from-emerald-300/24 via-emerald-300/8 to-transparent",
  amber: "from-amber-300/24 via-amber-300/8 to-transparent",
};

export function StatCard({
  label,
  value,
  numericValue,
  format,
  icon: Icon,
  hint,
  accent = "cyan",
  trend,
  className,
  hideBlur = false,
}: {
  label: string;
  value?: ReactNode;
  numericValue?: number;
  format?: (value: number) => string;
  icon?: LucideIcon;
  hint?: string;
  accent?: keyof typeof accentClasses;
  trend?: string;
  className?: string;
  hideBlur?: boolean;
}) {
  return (
    <div
      className={cn(
        "hud-panel p-5 border-white/5 border-l-2",
        !hideBlur && "hud-blur",
        accent === "cyan" && "border-l-primary hud-glow-cyan",
        accent === "magenta" && "border-l-accent hud-glow-magenta",
        className
      )}
      style={{ transform: "translateZ(0)" }}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-br opacity-90",
          accentClasses[accent]
        )}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">{label}</p>
          <p className="hud-number text-2xl font-semibold text-white sm:text-3xl">
            {numericValue !== undefined ? (
              <AnimatedCounter value={numericValue} format={format ?? formatCompactNumber} />
            ) : (
              value
            )}
          </p>
          {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
        </div>
        {Icon ? (
          <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.06] text-primary">
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
      {trend ? (
        <div className="relative mt-4 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-[0.22em] text-primary/80">
          <ChevronRight className="h-3.5 w-3.5" />
          {trend}
        </div>
      ) : null}
    </div>
  );
}

export function DataTable({
  columns,
  children,
  className,
}: {
  columns: string[];
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("table-shell", className)}>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}
