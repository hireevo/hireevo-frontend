import { cn } from './cn.ts';

export type ProgressBarProps = {
  /** Percentage complete, 0 to 100. Values outside that range are clamped. */
  value: number;
  /** Names the bar for assistive technology, e.g. "Profile completion". */
  label: string;
  /**
   * Spoken in place of the raw percentage. Screen readers announce a bare
   * `aria-valuenow` as "20", which is not obviously a percentage or obviously
   * about the profile.
   */
  valueText?: string | undefined;
  className?: string | undefined;
};

export function ProgressBar({ value, label, valueText, className }: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, Math.round(value)));

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      {...(valueText === undefined ? {} : { 'aria-valuetext': valueText })}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-muted', className)}
    >
      <span
        className="block h-full rounded-full bg-accent transition-[width] duration-normal ease-standard"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
