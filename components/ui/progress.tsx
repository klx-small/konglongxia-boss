import * as React from "react";

import { cn } from "@/lib/utils";

type ProgressProps = React.HTMLAttributes<HTMLDivElement> & {
  value: number;
  max?: number;
  label: string;
};

export function Progress({ className, value, max = 100, label, ...props }: ProgressProps) {
  const safeMax = Math.max(max, 1);
  const safeValue = Math.min(Math.max(value, 0), safeMax);
  const percentage = (safeValue / safeMax) * 100;

  return (
    <div
      aria-label={label}
      aria-valuemax={safeMax}
      aria-valuemin={0}
      aria-valuenow={safeValue}
      className={cn("h-3 w-full overflow-hidden rounded-md bg-secondary", className)}
      role="progressbar"
      {...props}
    >
      <div
        className="h-full rounded-md bg-primary transition-all"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

