import { useId } from "react";
import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

type ParuvoLogoProps = {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  showWordmark?: boolean;
  compact?: boolean;
};

function ParuvoMark(props: SVGProps<SVGSVGElement>) {
  const gradientId = useId();
  const strokeId = useId();
  const glowId = useId();

  return (
    <svg viewBox="0 0 88 88" fill="none" aria-hidden="true" {...props}>
      <defs>
        {/* Main gradient - cyan to magenta */}
        <linearGradient id={gradientId} x1="24" y1="18" x2="69" y2="66" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00FFFF" stopOpacity="1" />
          <stop offset="45%" stopColor="#69F6FF" stopOpacity="0.95" />
          <stop offset="65%" stopColor="#A78CFF" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FF58D6" stopOpacity="1" />
        </linearGradient>
        
        {/* Stroke gradient */}
        <linearGradient id={strokeId} x1="49.8" y1="52.8" x2="64.2" y2="67.2" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00FFFF" />
          <stop offset="100%" stopColor="#FF4FD8" />
        </linearGradient>
        
        {/* Glow filter */}
        <filter id={glowId}>
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Glowing background with neon effect */}
      <rect
        x="4" y="4" width="80" height="80" rx="24"
        className="fill-[#0a0f1a]/90 stroke-cyan-400"
        strokeWidth="1.5"
        opacity="0.6"
      />
      
      {/* Border glow effect */}
      <rect
        x="4" y="4" width="80" height="80" rx="24"
        fill="none"
        className="stroke-cyan-300"
        strokeWidth="0.5"
        opacity="0.4"
      />

      {/* Main letterform - enhanced gradient */}
      <path
        d="M24 64V23h23.7c11.5 0 18.6 6.7 18.6 17s-7.1 17.1-18.6 17.1H35.7V64H24Z"
        fill={`url(#${gradientId})`}
        filter={`url(#${glowId})`}
      />
      
      {/* Counter hollow */}
      <path
        d="M35.7 33.4v13.8h10.8c5.9 0 9.6-2.5 9.6-7s-3.7-6.8-9.6-6.8H35.7Z"
        className="fill-[#0a0f1a]"
      />

      {/* Diagonal stroke - accent line with glow */}
      <path
        d="M49.8 52.8 64.2 67.2"
        stroke={`url(#${strokeId})`}
        strokeWidth="5.2"
        strokeLinecap="round"
        filter={`url(#${glowId})`}
        opacity="0.95"
      />

      {/* Accent outline with cyan neon */}
      <path
        d="M24 64h11.7V52.9h13.9l11.7 11.1H75L60.6 50.2c4.1-3 6.6-7.8 6.6-13.2 0-10.8-7.8-18-19.4-18H24V64Z"
        className="stroke-cyan-300/40"
        strokeWidth="0.8"
      />
    </svg>
  );
}

export function ParuvoLogo({
  className,
  markClassName,
  wordmarkClassName,
  showWordmark = true,
  compact = false,
}: ParuvoLogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-3", compact ? "gap-2.5" : "gap-3.5", className)}>
      <div
        className={cn(
          "paruvo-logo-mark relative flex shrink-0 items-center justify-center rounded-[22px] border transition-all duration-300",
          "border-cyan-400/60 bg-gradient-to-br from-cyan-500/15 to-magenta-500/10",
          "shadow-[0_0_20px_rgba(0,255,255,0.35),0_0_40px_rgba(0,255,255,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]",
          "hover:shadow-[0_0_30px_rgba(0,255,255,0.5),0_0_60px_rgba(0,255,255,0.25),inset_0_1px_0_rgba(255,255,255,0.15)]",
          "hover:border-cyan-300/80",
          compact ? "h-10 w-10 rounded-[18px] p-1.5" : "h-12 w-12 p-1.5"
        )}
      >
        <ParuvoMark className={cn("h-full w-full", markClassName)} />
      </div>
      {showWordmark ? (
        <div className={cn("leading-none", wordmarkClassName)}>
          <div className="text-[10px] font-bold uppercase tracking-[0.42em] bg-gradient-to-r from-cyan-300 via-cyan-200 to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(0,255,255,0.4)]">
            Bangladesh marketplace
          </div>
          <div className="paruvo-wordmark mt-1.5 text-[1.55rem] font-black tracking-[0.22em] bg-gradient-to-r from-cyan-100 via-white to-pink-200 bg-clip-text text-transparent" style={{
            animation: 'paruvo-glow-pulse 3.5s ease-in-out infinite',
            willChange: 'filter',
          }}>
            PARUVO
          </div>
        </div>
      ) : null}
    </div>
  );
}
