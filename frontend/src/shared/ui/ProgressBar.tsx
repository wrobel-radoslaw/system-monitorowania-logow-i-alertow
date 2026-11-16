type ProgressBarProps = {
  /** 0 to 100. The value is shown as text next to the bar, so the bar is decorative. */
  percent: number;
  className?: string;
};

export function ProgressBar({ percent, className = '' }: ProgressBarProps) {
  return (
    <div aria-hidden="true" className={`h-1.5 rounded-[3px] bg-surface2 ${className}`}>
      <div className="h-1.5 rounded-[3px] bg-accent" style={{ width: `${percent}%` }} />
    </div>
  );
}
