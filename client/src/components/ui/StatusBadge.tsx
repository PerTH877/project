import { cn } from "@/lib/utils";

type Tone = "cyan" | "violet" | "magenta" | "emerald" | "amber" | "rose" | "slate";

const toneClasses: Record<Tone, string> = {
  cyan: "border-cyan-300/28 bg-[linear-gradient(180deg,rgba(105,246,255,0.2),rgba(105,246,255,0.06))] text-cyan-100",
  violet: "border-violet-300/28 bg-[linear-gradient(180deg,rgba(181,145,255,0.22),rgba(181,145,255,0.06))] text-violet-100",
  magenta: "border-pink-300/28 bg-[linear-gradient(180deg,rgba(255,88,214,0.22),rgba(255,88,214,0.06))] text-pink-100",
  emerald: "border-emerald-300/28 bg-[linear-gradient(180deg,rgba(61,255,180,0.2),rgba(61,255,180,0.06))] text-emerald-100",
  amber: "border-amber-300/28 bg-[linear-gradient(180deg,rgba(255,206,86,0.2),rgba(255,206,86,0.06))] text-amber-100",
  rose: "border-rose-300/28 bg-[linear-gradient(180deg,rgba(255,120,148,0.2),rgba(255,120,148,0.06))] text-rose-100",
  slate: "border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] text-slate-100",
};

const toneMatchers: Array<{ pattern: RegExp; tone: Tone }> = [
  { pattern: /(delivered|success|paid|verified|approved|active|public|ready|in stock)/i, tone: "emerald" },
  { pattern: /(processing|pending|requested|hold|review)/i, tone: "amber" },
  { pattern: /(shipped|transit|tracking|out for delivery)/i, tone: "cyan" },
  { pattern: /(wishlist|new|private|draft)/i, tone: "violet" },
  { pattern: /(returned|refunded|cancelled|rejected|failed|out of stock|low stock)/i, tone: "rose" },
  { pattern: /(featured|spotlight|live|popular)/i, tone: "magenta" },
];

export function getStatusTone(status?: string, fallback: Tone = "slate"): Tone {
  if (!status) {
    return fallback;
  }

  return toneMatchers.find((entry) => entry.pattern.test(status))?.tone ?? fallback;
}

interface StatusBadgeProps {
  label: string;
  tone?: Tone;
  className?: string;
}

export function StatusBadge({ label, tone, className }: StatusBadgeProps) {
  const resolvedTone = tone ?? getStatusTone(label);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-[14px] border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
        toneClasses[resolvedTone],
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-[3px] bg-current" />
      {label}
    </span>
  );
}
