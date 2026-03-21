import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { ParuvoLogo } from "./ParuvoLogo";

type AuthShellProps = {
  badge: string;
  title: string;
  description: string;
  asideTitle: string;
  asideDescription: string;
  asidePoints: string[];
  children: ReactNode;
  className?: string;
};

export function AuthShell({
  badge,
  title,
  description,
  asideTitle,
  asideDescription,
  asidePoints,
  children,
  className,
}: AuthShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[8%] top-[10%] h-60 w-60 rounded-full bg-cyan-400/12 blur-3xl" />
        <div className="absolute right-[6%] top-[16%] h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute bottom-[-6%] left-[22%] h-80 w-80 rounded-full bg-pink-500/8 blur-3xl" />
      </div>

      <div className="shell-width relative py-6 sm:py-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <ParuvoLogo compact />
          <Link to="/" className="action-ghost rounded-full border border-white/8 bg-white/[0.03] px-4 py-2.5">
            <ArrowLeft className="h-4 w-4" />
            Back to shop
          </Link>
        </div>

        <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr] xl:items-center">
          <section className="hud-panel overflow-hidden p-7 sm:p-9">
            <p className="hud-kicker">{badge}</p>
            <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-8 text-muted-foreground sm:text-base">
              {description}
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {asidePoints.map((point) => (
                <div
                  key={point}
                  className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-100"
                >
                  {point}
                </div>
              ))}
            </div>

            <div className="mt-10 rounded-[28px] border border-white/8 bg-[#070e1b]/85 p-6">
              <h2 className="text-xl font-semibold text-white">{asideTitle}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{asideDescription}</p>
            </div>
          </section>

          <section className={cn("hud-panel p-6 sm:p-8", className)}>{children}</section>
        </div>
      </div>
    </div>
  );
}
