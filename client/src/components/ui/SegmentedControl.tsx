import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<SegmentedOption<T>>;
  className?: string;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex flex-wrap items-center gap-2 rounded-[18px] border border-white/10 bg-white/[0.04] p-2 backdrop-blur-xl",
        className
      )}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const active = option.value === value;

        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex items-center gap-2 rounded-[14px] px-4 py-2 text-sm font-medium transition duration-300",
              active
                ? "bg-primary text-primary-foreground shadow-cyan"
                : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
            )}
          >
            {Icon ? <Icon className="h-4 w-4" /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
