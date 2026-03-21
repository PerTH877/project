import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  format?: (value: number) => string;
  className?: string;
}

export function AnimatedCounter({
  value,
  duration = 900,
  format = (next) => String(Math.round(next)),
  className,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValueRef = useRef(value);

  useEffect(() => {
    const from = previousValueRef.current;
    const delta = value - from;

    if (delta === 0) {
      setDisplayValue(value);
      return;
    }

    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(from + delta * eased);

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    previousValueRef.current = value;

    return () => cancelAnimationFrame(frame);
  }, [duration, value]);

  return <span className={className}>{format(displayValue)}</span>;
}
