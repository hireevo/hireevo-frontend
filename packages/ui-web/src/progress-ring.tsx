import type { ReactNode } from 'react';
import { cn } from './cn.ts';

export type ProgressRingProps = {
  /** Percentage complete, 0 to 100. Values outside that range are clamped. */
  value: number;
  /** Names the ring for assistive technology, e.g. "Profile strength". */
  label: string;
  /** Spoken in place of the bare number, as with ProgressBar. */
  valueText?: string | undefined;
  /** Outer diameter in px. */
  size?: number;
  /** Stroke width in px. */
  thickness?: number;
  /** Drawn in the middle. Hidden from assistive technology — `valueText` speaks it. */
  children?: ReactNode;
  className?: string | undefined;
};

/** ProgressBar's contract drawn as a ring: same range, same clamping, same naming. */
export function ProgressRing({
  value,
  label,
  valueText,
  size = 96,
  thickness = 8,
  children,
  className,
}: ProgressRingProps) {
  const percent = Math.min(100, Math.max(0, Math.round(value)));
  const centre = size / 2;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      {...(valueText === undefined ? {} : { 'aria-valuetext': valueText })}
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg
        aria-hidden="true"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={centre}
          cy={centre}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          className="stroke-border-subtle"
        />
        {/* No arc at all at zero: a zero-length stroke with round caps still
            paints a dot, which reads as "a little done". */}
        {percent === 0 ? null : (
          <circle
            data-slot="progress"
            cx={centre}
            cy={centre}
            r={radius}
            fill="none"
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - percent / 100)}
            className="stroke-accent transition-[stroke-dashoffset] duration-slow ease-standard"
          />
        )}
      </svg>
      {children === undefined ? null : (
        <div
          aria-hidden="true"
          className="absolute inset-0 flex flex-col items-center justify-center text-center"
        >
          {children}
        </div>
      )}
    </div>
  );
}
